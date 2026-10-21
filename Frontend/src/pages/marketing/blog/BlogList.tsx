import { BookOpen, ChevronDown, CircleAlert, Plus, RefreshCw, Search, X } from "lucide-react"
import type { BlogPost } from "../../../services/blogService"
import { Chip, I } from "./blogParts"
import { CHIPS, dtF, estadoDe, ELL, Q, type EstadoFiltro } from "./blogCommon"


type Props = {
  mode: "rows" | "loading" | "error"
  rows: BlogPost[]
  shown: number
  total: number
  counts: Record<EstadoFiltro, number>
  cats: string[]
  q: string
  est: EstadoFiltro
  cat: string
  selId: number | null
  hasAny: boolean
  mob: boolean
  onQ: (v: string) => void
  onEst: (v: EstadoFiltro) => void
  onCat: (v: string) => void
  onPick: (p: BlogPost) => void
  onMore: () => void
  onRetry: () => void
  onClear: () => void
  onNew: () => void
}

export function BlogList(p: Props) {
  const dis = p.mode !== "rows"
  const filtered = p.q || p.cat || p.est !== "todos"
  return (
    <section className="card lc" aria-label="Publicaciones">
      <div className="lh">
        <div className="r1" style={p.mob ? { flexDirection: "column" } : undefined}>
          <label className="fld q">{I(Search, 16)}<input placeholder="Buscar publicación" value={p.q} onChange={e => p.onQ(e.target.value)} aria-label="Buscar publicación" /></label>
          <span className="sel" style={{ width: p.mob ? "100%" : 168 }}>
            <select aria-label="Categoría" value={p.cat} onChange={e => p.onCat(e.target.value)}>
              <option value="">Categoría: todas</option>
              {p.cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>{I(ChevronDown, 16)}
          </span>
        </div>
        <div className="chips" role="group" aria-label="Estado">
          {CHIPS.map(([k, l]) => (
            <button key={k} type="button" className="chp" aria-pressed={p.est === k} aria-disabled={dis || undefined} onClick={() => !dis && p.onEst(k)}>
              {l} <span className="n">{p.mode === "loading" ? ELL : p.mode === "error" ? "–" : p.counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      {p.mode === "loading" && (
        <>
          <p className="ctx" role="status" style={{ padding: "10px 12px 0" }}>{I(RefreshCw, 16, "spin")}Cargando publicaciones{ELL}</p>
          <ul className="lrows" aria-hidden="true">{[88, 72, 94, 66, 81, 90].map((w, i) => <li key={i}><div className="rw" style={{ cursor: "default" }}><span className="sk" style={{ height: 14, width: `${w}%` }} /><span className="sk" style={{ height: 22, width: "42%" }} /></div></li>)}</ul>
        </>
      )}
      {p.mode === "error" && (
        <div className="empty bad" role="alert"><span className="ei">{I(CircleAlert, 22)}</span><h2>No se pudo cargar la lista</h2><p>No hubo respuesta del servidor. Tus publicaciones no se han modificado.</p><button type="button" className="btn" onClick={p.onRetry}>{I(RefreshCw, 16)}Reintentar</button></div>
      )}
      {p.mode === "rows" && !p.hasAny && (
        <div className="empty"><span className="ei">{I(BookOpen, 22)}</span><h2>Aún no hay publicaciones</h2><p>La primera que crees aparecerá aquí con su estado y su fecha de salida.</p><button type="button" className="btn out" onClick={p.onNew}>{I(Plus, 16)}Nueva publicación</button></div>
      )}
      {p.mode === "rows" && p.hasAny && !p.rows.length && (
        <div className="empty"><span className="ei">{I(Search, 22)}</span><h2>Sin resultados con estos filtros</h2><p>{p.q ? <>Nada coincide con {Q(p.q)}.</> : "No hay publicaciones con esos filtros."}</p>{filtered && <button type="button" className="btn out" onClick={p.onClear}>{I(X, 16)}Quitar filtros</button>}</div>
      )}
      {p.mode === "rows" && p.rows.length > 0 && (
        <ul className="lrows" role="list">
          {p.rows.slice(0, p.shown).map(r => (
            <li key={r.id_post}>
              <button type="button" className="rw" aria-current={p.selId === r.id_post ? "true" : undefined} onClick={() => p.onPick(r)}>
                <span className="t">{r.titulo}</span>
                <span className="m"><Chip e={estadoDe(r)} /><span className="c">{r.categoria}</span>{r.publicado_en && <span className="d">{dtF(r.publicado_en)}</span>}</span>
              </button>
            </li>
          ))}
          {p.shown < p.rows.length && <li><button type="button" className="rw more" onClick={p.onMore}>Cargar más ({p.shown} de {p.total})</button></li>}
        </ul>
      )}
    </section>
  )
}
