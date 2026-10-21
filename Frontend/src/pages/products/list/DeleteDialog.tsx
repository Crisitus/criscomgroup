import { useState } from "react"
import { ArrowDownUp, CircleX, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { deleteProduct } from "../../../services/productService"
import { I, errMsg, errStatus, type Row } from "./prodShared"

export function DeleteDialog({ r, onClose, onDone, onAdjust }: { r: Row; onClose: () => void; onDone: () => void; onAdjust: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<{ status?: number; msg: string } | null>(null)
  const close = (o: boolean) => { if (!o && !busy) onClose() }
  const go = async () => {
    if (busy) return
    setBusy(true)
    try {
      await deleteProduct(r.id)
      toast.success(`Producto ${r.p.sku} eliminado`)
      onDone()
    } catch (e) {
      setErr({ status: errStatus(e), msg: errMsg(e, "No se pudo eliminar el producto") })
    } finally { setBusy(false) }
  }
  const blocked = err?.status === 409
  return (
    <ErpDialog open onOpenChange={close} title="¿Eliminar este producto?" icon={I(Trash2, 22)} tone="bad">
      <div className="pg-prod dlgw"><div className="dlg">
        <p>Se eliminará <b>{r.p.nombre}</b> del inventario junto con sus códigos de barras. Esta acción no se puede deshacer.</p>
        <dl className="dl">
          <div><dt>SKU</dt><dd className="sku" style={{ fontSize: 13 }}>{r.p.sku}</dd></div>
          <div><dt>Stock actual</dt><dd className="num">{r.p.stock}</dd></div>
          <div><dt>Códigos de barras</dt><dd className="num">{(r.p.codigos_barras || []).length}</dd></div>
        </dl>
        {err && <div className="alert" role="alert">{I(CircleX, 18)}<span><b>No se puede eliminar:</b> {err.msg}</span></div>}
        <div className="acts">
          <button type="button" className="btn out" onClick={onClose}>{blocked ? "Cerrar" : "Cancelar"}</button>
          {blocked
            ? <button type="button" className="btn" onClick={onAdjust}>{I(ArrowDownUp)}Ajustar stock</button>
            : <button type="button" className="btn dng" aria-disabled={busy} onClick={() => void go()}>{I(Trash2)}{busy ? "Eliminando..." : "Eliminar producto"}</button>}
        </div>
      </div></div>
    </ErpDialog>
  )
}
