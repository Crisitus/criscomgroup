"use client"

// Primitivas compartidas de las paginas de servicios (port criscom-ecom-servicios).
// Plano, un solo acento morado, errores por campo, estados icono + palabra.
import React from "react"
import { Check, ChevronDown, CircleAlert, Info, Timer, TriangleAlert, WifiOff } from "lucide-react"

// ---------------------------------------------------------------------------
// Formato (es-PE): moneda con miles y fechas dd/mm/aaaa, h:mm a. m.
// Las fechas del backend ya llegan en hora de Lima: se formatean por partes,
// sin conversion de zona.
// ---------------------------------------------------------------------------
export const fmtPEN = (n: number): string =>
  "S/ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtUSD = (n: number): string =>
  "US$ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
export const fmtFecha = (s?: string | null): string => {
  if (!s) return "—"
  const m = FECHA_RE.exec(String(s))
  if (!m) return String(s)
  return `${m[3]}/${m[2]}/${m[1]}`
}
export const fmtFechaHora = (s?: string | null): string => {
  if (!s) return "—"
  const m = FECHA_RE.exec(String(s))
  if (!m) return String(s)
  const base = `${m[3]}/${m[2]}/${m[1]}`
  if (!m[4]) return base
  let h = Number(m[4])
  const ap = h >= 12 ? "p. m." : "a. m."
  h = h % 12 || 12
  return `${base} ${h}:${m[5]} ${ap}`
}

// ---------------------------------------------------------------------------
// Campos de formulario
// ---------------------------------------------------------------------------
export type Errores = Record<string, string>

export const Honeypot = () => (
  <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
)

export const ErrorCampo = ({ id, texto }: { id: string; texto?: string }) =>
  texto ? (
    <p className="err" id={`${id}-e`}>
      <CircleAlert size={16} className="ic" aria-hidden />
      <span>{texto}</span>
    </p>
  ) : null

type FieldProps = {
  name: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  span?: 3 | 4 | 6 | 8 | 12
  optional?: boolean
  maxLength?: number
  placeholder?: string
  error?: string
  prefix?: string // "US$" | "S/" (texto) dentro del control
  inputMode?: "numeric" | "decimal" | "text"
}

export const Field = ({
  name, label, value, onChange, type = "text", span = 4, optional,
  maxLength, placeholder, error, prefix, inputMode,
}: FieldProps) => {
  const input = (
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-e` : undefined}
    />
  )
  return (
    <div className={`f s${span}`}>
      <label htmlFor={name}>
        {label}
        {optional ? " " : ""}
        {optional && <small>(opcional)</small>}
      </label>
      {prefix ? <div className="iw us"><span>{prefix}</span>{input}</div> : input}
      <ErrorCampo id={name} texto={error} />
    </div>
  )
}

type AreaProps = {
  name: string
  label: string
  value: string
  onChange: (v: string) => void
  span?: 6 | 8 | 12
  optional?: boolean
  rows?: number
  maxLength?: number
  minLength?: number
  placeholder?: string
  hint?: string
  error?: string
}

export const AreaField = ({
  name, label, value, onChange, span = 12, optional, rows = 3,
  maxLength, minLength, placeholder, hint, error,
}: AreaProps) => (
  <div className={`f s${span}`}>
    <label htmlFor={name}>
      {label}
      {optional ? " " : ""}
      {optional && <small>(opcional)</small>}
    </label>
    <textarea
      id={name}
      name={name}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-e` : undefined}
    />
    <div className="cnt">
      <span>{hint || ""}</span>
      <span className="num">
        {maxLength ? `${value.length} / ${maxLength}` : value.length}
      </span>
    </div>
    <ErrorCampo id={name} texto={error} />
    {minLength ? <span className="sr" data-min={minLength} /> : null}
  </div>
)

// Segmento de opciones excluyentes (radiogroup de botones con icono).
export type OpcionSeg = {
  value: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>
}

type SegProps = {
  name: string
  label: string
  options: OpcionSeg[]
  value: string
  onChange: (v: string) => void
  span?: 6 | 12
  optional?: boolean
}

export const SegGroup = ({ name, label, options, value, onChange, span = 12, optional }: SegProps) => (
  <div className={`f s${span}`}>
    <span className="lb" id={`${name}-l`}>
      {label}
      {optional ? " " : ""}
      {optional && <small>(opcional)</small>}
    </span>
    <div
      className="seg"
      role="radiogroup"
      aria-labelledby={`${name}-l`}
      style={{ ["--n" as string]: options.length }}
    >
      {options.map((op) => {
        const Icono = op.icon
        const activo = op.value === value
        return (
          <button
            key={op.value}
            type="button"
            className="opt"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(op.value)}
          >
            {Icono && <Icono size={20} className="ic" aria-hidden />}
            <span>{op.label}</span>
            <Check size={16} className="ic tk" aria-hidden />
          </button>
        )
      })}
    </div>
  </div>
)

// Resumen de errores (arriba del formulario, con anclas a los campos).
export const ErrorSummary = ({ titulo, items }: { titulo: string; items: [string, string][] }) => (
  <div className="alert" role="alert">
    <CircleAlert size={20} className="ic" aria-hidden />
    <div>
      <p className="at">{titulo}</p>
      <ul>
        {items.map(([campo, texto]) => (
          <li key={campo}>
            <a href={`#${campo}`}>{texto}</a>
          </li>
        ))}
      </ul>
    </div>
  </div>
)

// Alerta de aviso (409 duplicada, 429 limite, error de red): icono + palabra + acciones.
export const AlertaAviso = ({
  icono = "alert", titulo, children, acts,
}: {
  icono?: "alert" | "timer" | "wifi"
  titulo: string
  children: React.ReactNode
  acts?: React.ReactNode
}) => {
  const Icono = icono === "timer" ? Timer : icono === "wifi" ? WifiOff : TriangleAlert
  return (
    <div className="alert warn" role="alert">
      <Icono size={20} className="ic" aria-hidden />
      <div>
        <p className="at">{titulo}</p>
        <p>{children}</p>
        {acts && <div className="acts">{acts}</div>}
      </div>
    </div>
  )
}

// Checkbox con su texto (consentimiento de contacto).
export const CheckField = ({
  name, texto, checked, onChange, error,
}: {
  name: string
  texto: string
  checked: boolean
  onChange: (v: boolean) => void
  error?: string
}) => (
  <div className="f s12">
    <label className="chk" htmlFor={name}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-e` : undefined}
      />
      <span>{texto}</span>
    </label>
    <ErrorCampo id={name} texto={error} />
  </div>
)

// Seccion plegable (detalles opcionales).
export const SeccionPlegable = ({ titulo, children }: { titulo: React.ReactNode; children: React.ReactNode }) => (
  <details className="dt s12">
    <summary>
      <ChevronDown size={18} className="ic" aria-hidden />
      <span>{titulo}</span>
    </summary>
    <div className="grid">{children}</div>
  </details>
)

// Nota contextual de una linea junto a la barra de acciones.
export const NotaBarra = ({ children }: { children: React.ReactNode }) => (
  <p className="note" style={{ marginRight: "auto" }}>
    <Info size={16} className="ic" aria-hidden />
    <span>{children}</span>
  </p>
)
