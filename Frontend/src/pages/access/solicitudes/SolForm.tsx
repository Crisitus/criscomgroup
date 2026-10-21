import { useState } from "react"
import { CircleAlert, CircleCheck, Clock, Info, Lock, RefreshCw, Send } from "lucide-react"
import { solArea } from "./solCommon"
import { SolAlert, SolSkeleton } from "./SolEstados"
import type { BlockStatus, SolOutcome } from "./useSolAccess"

const I = (Icon: typeof Info, size = 16) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />

/** Solicitar otra área (POST /access/request): motivo 5-500 con contador; el botón explica por qué no se puede. */
export function SolForm({ status, areas, onSubmit }: {
  status: BlockStatus; areas: string[]
  onSubmit: (area: string, reason: string) => Promise<SolOutcome>
}) {
  const [area, setArea] = useState("")
  const [reason, setReason] = useState("")
  const [err, setErr] = useState("")
  const [blocked, setBlocked] = useState("")
  const [notice, setNotice] = useState<{ created: boolean; area: string } | null>(null)
  const [sending, setSending] = useState(false)

  if (status === "load") {
    return <section className="card" aria-labelledby="h-form"><div className="cp"><div className="ch1"><h2 id="h-form">Solicitar otra área</h2></div><SolSkeleton shapes={["h", "t", "h"]} /></div></section>
  }

  const dead = status === "err" || Boolean(blocked)
  const n = reason.trim().length
  let why = ""
  if (status === "err") why = "No pudimos cargar las áreas: reintenta cargar tus permisos para poder solicitar."
  else if (blocked) why = "Tu tipo de cuenta no puede solicitar áreas del ERP."
  else if (!area) why = "Elige el área que necesitas."
  else if (n < 5) why = "Explica la tarea concreta (mínimo 5 caracteres)."
  else if (n > 500) why = "El motivo no puede pasar de 500 caracteres."
  const canSend = !why && !sending

  const submit = async () => {
    if (!canSend) return
    setSending(true); setErr(""); setNotice(null)
    const r = await onSubmit(area, reason.trim())
    setSending(false)
    if (r.ok) { setNotice({ created: Boolean(r.created), area: solArea(area) }); setReason(""); return }
    if (r.status === 403) { setBlocked(r.message); return }
    if (r.fields.reason) setErr(r.fields.reason)
    else if (r.fields.area) setErr(r.fields.area)
    else setErr(r.message)
  }

  return (
    <section className="card" aria-labelledby="h-form">
      <form className="cp frm" noValidate onSubmit={e => { e.preventDefault(); void submit() }}>
        <div className="ch1" style={{ margin: 0 }}><h2 id="h-form">Solicitar otra área</h2></div>
        {err && <SolAlert tone="bad" icon={I(CircleAlert)} title="Revisa 1 campo antes de enviar." extra={<ul><li>{err}</li></ul>} />}
        {blocked && (
          <SolAlert tone="bad" icon={I(Lock)} title="No tienes permiso para pedir áreas (403).">
            Las cuentas de cliente de la tienda no piden acceso al ERP. Si necesitas un acceso, habla con la cuenta maestra.
          </SolAlert>
        )}
        <label className="fld">
          <span className="l">Área <i aria-hidden="true">*</i></span>
          <select className="sl" value={area} disabled={dead} aria-describedby="sol-nota" onChange={e => setArea(e.target.value)}>
            <option value="">Elige un área</option>
            {areas.map(a => <option key={a} value={a}>{solArea(a)}</option>)}
          </select>
          <span className="hint" id="sol-nota">{I(Clock)}<span>Todo permiso caduca (máx 30 días) · Importaciones nunca se delega</span></span>
        </label>
        <label className="fld">
          <span className="l">Motivo <i aria-hidden="true">*</i></span>
          <textarea className="ta" value={reason} disabled={dead} aria-invalid={Boolean(err)}
            aria-describedby="sol-cnt" onChange={e => { setReason(e.target.value); setErr("") }} />
          <span className="cnt" id="sol-cnt">
            <span>Mínimo 5 caracteres</span>
            <span className={`c num${n > 500 ? " bad" : ""}`} aria-live="polite">{n}/500</span>
          </span>
        </label>
        <div className="ft2">
          {why ? <span className="why" id="sol-why">{I(Info)}<span>{why}</span></span> : <span />}
          <button className="btn" type="submit" aria-disabled={!canSend || undefined} aria-describedby={why ? "sol-why" : undefined}>
            {I(Send)}Enviar solicitud
          </button>
        </div>
        {notice && (
          <SolAlert tone="ok" icon={I(notice.created ? CircleCheck : RefreshCw)} title={notice.created ? "Solicitud enviada." : "Solicitud actualizada."}>
            {notice.created
              ? `${notice.area} queda Pendiente: la cuenta maestra la verá en su bandeja.`
              : `Ya tenías una pendiente de ${notice.area}: reemplazamos su motivo y no se creó otra.`}
          </SolAlert>
        )}
      </form>
    </section>
  )
}
