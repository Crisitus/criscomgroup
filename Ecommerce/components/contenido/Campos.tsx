// Campos de formulario del port de contenido: etiqueta arriba, pista y error por campo.
import type { ReactNode } from "react"
import { Check, CircleAlert } from "lucide-react"

export function Campo({ id, label, opcional, hint, error, children }: {
  id: string
  label: string
  opcional?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode // el input/textarea controlado
}) {
  return (
    <div className="fld">
      <label htmlFor={id}>
        {label}
        {opcional ? <> <i className="opt" style={{ fontStyle: "normal" }}>(opcional)</i></> : null}
      </label>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
      {error ? (
        <i className="err" id={`${id}-m`} style={{ fontStyle: "normal" }}>
          <CircleAlert size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
          {error}
        </i>
      ) : null}
    </div>
  )
}

// Casilla / radio de 44px con la caja completa clicable (input sobre toda el área).
export function Opcion({ tipo, nombre, valor, marcado, onCambio, titulo, detalle, invalida }: {
  tipo: "checkbox" | "radio"
  nombre: string
  valor?: string
  marcado: boolean
  onCambio: (v: boolean) => void
  titulo: ReactNode
  detalle?: ReactNode
  invalida?: boolean
}) {
  return (
    <label className={`chk${invalida ? " bad" : ""}`}>
      <input
        type={tipo}
        name={nombre}
        value={valor}
        checked={marcado}
        onChange={(e) => onCambio(tipo === "checkbox" ? e.target.checked : true)}
        aria-invalid={invalida || undefined}
      />
      <i className={`box${tipo === "radio" ? " r" : ""}`} style={{ fontStyle: "normal" }} aria-hidden>
        {tipo === "radio" ? (
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="currentColor" stroke="none" /></svg>
        ) : (
          <Check size={14} strokeWidth={2.5} className="pg-ic" />
        )}
      </i>
      <i className="tx" style={{ fontStyle: "normal" }}>
        <b>{titulo}</b>
        {detalle ? <small>{detalle}</small> : null}
      </i>
    </label>
  )
}

// Señuelo anti-bots: fuera del flujo visual y del teclado (contrato honeypot "website").
export function Honeypot({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  return (
    <div hidden aria-hidden="true">
      <input name="website" tabIndex={-1} autoComplete="off" value={valor} onChange={(e) => onCambio(e.target.value)} />
    </div>
  )
}
