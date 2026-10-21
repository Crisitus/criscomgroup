"use client"

// Arma tu PC - paso 3 "Tus datos": contacto y envio del POST solicitudes-ensamble.
// El honeypot se lee del formulario en el submit (los bots lo rellenan).
import React, { useRef } from "react"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { Field, Honeypot, NotaBarra, type Errores } from "./serviciosShared"
import { vEmail, vLargo, vNombre, vTelefono } from "./serviciosValidacion"

export type Datos = {
  nombre_solicitante: string
  telefono_solicitante: string
  ciudad: string
  email_solicitante: string
}
export const DATOS_INICIAL: Datos = {
  nombre_solicitante: "", telefono_solicitante: "", ciudad: "", email_solicitante: "",
}

export const validarDatos = (v: Datos): Errores => {
  const e: Errores = {}
  vNombre(e, "nombre_solicitante", v.nombre_solicitante)
  vTelefono(e, "telefono_solicitante", v.telefono_solicitante, true)
  vLargo(e, "ciudad", v.ciudad, 2, 120, "La ciudad")
  vEmail(e, "email_solicitante", v.email_solicitante, false)
  return e
}

type Props = {
  valores: Datos
  errores: Errores
  enviando: boolean
  onChange: (campo: keyof Datos, valor: string) => void
  onAtras: () => void
  onEnviar: (website: string) => void
}

const ArmarPcDatos = ({ valores: v, errores, enviando, onChange, onAtras, onEnviar }: Props) => {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={formRef}
      className="fm"
      noValidate
      aria-label="Tus datos de contacto"
      onSubmit={(e) => {
        e.preventDefault()
        const website = formRef.current ? String(new FormData(formRef.current).get("website") || "") : ""
        onEnviar(website)
      }}
    >
      <Honeypot />
      <section className="card">
        <h2>Tus datos</h2>
        <div className="grid">
          <Field name="nombre_solicitante" label="Nombre completo" span={6} value={v.nombre_solicitante} onChange={(x) => onChange("nombre_solicitante", x)} placeholder="Nombre y apellido" maxLength={120} error={errores.nombre_solicitante} />
          <Field name="telefono_solicitante" label="Teléfono" span={6} type="tel" inputMode="numeric" value={v.telefono_solicitante} onChange={(x) => onChange("telefono_solicitante", x)} placeholder="Solo dígitos, de 7 a 15" maxLength={15} error={errores.telefono_solicitante} />
          <Field name="ciudad" label="Ciudad" span={6} value={v.ciudad} onChange={(x) => onChange("ciudad", x)} placeholder="Ej.: Arequipa" maxLength={120} error={errores.ciudad} />
          <Field name="email_solicitante" label="Correo electrónico" span={6} type="email" value={v.email_solicitante} onChange={(x) => onChange("email_solicitante", x)} placeholder="correo@dominio.com" maxLength={160} optional error={errores.email_solicitante} />
        </div>
      </section>
      <div className="bar">
        <NotaBarra>La cotización llegará en soles (S/), IGV incluido.</NotaBarra>
        <button type="button" className="btn out" onClick={onAtras} aria-disabled={enviando || undefined}>
          <ArrowLeft size={18} className="ic" aria-hidden />
          <span>Atrás</span>
        </button>
        <button type="submit" className="btn" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
          {enviando ? <Loader2 size={18} className="ic spin" aria-hidden /> : <Send size={18} className="ic" aria-hidden />}
          <span>{enviando ? "Enviando…" : "Enviar solicitud"}</span>
        </button>
      </div>
    </form>
  )
}

export default ArmarPcDatos
