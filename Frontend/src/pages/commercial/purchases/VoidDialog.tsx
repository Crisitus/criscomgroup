import { useState } from "react"
import { Ban, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { commercialApi } from "../../../services/commercialService"
import { ARROW, I, errMsg, errStatus, type Purchase, type StockProduct } from "./purchasesShared"

export function VoidDialog({ p, products, onClose, onDone }: { p: Purchase; products: StockProduct[]; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState("")
  const [busy, setBusy] = useState(false)
  const [rej, setRej] = useState("")
  const close = (open: boolean) => { if (!open && !busy) onClose() }

  const confirm = async () => {
    if (!motivo.trim() || busy) return
    setBusy(true)
    try {
      await commercialApi.voidPurchase(p.id_compra, motivo.trim())
      toast.success(`${p.numero} anulada: stock y costo promedio revertidos`)
      onDone()
    } catch (e) {
      if (errStatus(e) === 409) setRej(errMsg(e, "El sistema rechazó la anulación."))
      else toast.error(errMsg(e, "No se pudo anular la compra"))
    } finally { setBusy(false) }
  }

  if (rej) return (
    <ErpDialog open onOpenChange={close} title={`No se pudo anular ${p.numero}`} icon={I(Ban, 22)} tone="bad">
      <div className="pg-compras dlgw"><div className="dlg">
        <p>El sistema rechaza la anulación cuando ya se vendieron unidades o cuando están asignadas a ubicaciones.</p>
        <div className="alert" role="alert">{I(TriangleAlert, 18)}<div>{rej}</div></div>
        <div className="acts"><button type="button" className="btn out" onClick={onClose}>Cerrar</button></div>
      </div></div>
    </ErpDialog>
  )
  const stock = (id: number) => products.find(x => x.id_producto === id)?.stock
  return (
    <ErpDialog open onOpenChange={close} title={`Anular compra ${p.numero}`} icon={I(TriangleAlert, 22)} tone="bad">
      <div className="pg-compras dlgw"><div className="dlg">
        <p>Se descontará del inventario lo que esta compra sumó y se revertirá el costo promedio de cada producto. La compra pasará a estado <b>Anulada</b>.</p>
        <dl className="dl">{p.detalles.map(d => {
          const s = stock(d.producto_id), q = Number(d.cantidad)
          return <div key={d.id_compra_detalle}><dt>{d.producto?.nombre}</dt><dd className="num">{s === undefined ? `-${q} unidades` : `Stock ${s} ${ARROW} ${s - q}`}</dd></div>
        })}</dl>
        <div className="ff" style={{ marginTop: 16 }}>
          <label htmlFor="void-motivo">Motivo <i>*</i></label>
          <textarea className="in" id="void-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Por qué se anula la compra" />
          {!motivo.trim() && <span className="sub" id="void-why" style={{ whiteSpace: "normal" }}>Escribe el motivo para anular.</span>}
        </div>
        <div className="acts">
          <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn dng" aria-disabled={!motivo.trim() || busy} aria-describedby={motivo.trim() ? undefined : "void-why"} onClick={() => void confirm()}>{I(Ban)}Anular compra</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
