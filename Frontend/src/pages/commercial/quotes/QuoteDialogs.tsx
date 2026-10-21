import { useState } from "react"
import { CircleAlert, CircleX, Info, ShoppingCart } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { commercialApi } from "../../../services/commercialService"
import { ARROW, I, METODOS, Q, TIMES, errMsg, money, type Quote, type StockProduct } from "./quotesShared"

export function ConvertDialog({ q, products, onClose, onDone }: {
  q: Quote; products: StockProduct[]; onClose: () => void; onDone: (ventaId: number) => void
}) {
  const [pay, setPay] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const stock = (id: number | null) => products.find(p => p.id_producto === id)?.stock
  const confirm = async () => {
    if (!pay || busy) return
    setBusy(true); setErr("")
    try {
      const r = await commercialApi.convertQuote(q.id_cotizacion, pay)
      onDone(r.venta_id)
    } catch (e) { setErr(errMsg(e, "No se pudo convertir la cotización")) }
    finally { setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title="Convertir en venta" icon={I(ShoppingCart, 22)}>
      <div className="pg-cotiz dlgw"><div className="dlg">
        <p className="sum"><b>{q.numero}</b> · {q.cliente_nombre} · <b className="num">{money(q.total)}</b></p>
        <div className="fld" role="radiogroup" aria-labelledby="cv-mp">
          <span id="cv-mp">Método de pago <i>*</i></span>
          <div className="opts">{METODOS.map(([k, l]) => <button type="button" key={k} className="opt" role="radio" aria-checked={pay === k} onClick={() => setPay(k)}>{l}</button>)}</div>
        </div>
        <div className="cons">Se creará la venta por <b className="num">{money(q.total)}</b> y se <b>descontará del stock</b>:
          {q.detalles.map(d => { const s = stock(d.producto_id); return <div key={d.id_cotizacion_detalle}>{d.cantidad} {TIMES} {d.descripcion}{s === undefined ? "" : ` (stock ${s} ${ARROW} ${s - d.cantidad})`}</div> })}
          La cotización quedará {Q("Convertida en venta")}. <b>No se puede deshacer.</b></div>
        {err && <p className="err" role="alert">{I(CircleAlert, 16)}<span>{err}</span></p>}
        {!pay && <p className="why neu" id="cv-why">{I(Info, 16)}<span>Elige un método de pago para continuar.</span></p>}
        <div className="ft">
          <button type="button" className="btn out" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="btn" aria-disabled={!pay || busy} aria-describedby={pay ? undefined : "cv-why"} onClick={confirm}>{I(ShoppingCart, 16)}{busy ? "Convirtiendo..." : "Convertir en venta"}</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}

export function RejectDialog({ q, onClose, onDone }: { q: Quote; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const confirm = async () => {
    if (busy) return
    setBusy(true); setErr("")
    try { await commercialApi.quoteStatus(q.id_cotizacion, "rechazada"); onDone() }
    catch (e) { setErr(errMsg(e, "No se pudo rechazar la cotización")) }
    finally { setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title={`Rechazar ${q.numero}`} icon={I(CircleX, 22)} tone="bad">
      <div className="pg-cotiz dlgw"><div className="dlg">
        <div className="cons">La cotización de <b>{q.cliente_nombre}</b> por <b className="num">{money(q.total)}</b> quedará {Q("Rechazada")}. Es un estado final: <b>no se podrá enviar, aprobar ni convertir</b>. El stock no se modifica.</div>
        {err && <p className="err" role="alert">{I(CircleAlert, 16)}<span>{err}</span></p>}
        <div className="ft">
          <button type="button" className="btn out" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="btn dng" aria-disabled={busy} onClick={confirm}>{I(CircleX, 16)}Rechazar cotización</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
