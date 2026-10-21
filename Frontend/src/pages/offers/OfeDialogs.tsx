import { Trash2 } from "lucide-react"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { Q, fp, money, plu, type OfeRow } from "./ofeCalc"
import { I } from "./ofeShared"

export type RemoveReq = { kind: "row"; r: OfeRow } | { kind: "sel"; rows: OfeRow[] } | { kind: "all"; rows: OfeRow[] }

const Dl = ({ items }: { items: [string, string, boolean?][] }) => (
  <dl className="dl">{items.map(([t, v, big]) => <div key={t} className={big ? "big" : undefined}><dt>{t}</dt><dd className="num">{v}</dd></div>)}</dl>
)

function body(req: RemoveReq) {
  if (req.kind === "row") {
    const r = req.r
    return {
      title: `Quitar la oferta de ${Q(r.p.nombre)}`, btn: "Quitar oferta",
      text: <>El producto vuelve a su precio normal en la tienda web y en caja. <b>No se puede deshacer</b>; podrás aplicar otra oferta después.</>,
      dl: <Dl items={[[`Hoy, con oferta (−${fp(r.pct || 0)})`, money(r.offer || 0)], ["Volverá a", money(r.normal), true]]} />,
    }
  }
  const on = req.rows.filter(r => r.offer !== null)
  const avg = on.length ? on.reduce((a, r) => a + (r.pct || 0), 0) / on.length : 0
  const mx = on.reduce<OfeRow | null>((a, r) => (!a || (r.pct || 0) > (a.pct || 0) ? r : a), null)
  if (req.kind === "all") {
    return {
      title: "Quitar todas las ofertas", btn: `Quitar las ${on.length} ofertas`,
      text: <>Se quitarán las <b>{plu(on.length, "oferta", "ofertas")}</b>. Los productos vuelven a su precio normal en la tienda web y en caja. <b>No se puede deshacer.</b></>,
      dl: <Dl items={[["Ofertas que se quitan", String(on.length), true], ["Descuento promedio actual", fp(Math.round(avg * 10) / 10)], ["Mayor descuento", mx ? `${fp(mx.pct || 0)} · ${mx.p.nombre}` : "—"]]} />,
    }
  }
  const sinOferta = req.rows.length - on.length
  return {
    title: `Quitar ofertas de ${plu(req.rows.length, "producto", "productos")}`, btn: `Quitar ${plu(on.length, "oferta", "ofertas")}`,
    text: <>Los productos seleccionados con oferta vuelven a su precio normal en la tienda web y en caja. Los que no tienen oferta se omiten. <b>No se puede deshacer.</b></>,
    dl: <Dl items={[["Ofertas que se quitan", String(on.length), true], ["Se omiten (sin oferta)", String(sinOferta)]]} />,
  }
}

export function OfeRemoveDialog({ req, busy, onCancel, onConfirm }: { req: RemoveReq; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const b = body(req)
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onCancel() }} title={b.title} icon={I(Trash2, 22)} tone="bad">
      <div className="pg-ofe dlgw">
        <p className="dlgp">{b.text}</p>
        {b.dl}
        <div className="acts">
          <button type="button" className="btn out" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn dng" aria-disabled={busy || undefined} onClick={() => { if (!busy) onConfirm() }}>{b.btn}</button>
        </div>
      </div>
    </ErpDialog>
  )
}
