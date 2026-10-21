import { ImageIcon } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { I } from "./prodShared"

export function ImageDialog({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title="Imagen del producto" description={name} icon={I(ImageIcon, 22)}>
      <div className="pg-prod dlgw"><div className="dlg">
        <div className="imgview"><img src={url} alt={`Imagen de ${name}`} /></div>
        <div className="acts"><button type="button" className="btn out" onClick={onClose}>Cerrar</button></div>
      </div></div>
    </ErpDialog>
  )
}
