import { CalendarDays, ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import { EN, I, type Supplier } from "./purchasesShared"

export type EstF = "todas" | "recibida" | "anulada"
export interface Filters { q: string; prov: string; est: EstF; from: string; to: string }
export const EMPTY_F: Filters = { q: "", prov: "", est: "todas", from: "", to: "" }

export function PurchaseFilters({ f, set, suppliers, counts, mob, open, onToggle, off }: {
  f: Filters; set: (p: Partial<Filters>) => void; suppliers: Supplier[]; counts: Record<EstF, number>
  mob: boolean; open: boolean; onToggle: () => void; off: boolean
}) {
  const search = (
    <label className="fld q">{I(Search, 18)}
      <input value={f.q} onChange={e => set({ q: e.target.value })} placeholder={mob ? "Número, documento o proveedor" : "Buscar por número, documento o proveedor"} aria-label="Buscar compras" disabled={off} />
    </label>
  )
  const prov = (
    <span className="sel" style={mob ? undefined : { width: 200 }}>
      <select value={f.prov} onChange={e => set({ prov: e.target.value })} aria-label="Proveedor" disabled={off}>
        <option value="">Todos los proveedores</option>
        {suppliers.map(s => <option key={s.id_proveedor} value={s.id_proveedor}>{s.razon_social}</option>)}
      </select>{I(ChevronDown)}
    </span>
  )
  const range = (
    <div className="fld rng" role="group" aria-label="Rango de fechas">{I(CalendarDays, 18)}
      <input type="date" value={f.from} max={f.to || undefined} onChange={e => set({ from: e.target.value })} aria-label="Desde" disabled={off} />
      <span className="mut">{EN}</span>
      <input type="date" value={f.to} min={f.from || undefined} onChange={e => set({ to: e.target.value })} aria-label="Hasta" disabled={off} />
    </div>
  )
  const chip = (k: EstF, l: string) => (
    <button type="button" key={k} className="chp" aria-pressed={f.est === k} aria-label={`${l} (${off ? "cargando" : counts[k]})`} onClick={() => !off && set({ est: k })}>
      {l}<span className="n">{off ? "-" : counts[k]}</span>
    </button>
  )
  const chips = <div className="chips" role="group" aria-label="Estado">{chip("todas", "Todas")}{chip("recibida", "Recibidas")}{chip("anulada", "Anuladas")}</div>
  if (mob) return (
    <>
      <div className="fbar">{search}
        <button type="button" className="ib bd" aria-label="Filtros: proveedor y fechas" aria-expanded={open} onClick={onToggle}>{I(SlidersHorizontal, 20)}</button>
      </div>
      {open && <div className="fil">{prov}{range}</div>}
      {chips}
    </>
  )
  return <div className="fbar">{search}{prov}{chips}{range}</div>
}
