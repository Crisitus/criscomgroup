// Piezas presentacionales de cuenta: chips, avisos, campos, estados de carga.
import type { ReactNode } from "react"
import { CircleAlert, TriangleAlert, LoaderCircle, RefreshCw, type LucideIcon } from "lucide-react"
import { estadoVisual, estadoLabel, TIPO_SOLICITUD, type Tono } from "./cuentaShared"

export const Chip = ({ estado, texto }: { estado: string; texto?: string }) => {
  const [Icon, tono] = estadoVisual(estado)
  return (
    <span className={`chip t-${tono}`}>
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      {texto ?? estadoLabel(estado)}
    </span>
  )
}

export const TipoChip = ({ tipo }: { tipo: string }) => {
  const [Icon, label] = TIPO_SOLICITUD[tipo] ?? [CircleAlert, tipo]
  return (
    <span className="chip t-l">
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      {label}
    </span>
  )
}

export const Al = ({
  tono, icon: Icon, role = "alert", children,
}: { tono: Tono; icon: LucideIcon; role?: "alert" | "status"; children: ReactNode }) => (
  <div className={`al t-${tono}`} role={role}>
    <Icon size={18} strokeWidth={1.75} aria-hidden />
    <div>{children}</div>
  </div>
)

export const Field = ({
  id, label, type = "text", value, onChange, placeholder, autoComplete = "off",
  error, hint,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  error?: string
  hint?: string
}) => (
  <div className="fld">
    <label htmlFor={id}>{label}</label>
    <input
      className={`inp${error ? " bad" : ""}`}
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={error ? true : undefined}
      aria-describedby={error || hint ? `${id}-m` : undefined}
    />
    {error ? (
      <p className="err" id={`${id}-m`}>
        <CircleAlert size={14} strokeWidth={1.75} aria-hidden />
        {error}
      </p>
    ) : hint ? (
      <p className="hint" id={`${id}-m`}>
        {hint}
      </p>
    ) : null}
  </div>
)

// Estados de lista: cargando (skeleton), error con Reintentar, vacío.
export const Cargando = ({ texto, filas = 3 }: { texto: string; filas?: number }) => (
  <div className="card tb" role="status" aria-live="polite" aria-busy="true">
    <div className="ch">
      <LoaderCircle size={18} strokeWidth={1.75} aria-hidden />
      {texto}
    </div>
    {Array.from({ length: filas }).map((_, i) => (
      <div className="skr" key={i}>
        <div className="sk" style={{ width: 90, height: 28, borderRadius: 14 }} />
        <div className="sk" style={{ width: "70%" }} />
        <div className="sk" style={{ width: "60%" }} />
        <div className="sk" style={{ width: 80 }} />
        <div className="sk" style={{ width: 150, height: 44, borderRadius: 8, justifySelf: "end" }} />
      </div>
    ))}
  </div>
)

export const ErrorCarga = ({
  titulo, detalle, onRetry,
}: { titulo: string; detalle: string; onRetry: () => void }) => (
  <div className="card empty" role="alert">
    <TriangleAlert size={28} strokeWidth={1.75} aria-hidden />
    <h2>{titulo}</h2>
    <p className="mut">{detalle}</p>
    <button className="btn p" type="button" onClick={onRetry}>
      <RefreshCw size={16} strokeWidth={1.75} aria-hidden />
      Reintentar
    </button>
  </div>
)
