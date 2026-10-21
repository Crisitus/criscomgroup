import { useState } from "react"
import { CircleAlert, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { unsubscribeMember, type CommunityMember } from "../../../services/communityService"
import { Btn } from "./Btn"
import { I, errMsg, fd } from "./comShared"

export function BajaDialog({ m, onClose, onDone }: { m: CommunityMember; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const run = async () => {
    setBusy(true)
    try { await unsubscribeMember(m.id_subscriber); toast.success("Miembro dado de baja"); onDone() }
    catch (e) { setErr(errMsg(e, "No se pudo dar de baja")); setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title={`Dar de baja a ${m.nombre || "este miembro"}`} tone="bad" icon={I(UserMinus, 22)}>
      <div className="pg-com dlgw">
        <div className="dlgbody">
          <p className="sub">Dejará de recibir correos. <b>No se puede revertir desde aquí.</b></p>
          <dl className="kv"><dt>Correo</dt><dd>{m.email}</dd><dt>Fuente</dt><dd>{m.fuente}</dd><dt>Consentimiento</dt><dd>{fd(m.consentimiento_en)}</dd></dl>
          {err && <div className="ban bad" role="alert">{I(CircleAlert, 18)}<div>{err}</div></div>}
        </div>
        <div className="acts"><Btn cls="out" onClick={onClose} busy={busy}>Cancelar</Btn><Btn cls="dng" icon={UserMinus} onClick={() => void run()} busy={busy}>{busy ? "Procesando…" : "Dar de baja"}</Btn></div>
      </div>
    </ErpDialog>
  )
}
