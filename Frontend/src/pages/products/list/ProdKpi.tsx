import { ChevronDown, ChevronRight } from "lucide-react"
import { I, money, type Cat, type Row, type Summary } from "./prodShared"

export type Filt = "todos" | "bajo" | "sin" | "ajuste" | "costo"
export const FIL: Record<Filt, (r: Row) => boolean> = {
  todos: () => true, bajo: r => r.bajo, sin: r => r.sin, ajuste: r => r.inc, costo: r => !r.ck && r.p.stock > 0,
}
export type Sort = "name_asc" | "name_desc" | "id_desc" | "id_asc" | "stock_asc" | "stock_desc" | "margen" | "precio"
const SORTS: [Sort, string][] = [
  ["name_asc", "Nombre (A–Z)"], ["name_desc", "Nombre (Z–A)"], ["id_desc", "Más recientes"], ["id_asc", "Más antiguos"],
  ["stock_asc", "Stock (menor a mayor)"], ["stock_desc", "Stock (mayor a menor)"], ["margen", "Margen (mayor a menor)"], ["precio", "Precio con IGV (menor a mayor)"],
]

export function ProdKpi({ s, loading, err, onFilter }: { s: Summary; loading: boolean; err: boolean; onFilter: (f: Filt) => void }) {
  const v = (x: string | number) => (loading ? <span className="skb" style={{ width: 64, height: 22 }} /> : err ? "—" : x)
  const cell = (label: string, val: string | number, go?: () => void) => {
    const inner = (
      <>
        <span className="r1">{label}{go && !loading && !err && <span className="go">Ver {I(ChevronRight, 14)}</span>}</span>
        <span className="v num">{v(val)}</span>
      </>
    )
    return go && !loading && !err
      ? <button type="button" className="cell" onClick={go}>{inner}</button>
      : <div className="cell">{inner}</div>
  }
  return (
    <div className={`strip${loading ? " sk" : ""}`} role="group" aria-label="Resumen del inventario">
      {cell("Productos", s.productos, () => onFilter("todos"))}
      {cell("Unidades", s.unidades)}
      {cell("Valor del stock", money(s.valor_stock))}
      {cell("Bajo mínimo", s.bajo_minimo, () => onFilter("bajo"))}
      {cell("Sin costo", s.sin_costo, () => onFilter("costo"))}
    </div>
  )
}

export function ProdFilters({ rows, f, onFilter, cats, cat, onCat, sort, onSort, busy, q }: {
  rows: Row[]; f: Filt; onFilter: (f: Filt) => void; cats: Cat[]; cat: string; onCat: (c: string) => void
  sort: Sort; onSort: (s: Sort) => void; busy: boolean; q: string
}) {
  const chip = (k: Filt, label: string) => (
    <button type="button" key={k} className="chp" aria-pressed={f === k && !q} aria-disabled={busy} onClick={() => { if (!busy) onFilter(k) }}>
      {label}<span className="n">{busy ? "—" : rows.filter(FIL[k]).length}</span>
    </button>
  )
  const counts = new Map<number, number>()
  rows.forEach(r => counts.set(r.p.id_categoria, (counts.get(r.p.id_categoria) || 0) + 1))
  return (
    <div className="fbar" role="group" aria-label="Filtros">
      {chip("todos", "Todos")}{chip("bajo", "Bajo mínimo")}{chip("sin", "Sin stock")}{chip("ajuste", "Requieren ajuste")}{chip("costo", "Sin costo")}
      <span className="gap" />
      <label className="sel w1">
        <span className="sr">Categoría</span>
        <select aria-label="Categoría" value={cat} onChange={e => onCat(e.target.value)} disabled={busy}>
          <option value="all">Todas las categorías</option>
          {cats.map(c => <option key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre} ({counts.get(c.id_categoria) || 0})</option>)}
        </select>{I(ChevronDown)}
      </label>
      <label className="sel w2">
        <span className="sr">Ordenar por</span>
        <select aria-label="Ordenar por" value={sort} onChange={e => onSort(e.target.value as Sort)} disabled={busy}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>{I(ChevronDown)}
      </label>
    </div>
  )
}
