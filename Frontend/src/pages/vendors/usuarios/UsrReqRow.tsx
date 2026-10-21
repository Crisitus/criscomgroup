import { useState } from "react"
import { Ban, Check, CheckCircle2, Clock, Lock, X, XCircle } from "lucide-react"
import { AREAS, ROLE, fmtDT } from "./usrCommon"
import type { Rule } from "./usrRules"
import type { AccessReq } from "./useUsrAccess"
import type { Actions } from "./useUsrActions"
import { resolveRequest, revokeGrant } from "./usrApi"
import { Chip, Confirm, I, Spin, Why } from "./UsrParts"
import { UsrApprove } from "./UsrApprove"

type Mode = null | "ap" | "rj" | "rv" | "rja"
const PERMISO = { activo: ["ok", CheckCircle2, "Activo"], vencido: ["wn", Clock, "Vencido"], revocado: ["nu", XCircle, "Revocado"] } as const

function Estado({ r }: { r: AccessReq }) {
  if (r.status === "pending") return <div className="sts"><Chip t="wn" icon={Clock} x="Pendiente" /></div>
  if (r.status === "rejected") return <div className="sts"><Chip t="er" icon={XCircle} x="Rechazada" /><small>Resuelta el {fmtDT(r.reviewed_at)}</small></div>
  const p = r.permiso
  return (
    <div className="sts">
      <Chip t="ok" icon={CheckCircle2} x="Aprobada" />
      {p && <Chip t={PERMISO[p.estado][0]} icon={PERMISO[p.estado][1]} x={PERMISO[p.estado][2]} />}
      {p && p.estado === "activo" && <small>Vence el {fmtDT(p.expires_at)} (hora de Lima)</small>}
      {p && p.estado === "vencido" && <small>Venció el {fmtDT(p.expires_at)}</small>}
    </div>
  )
}

export function UsrReqRow({ r, can, act, onDone }: { r: AccessReq; can: Rule; act: Actions; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(null)
  const [note, setNote] = useState("")
  const name = r.requester?.name ?? `Cuenta #${r.user_id}`
  const first = name.split(" ")[0]
  const area = AREAS[r.area] ?? r.area
  const key = `r${r.id_request}`
  const off = !can.ok
  const open = (m: Mode) => { if (!off) { act.clear(); setMode(m) } }
  const fin = () => { setMode(null); setNote(""); onDone() }
  const reject = async (withNote: boolean) => {
    const res = await act.run(key, () => resolveRequest(r.id_request, { status: "rejected", review_note: withNote && note.trim() ? note.trim() : undefined }),
      { title: "Solicitud rechazada", text: r.status === "approved" ? `El permiso de ${area} de ${first} quedó revocado.` : `La solicitud de ${first} se rechazó.` })
    if (res.ok) fin()
  }
  const revoke = async () => {
    const res = await act.run(key, () => revokeGrant(r.permiso!.id_grant), { title: "Permiso revocado", text: `${first} ya no tiene acceso a ${area}.` })
    if (res.ok) fin()
  }
  const busy = act.busy === key
  const B = (m: Mode, ic: typeof Check, x: string, cls: string) => <button type="button" className={`btn ${cls}`} aria-disabled={off} aria-describedby={off ? `w${key}` : undefined} onClick={() => open(m)}>{I(ic, 16)}{x}</button>

  return (
    <div role="listitem">
      <div className="rq">
        <div><b>{name}</b><small>{r.requester ? ROLE[r.requester.id_role] : ""}</small></div>
        <div><b>{area}</b></div>
        <div>
          <span>{r.reason}</span>
          {r.review_note && <small>Nota de revisión: «{r.review_note}»</small>}
          <small>Solicitada el {fmtDT(r.created_at)}</small>
        </div>
        <Estado r={r} />
        <div className="ac">
          {r.status === "pending" && <div className="bt">{B("ap", Check, "Aprobar", "pri")}{B("rj", X, "Rechazar", "out")}</div>}
          {r.status === "approved" && <>{r.permiso?.estado === "activo" && B("rv", Ban, "Revocar permiso", "out")}{B("rja", X, "Rechazar solicitud", "out")}<Why>Rechazar una solicitud aprobada también revoca su permiso.</Why></>}
          {off && r.status !== "rejected" && <Why id={`w${key}`} icon={Lock}>{can.why}</Why>}
        </div>
      </div>
      {mode === "ap" && <UsrApprove r={r} act={act} onDone={fin} onCancel={() => setMode(null)} />}
      {mode === "rj" && (
        <div className="ap">
          <div><label className="lab2" htmlFor={`rn${r.id_request}`}>Nota de revisión (opcional)</label><textarea id={`rn${r.id_request}`} className="inp" value={note} maxLength={500} onChange={e => setNote(e.target.value)} /></div>
          <div className="acts" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn out" onClick={() => setMode(null)}>Cancelar</button>
            <button type="button" className="btn dng" aria-disabled={busy} onClick={() => { if (!busy) void reject(true) }}>{busy ? <Spin /> : I(X, 16)}Confirmar rechazo</button>
          </div>
        </div>
      )}
      {mode === "rv" && <div className="ap"><Confirm title={`¿Revocar el permiso de ${area} de ${first}?`} text="Perderá el acceso ahora mismo. La solicitud seguirá como Aprobada." okLabel="Revocar permiso" busy={busy} onOk={() => void revoke()} onCancel={() => setMode(null)} /></div>}
      {mode === "rja" && <div className="ap"><Confirm title={`¿Rechazar la solicitud aprobada de ${first}?`} text={`Se revoca el permiso de ${area} de inmediato y la solicitud pasa a Rechazada.`} okLabel="Rechazar y revocar" busy={busy} onOk={() => void reject(false)} onCancel={() => setMode(null)} /></div>}
    </div>
  )
}
