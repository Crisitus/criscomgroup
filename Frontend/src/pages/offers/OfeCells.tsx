import { Ban, CircleAlert, PackageX, Tag, Trash2 } from "lucide-react"
import { MINUS, fp, money, type Calc, type OfeRow } from "./ofeCalc"
import type { RowCtx, RowView } from "./ofeRow"
import { Chip, I, MgCell } from "./ofeShared"

export const Stock = ({ r }: { r: OfeRow }) =>
  r.p.stock === 0 ? <Chip k="bad" icon={PackageX} t="Agotado" /> : <span className="num">{r.p.stock}</span>

export function PriceInput({ r, x, c }: { r: OfeRow; x: RowCtx; c: Calc }) {
  const v = x.fix[r.id] ?? ""
  return (
    <label className={`pin${c.err ? " bad" : ""}`}>
      <span className="sr">Precio fijo con IGV de {r.p.nombre}</span>S/
      <input
        inputMode="decimal" placeholder="0.00" value={v} data-pin={r.id}
        aria-invalid={c.err ? true : undefined} aria-describedby={c.err ? `e-${r.id}` : undefined}
        onChange={e => x.onPrice(r.id, e.target.value)} onBlur={() => x.onBlur(r.id)} onWheel={e => e.currentTarget.blur()}
      />
      {c.err ? I(CircleAlert, 16) : null}
    </label>
  )
}

export function OfferCell({ r, v, x }: { r: OfeRow; v: RowView; x: RowCtx }) {
  const { dis, c } = v
  if (dis) {
    return (
      <div className="stk">
        <span className="l1"><Chip k="bad" icon={Ban} t="No admite oferta" /></span>
        <span className="sub" id={`why-${r.id}`}>Sin precio normal válido</span>
      </div>
    )
  }
  if (c && x.mode === "fix") return <PriceInput r={r} x={x} c={c} />
  if (c && !c.err && c.price !== undefined && c.pct !== undefined) {
    return (
      <div className="stk">
        <span className="l1"><b className="num">{money(c.price)}</b><span className="pc num">{MINUS}{fp(c.pct).replace(MINUS, "")}</span></span>
        <span className="sub num">{c.rep || `Nuevo · ahorro ${money(c.save || 0)}`}</span>
      </div>
    )
  }
  if (r.offer !== null && r.pct !== null) {
    return (
      <div className="stk">
        <span className="l1"><b className="num">{money(r.offer)}</b><span className="pc num">{MINUS}{fp(r.pct).replace(MINUS, "")}</span></span>
        <span className="l2"><Chip k="on" icon={Tag} t="En oferta" /><span className="sub num ah">ahorro {money(r.normal - r.offer)}</span></span>
      </div>
    )
  }
  return <span className="mut">Sin oferta</span>
}

export function MarginCell({ r, v, x }: { r: OfeRow; v: RowView; x: RowCtx }) {
  const { dis, c } = v
  if (dis) return <div className="stk rt"><span className="sub">—</span></div>
  if (c && x.mode === "fix") {
    return c.err || c.price === undefined || c.pct === undefined
      ? <div className="stk rt"><span className="sub">—</span></div>
      : <MgCell price={c.price} cost={r.cost} pre={`${MINUS}${fp(c.pct).replace(MINUS, "")}`} />
  }
  if (c && !c.err && c.price !== undefined) return <MgCell price={c.price} cost={r.cost} pre="Nuevo" />
  return <MgCell price={r.offer ?? r.normal} cost={r.cost} />
}

export function RowAction({ r, v, x, mob }: { r: OfeRow; v: RowView; x: RowCtx; mob?: boolean }) {
  if (v.dis) return <button type="button" className="btn out sm" aria-disabled="true" aria-describedby={`why-${r.id}`}>Ofertar</button>
  const dis = x.off || x.busy
  const d = { "aria-disabled": dis || undefined, "aria-describedby": x.off ? "off-msg" : undefined }
  return r.offer !== null
    ? <button type="button" className="btn out sm" {...d} onClick={() => { if (!dis) x.onQuitar(r) }}>{I(Trash2, 16)}{mob ? "Quitar oferta" : "Quitar"}</button>
    : <button type="button" className="btn out sm" {...d} onClick={() => { if (!dis) x.onOfertar(r) }}>{I(Tag, 16)}Ofertar</button>
}
