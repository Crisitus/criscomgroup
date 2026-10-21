"use client"

// /armar-pc: asistente de 3 pasos (camino -> tu armado -> tus datos) para
// POST /api/ecommerce/solicitudes-ensamble. Errores por campo + resumen en el
// paso de datos; 409 duplicada y 429 limite conservan todo lo escrito.
import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Compass, Info, ShoppingCart, Wrench } from "lucide-react"
import {
  ecommerceEnsambleService,
  type CrearSolicitudEnsamblePayload,
  type TierPresupuesto,
} from "@/services/ecommerceApi"
import ExitoSolicitud from "./ExitoSolicitud"
import ArmarPcMarketplace, { totalReferencial, type Seleccion } from "./ArmarPcMarketplace"
import ArmarPcPresupuesto, {
  PRESUPUESTO_INICIAL, PRIORIDADES, TIERS, validarPresupuesto, type Presupuesto,
} from "./ArmarPcPresupuesto"
import ArmarPcPropio, { MIN_PIEZAS } from "./ArmarPcPropio"
import ArmarPcDatos, { DATOS_INICIAL, validarDatos, type Datos } from "./ArmarPcDatos"
import { AlertaAviso, ErrorSummary, fmtPEN, type Errores } from "./serviciosShared"
import { erroresDelServidor, resumenDe, tituloResumen } from "./serviciosValidacion"
import "@/styles/servicios.css"

type Camino = "" | "marketplace" | "presupuesto" | "ensamble_propio"

const CAMINOS = [
  { value: "marketplace" as const, titulo: "Sé lo que quiero", desc: "Elige productos del catálogo y ve el total referencial.", icon: ShoppingCart },
  { value: "presupuesto" as const, titulo: "Guíame", desc: "Dinos tu presupuesto y uso; Criscom propone la configuración.", icon: Compass },
  { value: "ensamble_propio" as const, titulo: "Traigo mis piezas", desc: "Ya tienes las piezas y solo quieres el armado.", icon: Wrench },
]
const PASOS = ["Camino", "Tu armado", "Tus datos"]
const CAMPOS_DATOS = new Set(["nombre_solicitante", "telefono_solicitante", "email_solicitante", "ciudad"])
const ETIQUETAS: Record<string, string> = {
  nombre_solicitante: "Nombre completo", telefono_solicitante: "Teléfono",
  ciudad: "Ciudad", email_solicitante: "Correo electrónico", mensaje: "Lista de piezas",
  tier_presupuesto: "Tipo de armado", presupuesto_personalizado: "Monto en soles",
  uso_descripcion: "Uso", marcas_preferencia: "Marcas", prioridades: "Prioridades",
  productos: "Productos",
}

const Steps = ({ n }: { n: 1 | 2 | 3 }) => (
  <ol className="steps" aria-label="Pasos">
    {PASOS.map((s, i) => (
      <li key={s} aria-current={i + 1 === n ? "step" : undefined} className={i + 1 < n ? "done" : undefined}>
        {i + 1 < n ? <Check size={16} className="ic" aria-hidden /> : <span className="num">{i + 1}</span>}
        <span>{s}</span>
      </li>
    ))}
    <li className="of">Paso {n} de 3</li>
  </ol>
)

type Aviso = { tipo: "409" | "429" | "red" | "armado"; mensaje: string; extra?: string[] } | null

