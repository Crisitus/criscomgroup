import { CircleAlert, EyeOff, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { getApiErrorMessage, setBannerActivo } from "../../../services/marketingService"
import { I, Q } from "../shared"
import { bannerOn, bannerTitle, type Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

export function DeleteDialog({ b, api, onClose, onDone }: { b: Row; api: BannersApi; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const on = bannerOn(b), t = bannerTitle(b)
  const close = (o: boolean) => { if (!o && !busy) onClose() }

  const remove = async () => {
    setBusy(true); setErr("")
    try { await api.del.mutateAsync(b.id_banner); onDone() }
    catch (e) { setErr(getApiErrorMessage(e, "No se pudo eliminar el banner")) }
    finally { setBusy(false) }
  }
  const hide = async () => {
    setBusy(true); setErr("")
    try { await setBannerActivo(b.id_banner, false); await api.refresh(); toast.success("Banner oculto de la web"); onDone() }
    catch (e) { setErr(getApiErrorMessage(e, "No se pudo ocultar el banner")) }
    finally { setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={close} title="¿Eliminar este banner?" icon={I(Trash2, 22)} tone="bad">
      <div className="pg-redes dlgw"><div className="dlg">
        <p>Vas a eliminar <b>{Q(t)}</b>. Se borrará el registro y también el archivo del servidor. <b>No se puede deshacer.</b>{on ? " Además dejará de salir en el carrusel de la web." : ""}</p>
        {on && <div className="alt">{I(EyeOff, 18)}<span>¿Solo quieres quitarlo de la web? <b>Ocúltalo</b>: se conserva y puedes publicarlo otra vez con un clic.</span></div>}
        {err && <div className="al bad" role="alert" style={{ marginTop: 14 }}>{I(CircleAlert, 18)}<div><p>{err}</p></div></div>}
        <div className="acts">
          <button type="button" className="btn out" disabled={busy} onClick={onClose}>Cancelar</button>
          {on && <button type="button" className="btn rp" disabled={busy} onClick={() => void hide()}>{I(EyeOff, 16)}Ocultar en su lugar</button>}
          <button type="button" className="btn dng" disabled={busy} onClick={() => void remove()}>{busy ? "Eliminando…" : "Eliminar definitivamente"}</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
