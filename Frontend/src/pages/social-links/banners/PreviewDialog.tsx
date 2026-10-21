import { Image } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { I } from "../shared"
import { bannerTitle, type Row } from "./bannerShared"

export function PreviewDialog({ b, onClose }: { b: Row; onClose: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title={bannerTitle(b)} icon={I(Image, 22)}>
      <div className="pg-redes dlgw"><div className="dlg">
        <div className="big-pv">
          {b.media_type === "video" ? <video src={b.imagen_url || ""} controls playsInline preload="metadata" /> : <img src={b.imagen_url || ""} alt={bannerTitle(b)} />}
        </div>
        <div className="acts"><button type="button" className="btn out" onClick={onClose}>Cerrar</button></div>
      </div></div>
    </ErpDialog>
  )
}