const ArmarPcWizard = () => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [camino, setCamino] = useState<Camino>("")
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const [pres, setPres] = useState<Presupuesto>(PRESUPUESTO_INICIAL)
  const [piezas, setPiezas] = useState("")
  const [datos, setDatos] = useState<Datos>(DATOS_INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<Aviso>(null)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState<string | null>(null)

  const limpiarError = (campo: string) => setErrores((prev) => {
    if (!prev[campo]) return prev
    const next = { ...prev }
    delete next[campo]
    return next
  })
  const irA = (n: 1 | 2 | 3) => { setErrores({}); setAviso(null); setPaso(n) }

  const continuarMarketplace = () => {
    if (!Object.keys(seleccion).length) {
      setErrores({ productos: "Elige al menos un producto del catálogo." })
      return
    }
    irA(3)
  }
  const continuarPresupuesto = () => {
    const e = validarPresupuesto(pres)
    setErrores(e)
    if (!Object.keys(e).length) irA(3)
  }

  const enviar = async (website: string) => {
    if (enviando || !camino) return
    setAviso(null)
    const e = validarDatos(datos)
    setErrores(e)
    if (Object.keys(e).length) return
    const payload: CrearSolicitudEnsamblePayload = {
      nombre_solicitante: datos.nombre_solicitante.trim(),
      telefono_solicitante: datos.telefono_solicitante.trim(),
      email_solicitante: datos.email_solicitante.trim() || undefined,
      ciudad: datos.ciudad.trim(),
      modo: camino,
    }
    if (camino === "marketplace") {
      payload.productos = Object.values(seleccion).map((l) => ({
        id_producto: l.producto.id,
        nombre: l.producto.name,
        precio: l.producto.precio_de_oferta ?? l.producto.price,
        cantidad: l.cantidad,
      }))
    } else if (camino === "presupuesto") {
      payload.tier_presupuesto = pres.tier_presupuesto as TierPresupuesto
      payload.presupuesto_personalizado =
        pres.tier_presupuesto === "otro" ? Number(pres.presupuesto_personalizado) : undefined
      payload.uso_descripcion = pres.uso_descripcion.trim() || undefined
      payload.incluye_perifericos = pres.incluye_perifericos
      payload.marcas_preferencia = pres.marcas_preferencia.trim() || undefined
      payload.prioridades = pres.prioridades.length ? pres.prioridades : undefined
    } else {
      payload.mensaje = piezas.trim()
    }
    setEnviando(true)
    try {
      const body = { ...payload, website: website || undefined } as CrearSolicitudEnsamblePayload & { website?: string }
      const r = await ecommerceEnsambleService.crear(body)
      const codigo = r.data?.codigo_seguimiento
      if (codigo) setExito(codigo)
      else setAviso({ tipo: "red", mensaje: "No pudimos registrar la solicitud. Intenta nuevamente." })
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const data = (error as { response?: { data?: unknown } })?.response?.data
      const msg = (data as { message?: string })?.message
      if (status === 400) {
        const se = erroresDelServidor(data)
        const deContacto: Errores = {}
        const delArmado: string[] = []
        for (const [campo, texto] of Object.entries(se)) {
          if (CAMPOS_DATOS.has(campo)) deContacto[campo] = texto
          else delArmado.push(texto)
        }
        setErrores(Object.keys(deContacto).length ? deContacto : { nombre_solicitante: msg || "Revisa los campos." })
        if (delArmado.length) setAviso({ tipo: "armado", mensaje: msg || "Revisa los datos de tu armado.", extra: delArmado })
      } else if (status === 409) {
        setAviso({ tipo: "409", mensaje: msg || "Ya registraste una solicitud igual en las últimas 24 horas." })
      } else if (status === 429) {
        setAviso({ tipo: "429", mensaje: "Por seguridad solo aceptamos unos 8 envíos cada 15 minutos desde una misma conexión. Tus datos siguen en el formulario: espera unos minutos y reintenta." })
      } else {
        setAviso({ tipo: "red", mensaje: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo." })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    const recap: [string, string][] = []
    if (camino === "marketplace") {
      const n = Object.values(seleccion).reduce((s, l) => s + l.cantidad, 0)
      recap.push(["Camino", "Sé lo que quiero"])
      recap.push(["Productos", n === 1 ? "1 producto" : `${n} productos`])
      recap.push(["Total referencial", fmtPEN(totalReferencial(seleccion))])
    } else if (camino === "presupuesto") {
      recap.push(["Camino", "Guíame"])
      recap.push(["Tipo de armado", TIERS.find((t) => t.value === pres.tier_presupuesto)?.label || ""])
      recap.push(["Periféricos", pres.incluye_perifericos === "con_perifericos" ? "Con periféricos" : "Solo la PC"])
      if (pres.prioridades.length) {
        recap.push(["Prioridades", pres.prioridades.map((p) => PRIORIDADES.find((x) => x.value === p)?.label || p).join(", ")])
      }
    } else {
      recap.push(["Camino", "Traigo mis piezas"])
    }
    return (
      <ExitoSolicitud
        codigo={exito}
        titulo="Solicitud registrada"
        pasos={[
          "Revisamos tu pedido y te contactamos al teléfono que dejaste.",
          "Cuando la cotización esté lista, la verás en soles (S/, IGV incluido) en Seguimiento con tu código y tu teléfono.",
        ]}
        recap={recap}
        accionPrimaria={{ href: "/seguimiento", texto: "Consultar estado" }}
      />
    )
  }

  const items = resumenDe(errores, ETIQUETAS)
  return (
    <>
      <Steps n={paso} />
      {paso === 1 && (
        <>
          <section className="card">
            <h2 id="camino-l">¿Cómo quieres armar tu PC?</h2>
            <div className="paths" role="radiogroup" aria-labelledby="camino-l">
              {CAMINOS.map((c) => {
                const Icono = c.icon
                return (
                  <button
                    key={c.value}
                    type="button"
                    className="pc"
                    role="radio"
                    aria-checked={camino === c.value}
                    onClick={() => setCamino(c.value)}
                  >
                    <span className="top">
                      <span className="pi"><Icono size={24} className="ic" aria-hidden /></span>
                      <Check size={20} className="ic tk" aria-hidden />
                    </span>
                    <b>{c.titulo}</b>
                    <span className="d">{c.desc}</span>
                  </button>
                )
              })}
            </div>
          </section>
          <div className={camino ? "bar" : "bar has-why"}>
            <p className="why note">
              <Info size={16} className="ic" aria-hidden />
              <span>Elige un camino para continuar.</span>
            </p>
            <button
              type="button"
              className="btn"
              aria-disabled={!camino || undefined}
              onClick={() => { if (camino) irA(2) }}
            >
              <span>Continuar</span>
              <ArrowRight size={18} className="ic" aria-hidden />
            </button>
          </div>
        </>
      )}
      {paso === 2 && camino === "marketplace" && (
        <ArmarPcMarketplace
          seleccion={seleccion}
          onChange={(sel) => { setSeleccion(sel); limpiarError("productos") }}
          onAtras={() => irA(1)}
          onContinuar={continuarMarketplace}
          error={errores.productos}
        />
      )}
      {paso === 2 && camino === "presupuesto" && (
        <ArmarPcPresupuesto
          valores={pres}
          errores={errores}
          onChange={(campo, valor) => { setPres((prev) => ({ ...prev, [campo]: valor })); limpiarError(campo) }}
          onAtras={() => irA(1)}
          onContinuar={continuarPresupuesto}
        />
      )}
      {paso === 2 && camino === "ensamble_propio" && (
        <ArmarPcPropio
          mensaje={piezas}
          onChange={setPiezas}
          onAtras={() => irA(1)}
          onContinuar={() => { if (piezas.trim().length >= MIN_PIEZAS) irA(3) }}
        />
      )}
      {paso === 3 && (
        <>
          {items.length > 0 && <ErrorSummary titulo={tituloResumen(items.length)} items={items} />}
          {aviso?.tipo === "409" && (
            <AlertaAviso
              titulo="Solicitud duplicada"
              acts={<Link className="btn out" href="/seguimiento"><span>Consultar el código existente</span></Link>}
            >
              {aviso.mensaje} Consulta su avance con el código ARM- que recibiste.
            </AlertaAviso>
          )}
          {aviso?.tipo === "429" && (
            <AlertaAviso icono="timer" titulo="Límite de envíos alcanzado">
              {aviso.mensaje}
            </AlertaAviso>
          )}
          {aviso?.tipo === "red" && (
            <AlertaAviso icono="wifi" titulo="Sin conexión con el servidor">
              {aviso.mensaje}
            </AlertaAviso>
          )}
          {aviso?.tipo === "armado" && (
            <AlertaAviso
              titulo="Revisa tu armado"
              acts={<button type="button" className="btn out" onClick={() => irA(2)}><span>Volver al paso anterior</span></button>}
            >
              {aviso.mensaje}{aviso.extra?.length ? ` ${aviso.extra.join(" ")}` : ""}
            </AlertaAviso>
          )}
          <ArmarPcDatos
            valores={datos}
            errores={errores}
            enviando={enviando}
            onChange={(campo, valor) => { setDatos((prev) => ({ ...prev, [campo]: valor })); limpiarError(campo) }}
            onAtras={() => irA(2)}
            onEnviar={enviar}
          />
        </>
      )}
    </>
  )
}

export default ArmarPcWizard
