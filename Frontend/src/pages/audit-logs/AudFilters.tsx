import { ChevronDown, Search, X } from "lucide-react"
import type { AuditCatalogo } from "../../services/auditLogService"
import { accItems, addDias, chipsDe, hoyLima, modItems, type Filtros } from "./audCommon"
import { AudDateField } from "./AudDateField"
import { AudUserBox } from "./AudUserBox"
import { I } from "./audParts"

export type SetF = (c: Partial<Filtros>) => void

export function Select({ label, first, value, items, cls, onChange }: { label: string; first: string; value: string; items: [string, string][]; cls?: string; onChange: (v: string) => void }) {
  return (
    <label className={`sel ${cls ?? ""}`}>
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{first}</option>
        {items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {I(ChevronDown, 14)}
    </label>
  )
}

/** Atajos Hoy / 7 d / 30 d (hora de Lima). */
export function AudPresets({ f, set, largo }: { f: Filtros; set: SetF; largo?: boolean }) {
  const hoy = hoyLima()
  const P: [string, number][] = [["Hoy", 0], [largo ? "7 días" : "7 d", 6], [largo ? "30 días" : "30 d", 29]]
  return (
    <div className="pres" role="group" aria-label="Atajos de fecha">
      {P.map(([l, n]) => <button key={l} type="button" className="pre" aria-pressed={f.h === hoy && f.d === addDias(hoy, -n)} onClick={() => set({ d: addDias(hoy, -n), h: hoy })}>{l}</button>)}
    </div>
  )
}


/** Una sola linea: usuario, modulo, accion, fechas con atajos y busqueda. */
export function AudFilters({ f, qLive, cat, onQ, set }: { f: Filtros; qLive: string; cat: AuditCatalogo | null; onQ: (v: string) => void; set: SetF }) {
  return (
    <div className="fbar" role="search" aria-label="Filtros de logs">
      <AudUserBox value={f.u} usuarios={cat?.usuarios ?? []} onPick={u => set({ u })} />
      <Select label="Módulo" first="Módulo" value={f.m} items={modItems(cat)} cls="m" onChange={m => set({ m })} />
      <Select label="Acción" first="Acción" value={f.a} items={accItems(cat)} cls="a" onChange={a => set({ a })} />
      <AudDateField label="Desde" aria="Desde (dd/mm/aaaa, hora de Lima)" value={f.d} onChange={d => set({ d })} />
      <AudDateField label="Hasta" aria="Hasta (dd/mm/aaaa, incluido)" value={f.h} onChange={h => set({ h })} />
      <AudPresets f={f} set={set} />
      <label className="fld q">{I(Search, 16)}<input type="search" aria-label="Buscar" placeholder="Buscar" value={qLive} onChange={e => onQ(e.target.value)} /></label>
    </div>
  )
}

/** Chips de filtros activos + Limpiar. */
export function AudChips({ f, cat, set, onQ, onClear }: { f: Filtros; cat: AuditCatalogo | null; set: SetF; onQ: (v: string) => void; onClear: () => void }) {
  const chips = chipsDe(f, cat)
  if (!chips.length) return null
  const quitar = (c: (typeof chips)[number]) => {
    if (c.clave === "q") onQ("")
    if (c.clave === "fecha") set({ d: "", h: "" })
    else set({ [c.clave]: "" } as Partial<Filtros>)
  }
  return (
    <div className="fchips">
      {chips.map(c => (
        <button key={c.clave} type="button" className="fc" aria-label={`Quitar filtro ${c.k}: ${c.v}`} onClick={() => quitar(c)}>{c.k}: <span>{c.v}</span>{I(X, 16)}</button>
      ))}
      <button type="button" className="btn lk" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>
    </div>
  )
}
