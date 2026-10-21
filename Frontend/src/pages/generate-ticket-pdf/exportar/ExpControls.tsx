import { Check, ChevronDown, Lock, Minus } from "lucide-react"
import type { ReactNode } from "react"
import { I } from "./expCommon"

export type Estado = boolean | "mixed"

const Caja = ({ st }: { st: Estado }) => (
  <span className="bx">{st === true ? I(Check, 14) : st === "mixed" ? I(Minus, 14) : null}</span>
)

/** Casilla de fila / cabecera de tabla (44 x 44). */
export function Cb({ st, label, onToggle }: { st: Estado; label: string; onToggle: () => void }) {
  return <button type="button" className="cb" role="checkbox" aria-checked={st} aria-label={label} onClick={onToggle}><Caja st={st} /></button>
}

/** Casilla con texto del panel «Archivo». Deshabilitada = aria-disabled con su motivo. */
export function Ck({ st, label, disabled, describedBy, onToggle }: { st: boolean; label: string; disabled?: boolean; describedBy?: string; onToggle: () => void }) {
  return (
    <button type="button" className="ck" role="checkbox" aria-checked={st} aria-disabled={disabled || undefined} aria-describedby={disabled ? describedBy : undefined}
      onClick={() => { if (!disabled) onToggle() }}>
      <Caja st={st} /><span>{label}</span>{disabled && I(Lock, 14)}
    </button>
  )
}

export function Chip({ label, n, on, onToggle }: { label: string; n: number; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="chp" aria-pressed={on} onClick={onToggle}>
      {on && I(Check, 14)}<span>{label}</span><span className="n">{n}</span>
    </button>
  )
}

export function Sel({ label, value, width, opciones, onChange }: { label: string; value: string; width: number | string; opciones: Array<[string, ReactNode]>; onChange: (v: string) => void }) {
  return (
    <span className="sel" style={{ width }}>
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {I(ChevronDown, 16)}
    </span>
  )
}
