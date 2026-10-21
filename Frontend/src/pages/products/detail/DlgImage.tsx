import { ErpDialog } from "../../../components/erp/ErpDialog"

export function DlgImage({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title={name}>
      <div className="pg-ficha dlgw">
        <div className="dlg">
          <div className="imgv"><img src={url} alt={`Imagen de ${name}`} /></div>
          <div className="acts"><button type="button" className="btn out" onClick={onClose}>Cerrar</button></div>
        </div>
      </div>
    </ErpDialog>
  )
}
