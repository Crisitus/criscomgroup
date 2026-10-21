import { CircleAlert } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { I } from "./shared"

export function DlgLeave({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onStay() }} title="¿Salir sin guardar?">
      <div className="pg-ficha dlgw">
        <div className="dlg">
          <div className="note warn" role="status">{I(CircleAlert)}<span>Los cambios de esta ficha (datos, precios, códigos o imagen) se perderán y el producto queda como estaba.</span></div>
          <div className="acts">
            <button type="button" className="btn out" onClick={onStay}>Seguir editando</button>
            <button type="button" className="btn dng" onClick={onLeave}>Salir sin guardar</button>
          </div>
        </div>
      </div>
    </ErpDialog>
  )
}
