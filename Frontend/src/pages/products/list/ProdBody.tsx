import type { ReactElement } from "react"
import { CircleAlert, Package, Plus, RefreshCw, Search } from "lucide-react"
import { ProdCards } from "./ProdCards"
import { ProdPager } from "./ProdPager"
import { ProdTable, type ListProps } from "./ProdTable"
import { ELL, I } from "./prodShared"

const box = (icon: ReactElement, bad: boolean, h: string, p: string, btn?: ReactElement) => (
  <div className="tcard"><div className="empty" role={bad ? "alert" : "status"}><span className={`ei${bad ? " bad" : ""}`}>{icon}</span><h2>{h}</h2><p>{p}</p>{btn}</div></div>
)

export function Skeleton({ mob }: { mob: boolean }) {
  const sk = (w: string, h?: number) => <span className="skb" style={{ width: w, height: h }} />
  if (mob) return <div className="mlist" aria-busy="true">{[0, 1, 2].map(i => <div className="mc" key={i}>{sk("60%")}{sk("90%")}{sk("40%")}</div>)}</div>
  return (
    <div className="tcard" aria-busy="true">
      <table className="tb skl"><tbody>
        {[0, 1, 2, 3, 4, 5].map(i => <tr key={i}><td style={{ width: 56 }}>{sk("36px", 36)}</td><td>{sk("55%")}</td><td>{sk("70%")}</td><td>{sk("60%")}</td><td>{sk("60%")}</td><td>{sk("60%")}</td></tr>)}
      </tbody></table>
    </div>
  )
}
export const Loading = () => <div className="ctx" role="status">{I(RefreshCw, 16, "spin")}Cargando productos{ELL}</div>

export function ProdBody(p: ListProps & {
  mob: boolean; loading: boolean; error: boolean; empty: boolean; total: number; all: number
  q: string; hasFilter: boolean; page: number; pages: number; from: number; to: number
  onPage: (n: number) => void; onRetry: () => void; onClear: () => void; onNew: (() => void) | null
}) {
  if (p.loading) return <Skeleton mob={p.mob} />
  if (p.error) return box(I(CircleAlert, 22), true, "No se pudieron cargar los productos", "No pudimos consultar el inventario. Inténtalo de nuevo; no se ha modificado ningún dato.", <button type="button" className="btn" onClick={p.onRetry}>{I(RefreshCw)}Reintentar</button>)
  if (p.empty) return box(I(Package, 22), false, "Aún no hay productos", "Cuando crees el primero con «Nuevo producto», aparecerá aquí con su stock, margen y precios.", p.onNew ? <button type="button" className="btn" onClick={p.onNew}>{I(Plus)}Nuevo producto</button> : undefined)
  if (p.total === 0) {
    const code = /^\d{6,}$/.test(p.q.trim())
    return box(I(Search, 22), false,
      code ? `Ningún producto tiene el código ${p.q.trim()}` : "No se encontraron productos",
      code ? "Revisa que el código esté completo o búscalo por nombre o SKU." : "Ningún producto coincide con la búsqueda o los filtros aplicados.",
      <button type="button" className="btn out" onClick={p.onClear}>{p.hasFilter ? "Limpiar búsqueda y filtros" : "Reintentar"}</button>)
  }
  const foot = <ProdPager page={p.page} pages={p.pages} from={p.from} to={p.to} total={p.total} all={p.all} onPage={p.onPage} />
  if (p.mob) return <><ProdCards rows={p.rows} hl={p.hl} ro={p.ro} acts={p.acts} menuId={p.menuId} setMenuId={p.setMenuId} /><div className="mfoot">{foot}</div></>
  return <div className="tcard"><ProdTable {...p} /><div className="tfoot">{foot}</div></div>
}
