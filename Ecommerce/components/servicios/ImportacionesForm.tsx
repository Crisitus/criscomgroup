"use client"

// /importaciones: formulario de solicitud de importacion (POST /api/ecommerce/solicitudes-importacion).
// Errores por campo + resumen; 409 duplicada y 429 limite con aviso y formulario conservado.
import React, { useRef, useState } from "react"
import Link from "next/link"
import {
  Cpu, HardDrive, Laptop, Loader2, Monitor, Mouse, Package, Plus, Router, Send,
} from "lucide-react"
import { ecommerceImportService } from "@/services/ecommerceApi"
import ExitoSolicitud from "./ExitoSolicitud"
import {
  AlertaAviso, AreaField, ErrorSummary, Field, Honeypot, NotaBarra, SeccionPlegable, SegGroup,
  type Errores,
} from "./serviciosShared"
import {
  erroresDelServidor, resumenDe, tituloResumen, vEmail, vLargo, vNombre, vNumeroRango, vTelefono,
} from "./serviciosValidacion"
import "@/styles/servicios.css"

const TIPOS = [
  { value: "laptop", label: "Laptop / Notebook", icon: Laptop },
  { value: "componente", label: "Componente de PC", icon: Cpu },
  { value: "periferico", label: "Periférico", icon: Mouse },
  { value: "monitor", label: "Monitor / Pantalla", icon: Monitor },
  { value: "almacenamiento", label: "Almacenamiento", icon: HardDrive },
  { value: "red", label: "Equipos de red", icon: Router },
  { value: "otro", label: "Otro", icon: Package },
]
const URGENCIAS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
]
const ETIQUETAS: Record<string, string> = {
  nombre_producto: "Producto", cantidad: "Cantidad", tipo_producto: "Tipo de producto",
  marca: "Marca", modelo: "Modelo", pais_origen: "País de origen",
  presupuesto_min: "Presupuesto mínimo", presupuesto_max: "Presupuesto máximo",
  nivel_urgencia: "Urgencia", especificaciones: "Especificaciones", mensaje: "Mensaje",
  imagenes_urls: "Enlaces de imágenes",
  nombre_solicitante: "Nombre completo", email_solicitante: "Correo electrónico", telefono_solicitante: "Teléfono",
}

const INICIAL = {
  nombre_producto: "", cantidad: "1", tipo_producto: "", marca: "", modelo: "", pais_origen: "",
  presupuesto_min: "", presupuesto_max: "", nivel_urgencia: "media",
  especificaciones: "", mensaje: "", imagenes_urls: [] as string[],
  nombre_solicitante: "", email_solicitante: "", telefono_solicitante: "", website: "",
}
type Valores = typeof INICIAL

const validar = (v: Valores): Errores => {
  const e: Errores = {}
  vLargo(e, "nombre_producto", v.nombre_producto, 3, 200, "El producto")
  if (!v.tipo_producto) e.tipo_producto = "Elige el tipo de producto."
  const q = Number(v.cantidad)
  if (!Number.isInteger(q) || q < 1 || q > 999) e.cantidad = "La cantidad debe ser un entero entre 1 y 999."
  vNumeroRango(e, "presupuesto_min", v.presupuesto_min, 0, 99999999, "El presupuesto debe ser un número entre 0 y 99,999,999.")
  vNumeroRango(e, "presupuesto_max", v.presupuesto_max, 0, 99999999, "El presupuesto debe ser un número entre 0 y 99,999,999.")
  if (!e.presupuesto_min && !e.presupuesto_max && v.presupuesto_min.trim() && v.presupuesto_max.trim()
    && Number(v.presupuesto_min) > Number(v.presupuesto_max)) {
    e.presupuesto_max = "El mínimo no puede ser mayor que el máximo."
  }
  const urls = v.imagenes_urls.map((u) => u.trim()).filter(Boolean)
  if (urls.some((u) => !/^https?:\/\/.+/.test(u) || u.length > 500)) {
    e.imagenes_urls = "Envía hasta 5 enlaces http o https (máximo 500 caracteres cada uno)."
  }
  vNombre(e, "nombre_solicitante", v.nombre_solicitante)
  vEmail(e, "email_solicitante", v.email_solicitante, true)
  vTelefono(e, "telefono_solicitante", v.telefono_solicitante, false)
  return e
}

type Aviso = { tipo: "409" | "429" | "red"; mensaje: string } | null

