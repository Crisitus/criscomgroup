import { Check, X } from "lucide-react"
import { daysLabel, fmtAccess, solArea, solRole, solVigencia, SOL_DAYS, SOL_STATUS, type SolRequest, type SolStatus } from "./solCommon"

const I = (Icon: typeof Check, size = 16) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />

/** Fila de la bandeja maestra: solicitante (nombre + rol), área, motivo y acciones según pestaña. */
export function SolRow({ r, tab, days, onDays, onApprove, onReject, disabled }: {
  r: SolRequest; tab: SolStatus; days: number; onDays: (n: number) => void
  onApprove: () => void; onReject: () => void; disabled: boolean
}) {
  const st = SOL_STATUS[r.status] ?? SOL_STATUS.pending
  const StIcon = st.i
  const when = tab === "pending"
    ? `Pedida el ${fmtAccess(r.created_at)}`
    : `${tab === "approved" ? "Aprobada" : "Rechazada"} el ${fmtAccess(r.reviewed_at)}`
  const exp = tab === "approved" ? (r.permiso?.expires_at ?? r.expires_at) : null
  const vig = exp ? solVigencia(exp) : null
  const VigIcon = vig?.i
  return (
    <li className="rq">
      <div className="who"><b>{r.requester?.name ?? `Usuario ${r.user_id}`}</b><span>{solRole(r.requester?.id_role)}</span></div>
      <div className="ar"><b>{solArea(r.area)}</b><span className="num">{when}</span></div>
      <p className="mo">
        {r.reason}
        {exp && <em className="num">Hasta el {fmtAccess(exp)}</em>}
        {r.review_note && <em>Nota: {r.review_note}</em>}
      </p>
      <div className="ac">
        {tab === "pending" && (
          <>
            <label className="fld">
              <span className="sr">{`Vigencia para ${r.requester?.name ?? r.user_id}`}</span>
              <select className="sl" value={days} disabled={disabled} onChange={e => onDays(Number(e.target.value))}>
                {SOL_DAYS.map(n => <option key={n} value={n}>{daysLabel(n)}</option>)}
              </select>
            </label>
            <button className="btn" type="button" disabled={disabled} onClick={onApprove}>{I(Check)}Aprobar</button>
            <button className="btn out" type="button" disabled={disabled} onClick={onReject}>{I(X)}Rechazar</button>
          </>
        )}
        {tab === "approved" && vig && VigIcon && (
          <>
            <span className={`vg ${vig.c}`}><VigIcon className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />{vig.t}</span>
            <button className="btn out" type="button" disabled={disabled} onClick={onReject}>{I(X)}Rechazar</button>
          </>
        )}
        {tab === "rejected" && <span className={`st ${st.c}`}><StIcon className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />{st.t}</span>}
      </div>
    </li>
  )
}
