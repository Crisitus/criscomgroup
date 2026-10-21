import { ChevronRight, CircleAlert, Inbox, RefreshCw, Search, TriangleAlert } from "lucide-react"
import {
  ABIERTAS, ESTADOS, EstChip, I, SC, SEP, money, norm, num, sgn, venceInfo,
  type Quote,
} from "./quotesShared"

export type Filter = "abiertas" | "todas" | string
export const FILTERS: [string, string][] = [["abiertas", "Abiertas"], ["todas", "Todas"], ...ESTADOS]

const inF = (q: Quote, f: Filter) => f === "todas" || (f === "abiertas" ? ABIERTAS.includes(q.estado) : q.estado === f)
const match = (q: Quote, s: string) => {
  if (!s.trim()) return true
  const t = norm(s.trim())
  return [q.numero, q.cliente_nombre, q.cliente_documento || ""].some(x => norm(x).includes(t))
}
export const countBy = (qs: Quote[], f: Filter) => qs.filter(q => inF(q, f)).length
export function visibleQuotes(qs: Quote[], f: Filter, s: string) {
  return qs.filter(q => inF(q, f) && match(q, s)).sort((a, b) => {
    const x = ABIERTAS.includes(a.estado), y = ABIERTAS.includes(b.estado)
    if (x !== y) return x ? -1 : 1
    return x ? a.vence_en.localeCompare(b.vence_en) : b.creado_en.localeCompare(a.creado_en)
  })
}

export const MargenNeg = ({ n, s = 14 }: { n: number; s?: number }) =>
  <span className="st bad">{I(TriangleAlert, s)}Margen negativo {sgn(n)}</span>

function Row({ q, on, onOpen }: { q: Quote; on: boolean; onOpen: () => void }) {
  const v = venceInfo(q), mg = num(q.margen)
  return (
    <button type="button" className="rw2" aria-current={on} onClick={onOpen}>
      <span className="rb">
        <span className="l1"><b>{q.numero}</b><b className="num">{money(q.total)}</b></span>
        <span className="l2"><span className="cl">{q.cliente_nombre}</span><span className="es">{SEP}{SC[q.escenario] || q.escenario}</span></span>
        <span className="l3">
          <span className="a"><EstChip e={q.estado} s={14} />{v && <span className={v.tone === "warn" ? "st warn" : ""}>{v.short}</span>}</span>
          <span className="m num">{mg < 0 ? <MargenNeg n={mg} /> : `Margen ${money(mg)}`}</span>
        </span>
      </span>
      {I(ChevronRight, 16, "ch")}
    </button>
  )
}

export function QuoteList({ quotes, status, filter, search, selId, onFilter, onSearch, onOpen, onRetry, onNew }: {
  quotes: Quote[]; status: "load" | "ok" | "error"; filter: Filter; search: string; selId: number | null
  onFilter: (f: Filter) => void; onSearch: (s: string) => void; onOpen: (id: number) => void; onRetry: () => void; onNew: () => void
}) {
  const rows = visibleQuotes(quotes, filter, search)
  const label = FILTERS.find(f => f[0] === filter)?.[1] || ""
  const hits = quotes.filter(q => match(q, search)).length
  let body
  if (status === "load") body = (
    <div className="list" aria-busy="true"><p className="sr" role="status">Cargando cotizaciones...</p>
      {[0, 1, 2, 3, 4, 5].map(i => <div className="skr" key={i}><span className="sk" style={{ width: "62%" }} /><span className="sk" style={{ width: "84%" }} /><span className="sk" style={{ width: "48%" }} /></div>)}
    </div>
  )
  else if (status === "error") body = (
    <div className="list"><div className="empty" role="alert">{I(CircleAlert, 28)}<h3>No se pudieron cargar las cotizaciones</h3><p>Revisa tu conexión e inténtalo de nuevo.</p>
      <button type="button" className="btn out" onClick={onRetry}>{I(RefreshCw, 16)}Reintentar</button></div></div>
  )
  else if (!quotes.length) body = (
    <div className="list"><div className="empty" role="status">{I(Inbox, 28)}<h3>Aún no hay cotizaciones</h3><p>Las cotizaciones que armes aparecerán aquí.</p>
      <button type="button" className="btn out" onClick={onNew}>Crear la primera cotización</button></div></div>
  )
  else if (!rows.length) body = (
    <div className="list"><div className="empty" role="status">{I(Inbox, 28)}
      <h3>{search.trim() ? `Sin resultados en ${label} para «${search.trim()}»` : `No hay cotizaciones en «${label}»`}</h3>
      {filter !== "todas" && hits > 0 ? <button type="button" className="lnk" onClick={() => onFilter("todas")}>Ver en Todas ({hits})</button>
        : search.trim() ? <button type="button" className="lnk" onClick={() => onSearch("")}>Limpiar búsqueda</button> : null}
    </div></div>
  )
  else body = <div className="list">{rows.map(q => <Row key={q.id_cotizacion} q={q} on={q.id_cotizacion === selId} onOpen={() => onOpen(q.id_cotizacion)} />)}</div>

  return (
    <div className="lc">
      <label className="srch"><span className="sr">Buscar cotización</span>{I(Search, 16)}
        <input className="in" type="search" placeholder="Buscar por número, cliente o documento" value={search} onChange={e => onSearch(e.target.value)} />
      </label>
      <div className="chips" role="tablist" aria-label="Filtrar por estado">
        {FILTERS.map(([k, l]) => <button type="button" key={k} className="chip" role="tab" aria-selected={filter === k} onClick={() => onFilter(k)}>{l} <b>{countBy(quotes, k)}</b></button>)}
      </div>
      {body}
    </div>
  )
}
