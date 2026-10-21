import { Check, ShieldAlert, ShieldCheck, X } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { daysLabel, fmtAccess, solArea, solRole, type SolRequest } from "./solCommon"

export type SolConfirmData =
  | { kind: "apr"; req: SolRequest; days: number }
  | { kind: "rej" | "rev"; req: SolRequest }

const I = (Icon: typeof Check, size = 18) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />

/** Confirmación con la consecuencia exacta (nunca window.confirm): quién, área y hasta cuándo. */
export function SolConfirm({ data, busy, onCancel, onOk }: {
  data: SolConfirmData; busy: boolean; onCancel: () => void; onOk: () => void
}) {
  const r = data.req
  const area = solArea(r.area)
  const who = r.requester?.name ?? `usuario ${r.user_id}`
  const role = solRole(r.requester?.id_role)
  let title: string, icon: React.ReactNode, tone: "bad" | undefined, okLabel: string, okIcon: React.ReactNode
  let cons: React.ReactNode
  if (data.kind === "apr") {
    const until = fmtAccess(new Date(Date.now() + data.days * 86400000).toISOString())
    title = `Aprobar acceso a ${area}`
    icon = I(ShieldCheck); tone = undefined; okLabel = "Aprobar acceso"; okIcon = I(Check)
    cons = <>Aprobar da acceso a <b>{area}</b> a <b>{who}</b> ({role}) hasta el <b className="nw num">{until}</b> ({daysLabel(data.days)} desde ahora). Vale desde su siguiente acción y caduca solo; para quitarlo antes hay que revocarlo en Cuenta maestra.</>
  } else if (data.kind === "rej") {
    title = `Rechazar la solicitud de ${who}`
    icon = I(X); tone = "bad"; okLabel = "Rechazar solicitud"; okIcon = I(X)
    cons = <>Rechazar no concede el acceso a <b>{area}</b>. <b>{who}</b> verá la solicitud como Rechazada y tendrá que pedirla de nuevo.</>
  } else {
    title = "Rechazar una solicitud ya aprobada"
    icon = I(ShieldAlert); tone = "bad"; okLabel = "Rechazar y revocar permiso"; okIcon = I(ShieldAlert)
    cons = <>Rechazar esta solicitud <b>REVOCA el permiso</b> de <b>{area}</b> de <b>{who}</b>, vigente hasta el <b className="nw num">{fmtAccess(r.permiso?.expires_at ?? r.expires_at)}</b>. Perderá el acceso en su siguiente acción y no se puede deshacer: tendría que pedirlo de nuevo.</>
  }
  return (
    <ErpDialog open onOpenChange={(o: boolean) => { if (!o) onCancel() }} title={title} icon={icon} tone={tone}>
      <div className="pg-solacc dlgw">
        <div className="cons">{cons}</div>
        <div className="acts">
          <button className="btn out" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button className={`btn${tone ? " dng" : ""}`} type="button" onClick={onOk} disabled={busy}>{okIcon}{okLabel}</button>
        </div>
      </div>
    </ErpDialog>
  )
}
