import { useState } from "react"
import { CircleAlert, CircleCheck, FlaskConical } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { testCampaign, type CommunityCampaign } from "../../../services/communityService"
import { Btn } from "./Btn"
import { I, errMsg, errStatus, modeText } from "./comShared"

const myEmail = () => { try { return String((JSON.parse(localStorage.getItem("user") || "{}") as { email?: string }).email || "") } catch { return "" } }

export function TestDialog({ c, mode, onClose, onSend }: { c: CommunityCampaign; mode: string; onClose: () => void; onSend: (c: CommunityCampaign) => void }) {
  const mine = myEmail()
  const [to, setTo] = useState(mine)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [done, setDone] = useState<{ destinatario: string; modo: string } | null>(null)
  const run = async () => {
    setBusy(true); setErr("")
    try {
      const r = await testCampaign(c.id_campaign, to.trim() && to.trim() !== mine ? to.trim() : undefined)
      setDone({ destinatario: r.destinatario, modo: r.modo })
    } catch (e) {
      setErr(errStatus(e) === 403 ? "Ese correo no está autorizado para pruebas (403). Usa el tuyo o uno de los autorizados en COMMUNITY_TEST_EMAILS." : errMsg(e, "No se pudo enviar la prueba"))
    } finally { setBusy(false) }
  }
  const kv = <dl className="kv"><dt>Asunto</dt><dd>[PRUEBA] {c.asunto}</dd><dt>Modo</dt><dd>{modeText(done ? done.modo : mode)}</dd></dl>
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title={done ? "Prueba enviada" : "Enviar prueba"} icon={I(done ? CircleCheck : FlaskConical, 22)}>
      <div className="pg-com dlgw">
        <div className="dlgbody">
          {done ? (
            <div className="ban ok" role="status">{I(CircleCheck, 18)}<div><b>Prueba enviada a {done.destinatario}</b>{done.modo === "live" ? "." : " (simulada: no salió del servidor)."}</div></div>
          ) : (
            <>
              <p className="sub">Se envía <b>un solo correo</b> a la dirección de abajo. No llega a ningún miembro.</p>
              <div><label className="lb" htmlFor="com-to">Enviar a</label>
                <input className={`in${err ? " er" : ""}`} id="com-to" type="email" value={to} onChange={e => { setTo(e.target.value); setErr("") }} style={{ marginTop: 6 }} aria-invalid={!!err || undefined} /></div>
              <span className="sub">Por defecto, tu correo de administrador. Otro correo solo si está autorizado.</span>
              {err && <div className="ban bad" role="alert">{I(CircleAlert, 18)}<div>{err}</div></div>}
            </>
          )}
          {kv}
        </div>
        <div className="acts">
          {done ? (<><Btn cls="out" onClick={onClose}>Cerrar</Btn><Btn onClick={() => { onClose(); onSend(c) }}>Ir a Enviar…</Btn></>)
            : (<><Btn cls="out" onClick={onClose} busy={busy}>Cancelar</Btn><Btn icon={FlaskConical} onClick={() => void run()} busy={busy}>{busy ? "Enviando…" : "Enviar prueba"}</Btn></>)}
        </div>
      </div>
    </ErpDialog>
  )
}
