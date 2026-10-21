"use client"

// /servicio-tecnico: solicitud web (POST /api/ecommerce/solicitudes-servicio).
// Consentimiento de contacto obligatorio; exito con codigo WEB- y nota del
// token privado (distinto del codigo) para el seguimiento con evidencias.
import React, { useRef, useState } from "react"
import {
  Gamepad2, Laptop, Loader2, Monitor, Package, Printer, Send, Smartphone,
} from "lucide-react"
import { ecommerceServiceRequestService } from "@/services/ecommerceApi"
import ExitoSolicitud from "./ExitoSolicitud"
import {
  AlertaAviso, AreaField, CheckField, ErrorSummary, Field, Honeypot, SegGroup, type Errores,
} from "./serviciosShared"
import { resumenDe, tituloResumen, vEmail, vNombre, vTelefono } from "./serviciosValidacion"
import "@/styles/servicios.css"

const EQUIPOS = [
  { value: "PC / laptop", label: "PC / laptop", icon: Laptop },
  { value: "Celular / tablet", label: "Celular / tablet", icon: Smartphone },
  { value: "Monitor", label: "Monitor", icon: Monitor },
  { value: "Impresora", label: "Impresora", icon: Printer },
  { value: "Consola", label: "Consola", icon: Gamepad2 },
  { value: "Otro equipo", label: "Otro equipo", icon: Package },
]
const ETIQUETAS: Record<string, string> = {
  tipo_equipo: "Tipo de equipo", marca_modelo: "Marca y modelo", falla: "Falla",
  disponibilidad: "Disponibilidad", cliente: "Nombre completo",
  telefono: "Teléfono", email: "Correo electrónico", consentimiento: "Autorización de contacto",
}

const INICIAL = {
  tipo_equipo: "PC / laptop", marca_modelo: "", falla: "", disponibilidad: "",
  cliente: "", telefono: "", email: "", consentimiento: false,
}
type Valores = typeof INICIAL

const validar = (v: Valores): Errores => {
  const e: Errores = {}
  if (!v.tipo_equipo) e.tipo_equipo = "Elige el tipo de equipo."
  if (!v.falla.trim()) e.falla = "Cuéntanos qué falla tiene el equipo."
  vNombre(e, "cliente", v.cliente)
  vTelefono(e, "telefono", v.telefono, true)
  vEmail(e, "email", v.email, false)
  if (!v.consentimiento) e.consentimiento = "Debes autorizar el contacto para enviar la solicitud."
  return e
}

type Aviso = { tipo: "400" | "429" | "red"; mensaje: string } | null

