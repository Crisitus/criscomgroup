import { useState } from "react"
import { CircleAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { deleteCampaign, type CommunityCampaign } from "../../../services/communityService"
import { Btn } from "./Btn"
import { I, errMsg } from "./comShared"

export function DeleteDialog({ c, onClose, onDone }: { c: CommunityCampaign; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const run = async () => {
    setBusy(true)
    try { await deleteCampaign(c.id_campaign); toast.success("Borrador eliminado"); onDone() }
    catch (e) { setErr(errMsg(e, "No se pudo eliminar el borrador")); setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title="Eliminar borrador" tone="bad" icon={I(Trash2, 22)}>
      <div className="pg-com dlgw">
        <div className="dlgbody">
          <p className="sub">Se borra el borrador y su mensaje. <b>No se puede deshacer.</b> No se había enviado nada, así que ningún miembro se ve afectado.</p>
          <dl className="kv"><dt>Asunto</dt><dd>{c.asunto}</dd></dl>
          {err && <div className="ban bad" role="alert">{I(CircleAlert, 18)}<div>{err}</div></div>}
        </div>
        <div className="acts"><Btn cls="out" onClick={onClose} busy={busy}>Cancelar</Btn><Btn cls="dng" icon={Trash2} onClick={() => void run()} busy={busy}>{busy ? "Eliminando…" : "Eliminar borrador"}</Btn></div>
      </div>
    </ErpDialog>
  )
}