const ImportacionesForm = () => {
  const [v, setV] = useState<Valores>(INICIAL)
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<Aviso>(null)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const set = (campo: keyof Valores) => (valor: string) => {
    setV((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => {
      if (!prev[campo]) return prev
      const next = { ...prev }
      delete next[campo]
      return next
    })
  }

  const enviar = async () => {
    if (enviando) return
    setAviso(null)
    const e = validar(v)
    setErrores(e)
    if (Object.keys(e).length) return
    setEnviando(true)
    try {
      const website = formRef.current ? String(new FormData(formRef.current).get("website") || "") : ""
      const r = await ecommerceImportService.crear({
        nombre_solicitante: v.nombre_solicitante.trim(),
        email_solicitante: v.email_solicitante.trim(),
        telefono_solicitante: v.telefono_solicitante.trim() || undefined,
        nombre_producto: v.nombre_producto.trim(),
        tipo_producto: v.tipo_producto as "laptop",
        marca: v.marca.trim() || undefined,
        modelo: v.modelo.trim() || undefined,
        pais_origen: v.pais_origen.trim() || undefined,
        especificaciones: v.especificaciones.trim() || undefined,
        mensaje: v.mensaje.trim() || undefined,
        cantidad: Number(v.cantidad) || 1,
        presupuesto_min: v.presupuesto_min.trim() || undefined,
        presupuesto_max: v.presupuesto_max.trim() || undefined,
        nivel_urgencia: v.nivel_urgencia as "media",
        imagenes_urls: v.imagenes_urls.map((u) => u.trim()).filter(Boolean),
        website: website || undefined,
      } as Parameters<typeof ecommerceImportService.crear>[0])
      const codigo = r.data?.codigo_seguimiento
      if (codigo) setExito(codigo)
      else setAviso({ tipo: "red", mensaje: "No pudimos registrar la solicitud. Intenta nuevamente." })
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const data = (error as { response?: { data?: unknown } })?.response?.data
      const msg = (data as { message?: string })?.message
      if (status === 400) {
        const se = erroresDelServidor(data)
        if (se.presupuesto_min?.includes("máximo")) {
          se.presupuesto_max = "El mínimo no puede ser mayor que el máximo."
          delete se.presupuesto_min
        }
        setErrores(Object.keys(se).length ? se : { nombre_producto: msg || "Revisa los campos." })
      } else if (status === 409) {
        setAviso({ tipo: "409", mensaje: msg || "Ya registraste esta misma solicitud en las últimas 24 horas." })
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
    const tipo = TIPOS.find((t) => t.value === v.tipo_producto)?.label || v.tipo_producto
    const urgencia = URGENCIAS.find((u) => u.value === v.nivel_urgencia)?.label || v.nivel_urgencia
    return (
      <ExitoSolicitud
        codigo={exito}
        titulo="Solicitud registrada"
        pasos={[
          "Revisamos tu pedido y, cuando la cotización esté lista, la verás en dólares (US$) en Seguimiento.",
          "Para consultar el avance ingresa tu código y tu correo (o los últimos 4 dígitos de tu teléfono).",
        ]}
        recap={[["Producto", v.nombre_producto.trim()], ["Tipo", tipo], ["Cantidad", v.cantidad], ["Urgencia", urgencia]]}
        accionPrimaria={{ href: "/seguimiento", texto: "Consultar estado" }}
      />
    )
  }

  const items = resumenDe(errores, ETIQUETAS)
  return (
    <>
      {items.length > 0 && <ErrorSummary titulo={tituloResumen(items.length)} items={items} />}
      {aviso?.tipo === "409" && (
        <AlertaAviso
          titulo="Solicitud duplicada"
          acts={<Link className="btn out" href="/seguimiento"><span>Consultar el código existente</span></Link>}
        >
          {aviso.mensaje} Consulta su avance con el código SOL- que recibiste.
        </AlertaAviso>
      )}
      {aviso?.tipo === "429" && (
        <AlertaAviso
          icono="timer"
          titulo="Límite de envíos alcanzado"
          acts={
            <button type="button" className="btn out" onClick={enviar}>
              <span>Reintentar</span>
            </button>
          }
        >
          {aviso.mensaje}
        </AlertaAviso>
      )}
      {aviso?.tipo === "red" && (
        <AlertaAviso
          icono="wifi"
          titulo="Sin conexión con el servidor"
          acts={
            <button type="button" className="btn out" onClick={enviar}>
              <span>Reintentar</span>
            </button>
          }
        >
          {aviso.mensaje}
        </AlertaAviso>
      )}
      <form
        ref={formRef}
        className="fm"
        noValidate
        aria-label="Solicitud de importación"
        onSubmit={(e) => { e.preventDefault(); void enviar() }}
      >
        <Honeypot />
        <section className="card">
          <h2>Qué producto buscas</h2>
          <div className="grid">
            <Field name="nombre_producto" label="Producto" span={8} value={v.nombre_producto} onChange={set("nombre_producto")} placeholder="Ej.: Monitor curvo de 32 pulgadas" maxLength={200} error={errores.nombre_producto} />
            <Field name="cantidad" label="Cantidad" span={4} type="number" inputMode="numeric" value={v.cantidad} onChange={set("cantidad")} error={errores.cantidad} />
            <SegGroup name="tipo_producto" label="Tipo de producto" options={TIPOS} value={v.tipo_producto} onChange={set("tipo_producto")} />
            {errores.tipo_producto && <p className="err s12"><span>{errores.tipo_producto}</span></p>}
            <Field name="marca" label="Marca" value={v.marca} onChange={set("marca")} placeholder="Ej.: LG" maxLength={80} optional error={errores.marca} />
            <Field name="modelo" label="Modelo" value={v.modelo} onChange={set("modelo")} placeholder="Ej.: 29WN600" maxLength={120} optional error={errores.modelo} />
            <Field name="pais_origen" label="País de origen" value={v.pais_origen} onChange={set("pais_origen")} placeholder="Ej.: Estados Unidos" maxLength={80} optional error={errores.pais_origen} />
            <Field name="presupuesto_min" label="Presupuesto mínimo" span={3} type="number" inputMode="decimal" prefix="US$" value={v.presupuesto_min} onChange={set("presupuesto_min")} placeholder="0" optional error={errores.presupuesto_min} />
            <Field name="presupuesto_max" label="Presupuesto máximo" span={3} type="number" inputMode="decimal" prefix="US$" value={v.presupuesto_max} onChange={set("presupuesto_max")} placeholder="0" optional error={errores.presupuesto_max} />
            <SegGroup name="nivel_urgencia" label="Urgencia" span={6} options={URGENCIAS} value={v.nivel_urgencia} onChange={set("nivel_urgencia")} />
            <SeccionPlegable titulo="Más detalles">
              <AreaField name="especificaciones" label="Especificaciones" span={6} value={v.especificaciones} onChange={set("especificaciones")} placeholder="Memoria, pantalla, capacidad…" maxLength={4000} optional error={errores.especificaciones} />
              <AreaField name="mensaje" label="Mensaje" span={6} value={v.mensaje} onChange={set("mensaje")} placeholder="Cualquier detalle que ayude a cotizar" maxLength={4000} optional error={errores.mensaje} />
            </SeccionPlegable>
            <SeccionPlegable titulo={<>Enlaces de imágenes <small className="mut">({v.imagenes_urls.length} de 5)</small></>}>
              {v.imagenes_urls.map((url, i) => (
                <Field
                  key={i}
                  name={i === 0 ? "imagenes_urls" : `imagenes_urls_${i}`}
                  label={i === 0 ? "Enlace de una imagen de referencia" : `Enlace ${i + 1}`}
                  span={12}
                  type="url"
                  value={url}
                  onChange={(nueva) =>
                    setV((prev) => ({ ...prev, imagenes_urls: prev.imagenes_urls.map((u, k) => (k === i ? nueva : u)) }))
                  }
                  placeholder="https://…"
                  maxLength={500}
                  optional
                  error={i === 0 ? errores.imagenes_urls : undefined}
                />
              ))}
              {v.imagenes_urls.length < 5 && (
                <div className="s12">
                  <button
                    type="button"
                    className="btn out stack"
                    onClick={() => setV((prev) => ({ ...prev, imagenes_urls: [...prev.imagenes_urls, ""] }))}
                  >
                    <Plus size={18} className="ic" aria-hidden />
                    <span>Agregar otro enlace</span>
                  </button>
                </div>
              )}
            </SeccionPlegable>
          </div>
        </section>
        <section className="card">
          <h2>Tus datos</h2>
          <div className="grid">
            <Field name="nombre_solicitante" label="Nombre completo" value={v.nombre_solicitante} onChange={set("nombre_solicitante")} placeholder="Nombre y apellido" maxLength={120} error={errores.nombre_solicitante} />
            <Field name="email_solicitante" label="Correo electrónico" type="email" value={v.email_solicitante} onChange={set("email_solicitante")} placeholder="correo@dominio.com" maxLength={160} error={errores.email_solicitante} />
            <Field name="telefono_solicitante" label="Teléfono" type="tel" inputMode="numeric" value={v.telefono_solicitante} onChange={set("telefono_solicitante")} placeholder="Solo dígitos, de 7 a 15" optional error={errores.telefono_solicitante} />
          </div>
        </section>
        <div className="bar">
          <NotaBarra>La cotización llegará en dólares (US$).</NotaBarra>
          <button type="submit" className="btn stack" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
            {enviando ? <Loader2 size={18} className="ic spin" aria-hidden /> : <Send size={18} className="ic" aria-hidden />}
            <span>{enviando ? "Enviando…" : "Enviar solicitud"}</span>
          </button>
        </div>
      </form>
    </>
  )
}

export default ImportacionesForm