const ServicioTecnicoForm = () => {
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
      const r = await ecommerceServiceRequestService.crear({
        cliente: v.cliente.trim(),
        telefono: v.telefono.trim(),
        email: v.email.trim() || undefined,
        tipo_equipo: v.tipo_equipo,
        marca_modelo: v.marca_modelo.trim() || undefined,
        falla: v.falla.trim(),
        disponibilidad: v.disponibilidad.trim() || undefined,
        consentimiento_contacto: true,
      })
      if (r.codigo) setExito(r.codigo)
      else setAviso({ tipo: "red", mensaje: "No pudimos registrar la solicitud. Intenta nuevamente." })
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const data = (error as { response?: { data?: unknown } })?.response?.data
      const msg = (data as { message?: string })?.message
      if (status === 400 && msg && /autoriza|contacto/i.test(msg)) {
        setErrores({ consentimiento: "Debes autorizar el contacto para enviar la solicitud." })
      } else if (status === 400) {
        setAviso({ tipo: "400", mensaje: msg || "Revisa los datos enviados." })
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
    const equipo = EQUIPOS.find((t) => t.value === v.tipo_equipo)?.label || v.tipo_equipo
    const recap: [string, string][] = [["Equipo", equipo]]
    if (v.marca_modelo.trim()) recap.push(["Marca y modelo", v.marca_modelo.trim()])
    recap.push(["Estado", "Pendiente"])
    return (
      <ExitoSolicitud
        codigo={exito}
        titulo="Solicitud recibida"
        pasos={[
          "Te contactaremos para coordinar el ingreso del equipo.",
          "Cuando ingrese tu equipo recibirás el enlace de seguimiento con fotos. Ese enlace lleva un token privado distinto de este código.",
        ]}
        recap={recap}
        accionPrimaria={{ href: "/servicio-tecnico/seguimiento", texto: "Consultar con mi token", variante: "out" }}
      />
    )
  }

  const items = resumenDe(errores, ETIQUETAS)
  return (
    <>
      {items.length > 0 && <ErrorSummary titulo={tituloResumen(items.length)} items={items} />}
      {aviso && (
        <AlertaAviso
          icono={aviso.tipo === "429" ? "timer" : aviso.tipo === "red" ? "wifi" : "alert"}
          titulo={aviso.tipo === "429" ? "Límite de envíos alcanzado" : aviso.tipo === "red" ? "Sin conexión con el servidor" : "Revisa los datos enviados"}
        >
          {aviso.mensaje}
        </AlertaAviso>
      )}
      <form
        ref={formRef}
        className="fm"
        noValidate
        aria-label="Solicitud de servicio técnico"
        onSubmit={(e) => { e.preventDefault(); void enviar() }}
      >
        <Honeypot />
        <section className="card">
          <h2>Qué equipo dejas</h2>
          <div className="grid">
            <SegGroup name="tipo_equipo" label="Tipo de equipo" options={EQUIPOS} value={v.tipo_equipo} onChange={set("tipo_equipo")} />
            {errores.tipo_equipo && <p className="err s12"><span>{errores.tipo_equipo}</span></p>}
            <Field name="marca_modelo" label="Marca y modelo" span={4} value={v.marca_modelo} onChange={set("marca_modelo")} placeholder="Ej.: Lenovo IdeaPad 3" maxLength={160} optional error={errores.marca_modelo} />
            <AreaField name="falla" label="Qué falla tiene" span={8} rows={3} value={v.falla} onChange={set("falla")} placeholder="Cuéntanos qué pasa, desde cuándo y qué probaste" maxLength={4000} error={errores.falla} />
            <Field name="disponibilidad" label="Disponibilidad" span={12} value={v.disponibilidad} onChange={set("disponibilidad")} placeholder="Ej.: lunes a viernes por la tarde" maxLength={200} optional error={errores.disponibilidad} />
          </div>
        </section>
        <section className="card">
          <h2>Tus datos</h2>
          <div className="grid">
            <Field name="cliente" label="Nombre completo" value={v.cliente} onChange={set("cliente")} placeholder="Nombre y apellido" maxLength={120} error={errores.cliente} />
            <Field name="telefono" label="Teléfono" type="tel" inputMode="numeric" value={v.telefono} onChange={set("telefono")} placeholder="Solo dígitos, de 7 a 15" maxLength={15} error={errores.telefono} />
            <Field name="email" label="Correo electrónico" type="email" value={v.email} onChange={set("email")} placeholder="correo@dominio.com" maxLength={160} optional error={errores.email} />
            <CheckField
              name="consentimiento"
              texto="Autorizo que Criscom me contacte para coordinar la revisión de mi equipo."
              checked={v.consentimiento}
              onChange={(val) => {
                setV((prev) => ({ ...prev, consentimiento: val }))
                setErrores((prev) => {
                  if (!prev.consentimiento) return prev
                  const next = { ...prev }
                  delete next.consentimiento
                  return next
                })
              }}
              error={errores.consentimiento}
            />
          </div>
        </section>
        <div className="bar">
          <button type="submit" className="btn stack" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
            {enviando ? <Loader2 size={18} className="ic spin" aria-hidden /> : <Send size={18} className="ic" aria-hidden />}
            <span>{enviando ? "Enviando…" : "Enviar solicitud"}</span>
          </button>
        </div>
      </form>
    </>
  )
}

export default ServicioTecnicoForm
