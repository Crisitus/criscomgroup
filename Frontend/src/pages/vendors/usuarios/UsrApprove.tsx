import { useState } from "react"
import { Check } from "lucide-react"
import { AREAS, inDays, isFutureLima } from "./usrCommon"
import type { AccessReq } from "./useUsrAccess"
import type { Actions } from "./useUsrActions"
import { resolveRequest } from "./usrApi"
import { I, Spin, Why } from "./UsrParts"
import { UsrExpiry } from "./UsrExpiry"

/** Aprobar: vigencia obligatoria, futura y de máximo 30 días (hora de Lima) con nota de revisión opcional. */
export function UsrApprove({ r, act, onDone, onCancel }: { r: AccessReq; act: Actions; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState(inDays(7))
  const [note, setNote] = useState("")
  const first = (r.requester?.name ?? "La cuenta").split(" ")[0]
  const area = AREAS[r.area] ?? r.area
  const go = async () => {
    const res = await act.run(`ap${r.id_request}`, () => resolveRequest(r.id_request, { status: "approved", expires_at: v, review_note: note.trim() || undefined }), { title: "Solicitud aprobada", text: `${first} podrá usar ${area} hasta la fecha elegida.` })
    if (res.ok) onDone()
  }
  const busy = act.busy === `ap${r.id_request}`
  return (
    <div className="ap">
      <UsrExpiry value={v} onChange={setV} label="Vigencia del permiso" maxDays={30} error={act.errs.expires_at} />
      <div>
        <label className="lab2" htmlFor={`n${r.id_request}`}>Nota de revisión (opcional)</label>
        <textarea id={`n${r.id_request}`} className="inp" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
      </div>
      <div className="acts" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn out" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn pri" aria-disabled={busy || !isFutureLima(v)} onClick={() => { if (!busy && isFutureLima(v)) void go() }}>{busy ? <Spin /> : I(Check, 16)}Confirmar aprobación</button>
      </div>
      <Why>{first} podrá usar {area} hasta esa fecha.</Why>
    </div>
  )
}
