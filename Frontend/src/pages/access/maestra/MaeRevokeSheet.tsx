import { ShieldX } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import type { AccessGrant } from "../../../services/accessService"
import { ROLES, areaLabel, fmtLima, revokeText, vigencia, whoOf } from "./maeCommon"
import { I, Spin } from "./maeParts"

/** Revocar en movil: dialogo con la consecuencia exacta (la confirmacion inline no cabe). */
export function MaeRevokeSheet({ g, busy, error, onCancel, onOk }: { g: AccessGrant; busy: boolean; error: string; onCancel: () => void; onOk: () => void }) {
  const area = areaLabel(g.area)
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onCancel() }} title={`Revocar permiso de ${area}`} icon={I(ShieldX, 22)} tone="bad">
      <div className="pg-maestra dlgw">
        <div className="who">
          <b>{whoOf(g)}</b>
          <span>{g.user ? `${ROLES[g.user.id_role] ?? ""} · ${g.user.email}` : ""}</span>
          <span>Área · {area}</span>
          <span>{g.expires_at ? `${fmtLima(g.expires_at)} · ${vigencia(g.expires_at).t}` : "Sin vencimiento"}</span>
        </div>
        <p className="cons">{revokeText(area, whoOf(g))}</p>
        {error && <p className="msg" role="alert">{error}</p>}
        <div className="acts">
          <button type="button" className="btn out" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" className="btn dng" onClick={onOk} disabled={busy}>{busy ? <><Spin />Revocando…</> : "Revocar permiso"}</button>
        </div>
      </div>
    </ErpDialog>
  )
}
