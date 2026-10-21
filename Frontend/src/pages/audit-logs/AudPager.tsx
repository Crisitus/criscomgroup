import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { LIMITES } from "./audCommon"
import { I } from "./audParts"

/** Paginacion en servidor: "Mostrando 1-25 de 185", selector 25/50/100 y Anterior/Siguiente. */
export function AudPager({ page, limit, total, shown, filtrado, mob, onPage, onLimit }: {
  page: number; limit: number; total: number; shown: number; filtrado: boolean; mob?: boolean; onPage: (p: number) => void; onLimit: (n: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = shown ? (page - 1) * limit + 1 : 0
  const to = shown ? from + shown - 1 : 0
  const prev = page <= 1, next = page >= pages
  const rt = (
    <div className="rt">
      <label className="sel">
        <span className="sr">Logs por página</span>
        <select aria-label="Logs por página" value={limit} onChange={e => onLimit(Number(e.target.value))}>{LIMITES.map(n => <option key={n} value={n}>{n}</option>)}</select>
        {I(ChevronDown, 14)}
      </label>
      <button type="button" className="btn out sm" aria-disabled={prev} onClick={() => { if (!prev) onPage(page - 1) }}>{I(ChevronLeft, 16)}Anterior</button>
      {!mob && <span className="num">Página {page} de {pages}</span>}
      <button type="button" className="btn out sm" aria-disabled={next} onClick={() => { if (!next) onPage(page + 1) }}>Siguiente{I(ChevronRight, 16)}</button>
    </div>
  )
  const txt = <span>Mostrando <b>{shown ? `${from}–${to}` : "0"}</b> de <b>{total}</b>{filtrado ? " (filtrado)" : ""}{mob ? <> · Página {page} de {pages}</> : null}</span>
  return mob ? <div className="mpg">{txt}{rt}</div> : <div className="pgf">{txt}{rt}</div>
}
