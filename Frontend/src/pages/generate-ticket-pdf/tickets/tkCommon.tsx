import { ChevronDown, Minus as Menos, Plus } from "lucide-react"
import { Check, Minus } from "lucide-react"
import type { ReactNode } from "react"
import { I } from "./tkIcon"

/** Casilla de fila / cabecera de tabla: boton role=checkbox, objetivo real de 44 x 48. */
export function Cb({ checked, indeterminate, label, onToggle }: {
  checked: boolean; indeterminate?: boolean; label: string; onToggle: () => void
}) {
  const st = indeterminate ? "mixed" as const : checked
  return (
    <button type="button" className="cb" role="checkbox" aria-checked={st} aria-label={label} onClick={onToggle}>
      <span className="bx">{st === true ? I(Check, 14) : st === "mixed" ? I(Minus, 14) : null}</span>
    </button>
  )
}

export function Sel({ label, value, width, opciones, onChange }: {
  label: string; value: string; width: number | string; opciones: Array<[string, ReactNode]>; onChange: (v: string) => void
}) {
  return (
    <span className="sel" style={{ width }}>
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {I(ChevronDown, 16)}
    </span>
  )
}

/** Chip de filtro con icono + palabra + contador (44 px). */
export function Chip({ label, n, on, icono, onToggle }: {
  label: string; n: number; on: boolean; icono: ReactNode; onToggle: () => void
}) {
  return (
    <button type="button" className="chp" aria-pressed={on} onClick={onToggle}>
      {icono}<span>{label}</span><span className="n">{n}</span>
    </button>
  )
}

/** Interruptor de opcion del PDF (fila de 44 px con Sí/No escrito). */
export function Swr({ on, label, onToggle }: { on: boolean; label: ReactNode; onToggle: () => void }) {
  return (
    <button type="button" className="swr" role="switch" aria-checked={on} onClick={onToggle}>
      <span>{label}</span><span className="sw-s">{on ? "Sí" : "No"}</span><span className="trk" />
    </button>
  )
}

/** Contador con pasos (menos / valor / mas), objetivos de 44 px. */
export function Stp({ id, label, valor, min, max, onCambio }: {
  id: string; label: string; valor: number; min: number; max: number; onCambio: (v: number) => void
}) {
  return (
    <div>
      <span className="lb" id={id}>{label}</span>
      <div className="stp" role="group" aria-labelledby={id}>
        <button type="button" aria-label="Menos" aria-disabled={valor <= min || undefined}
          onClick={() => { if (valor > min) onCambio(valor - 1) }}>{I(Menos, 16)}</button>
        <output className="num">{valor}</output>
        <button type="button" aria-label="Más" aria-disabled={valor >= max || undefined}
          onClick={() => { if (valor < max) onCambio(valor + 1) }}>{I(Plus, 16)}</button>
      </div>
    </div>
  )
}
