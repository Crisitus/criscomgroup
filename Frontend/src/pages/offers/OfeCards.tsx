import type { ReactNode } from "react"
import { Ban, Tag, CircleAlert, CircleHelp, PackageX, TriangleAlert } from "lucide-react"
import { MINUS, SEP, fp, mg, mgs, money, type Calc, type OfeRow } from "./ofeCalc"
import { Chip, I } from "./ofeShared"
import { PriceInput, RowAction } from "./OfeCells"
import { rowView, type RowCtx, type RowView } from "./ofeRow"

function mgText(price: number, cost: number | null) {
  if (cost === null) return "—"
  if (!(cost > 0)) return <Chip k="neu" icon={CircleHelp} t="Sin costo" />
  const m = mg(price, cost)
  if (m === null) return "—"
  return m < 0 ? <><Chip k="bad" icon={TriangleAlert} t="Bajo el costo" /> {mgs(m)}</> : mgs(m)
}

function offerText(r: OfeRow, v: RowView, x: RowCtx) {
  const c: Calc | null = v.c
  if (v.dis) return <Chip k="bad" icon={Ban} t="No admite oferta" />
  if (c && x.mode === "fix") return <PriceInput r={r} x={x} c={c} />
  if (c && !c.err && c.price !== undefined && c.pct !== undefined) {
    return <><span className="num">{money(c.price)}</span> <span className="pc num">{MINUS}{fp(c.pct).replace(MINUS, "")}</span></>
  }
  if (r.offer !== null && r.pct !== null) {
    return <><span className="num">{money(r.offer)}</span> <span className="pc num">{MINUS}{fp(r.pct).replace(MINUS, "")}</span><br /><Chip k="on" icon={Tag} t="En oferta" /></>
  }
  return <span className="mut" style={{ fontWeight: 500 }}>Sin oferta</span>
}

function Card({ r, x }: { r: OfeRow; x: RowCtx }) {
  const v = rowView(r, x)
  const c = v.c
  let mgn: ReactNode
  if (v.dis) mgn = <span className="mut">—</span>
  else if (c && x.mode === "fix") mgn = c.err || c.price === undefined ? "—" : mgText(c.price, r.cost)
  else if (c && !c.err && c.price !== undefined) mgn = mgText(c.price, r.cost)
  else mgn = mgText(r.offer ?? r.normal, r.cost)
  return (
    <article className={`mc${v.on ? " sl" : ""}`}>
      <div className="m0">
        <input className="cbx" type="checkbox" checked={v.on} disabled={v.dis} aria-label={`Seleccionar ${r.p.nombre}`} onChange={() => x.onPick(r)} />
        <div className="stk"><span className="nm">{r.p.nombre}</span><span className="sub">{r.p.sku}{SEP}{r.p.categoria?.nombre || "—"}</span></div>
        {r.p.stock === 0 ? <Chip k="bad" icon={PackageX} t="Agotado" /> : <span className="sub num" style={{ marginTop: 12 }}>Stock {r.p.stock}</span>}
      </div>
      <dl className="m3">
        <div><dt>Precio normal</dt><dd className="num">{money(r.normal)}{r.mayor !== null && <><br /><span className="sub num">May. {money(r.mayor)}</span></>}</dd></div>
        <div><dt>Oferta actual</dt><dd>{offerText(r, v, x)}</dd></div>
        <div><dt>Margen</dt><dd className="num">{mgn}</dd></div>
      </dl>
      {c?.err && x.mode === "fix" && !x.hasResult && <div className="er2" id={`e-${r.id}`}>{I(CircleAlert, 16)}<span>{c.err}</span></div>}
      <div className="m4"><RowAction r={r} v={v} x={x} mob /></div>
    </article>
  )
}

export function OfeCards({ rows, x }: { rows: OfeRow[]; x: RowCtx }) {
  return <div className="mlist">{rows.map(r => <Card key={r.id} r={r} x={x} />)}</div>
}
