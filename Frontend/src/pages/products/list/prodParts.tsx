import { CircleAlert, CircleMinus, CircleX, Package } from "lucide-react"
import { DASH, I, imgUrl, money, pct, type Row } from "./prodShared"

export const Tag = ({ t }: { t: string }) => <span className="tag">{t}</span>
export const Tags = ({ r }: { r: Row }) => (
  <>
    {r.p.condicion === "segunda_mano" && <Tag t="Segunda mano" />}
    {r.p.origen === "importado" && <Tag t="Importado" />}
    {r.p.es_oferta && r.offer !== null && <Tag t="Oferta" />}
  </>
)

export function Thumb({ r, onView }: { r: Row; onView: (url: string, name: string) => void }) {
  const url = imgUrl(r.p.imagen_url)
  if (!url) return <span className="thumb" role="img" aria-label="Sin imagen">{I(Package, 18)}</span>
  return (
    <button type="button" className="thumb" aria-label={`Ver imagen de ${r.p.nombre}`} onClick={e => { e.stopPropagation(); onView(url, r.p.nombre) }}>
      <img src={url} alt="" loading="lazy" />
    </button>
  )
}

export function StockChips({ r }: { r: Row }) {
  return (
    <>
      {r.sin ? <span className="st bad">{I(CircleX, 12)}Sin stock</span> : r.bajo ? <span className="st warn">{I(CircleAlert, 12)}Bajo mínimo</span> : null}
      {r.inc && <span className="st warn">{I(CircleAlert, 12)}Requiere ajuste</span>}
    </>
  )
}
export const stockNote = (r: Row) => (r.inc ? `códigos: ${r.codeSum}` : r.sin || r.bajo ? `mín. ${r.mn}` : r.su > 0 ? `${r.su} sin ubicar` : "")

export function StockCell({ r }: { r: Row }) {
  const nt = stockNote(r)
  const has = r.sin || r.bajo || r.inc
  return (
    <div className="stk">
      <div className="chs" style={{ alignItems: "baseline" }}><span className="a num">{r.p.stock}</span>{nt && <span className="sub num">{nt}</span>}</div>
      {has && <div className="chs"><StockChips r={r} /></div>}
    </div>
  )
}
export const Margin = ({ r }: { r: Row }) =>
  r.ck
    ? <div className="stk rt"><span className="a num">{money(r.mu)}</span>{r.mp !== null && <span className="sub num">{pct(r.mp)}</span>}</div>
    : <span className="st neu">{I(CircleMinus, 12)}Sin costo</span>
export const Price = ({ r }: { r: Row }) =>
  r.offer !== null
    ? <div className="stk rt"><span className="a num">{money(r.offer)}</span><span className="old num">{money(r.price)}</span></div>
    : <span className="num" style={{ fontWeight: 600 }}>{money(r.price)}</span>
export const Dash = ({ label }: { label: string }) => <span className="mut" aria-label={label}>{DASH}</span>
