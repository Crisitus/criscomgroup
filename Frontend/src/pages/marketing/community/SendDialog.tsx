import { useState } from "react"
import { CircleAlert, Send, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { sendCampaign, type CommunityCampaign } from "../../../services/communityService"
import { Btn } from "./Btn"
import { I, errMsg, modeText, type MailFlags } from "./comShared"

export function SendDialog({ c, flags, activos, onClose, onDone }: { c: CommunityCampaign; flags: MailFlags; activos: number; onClose: () => void; onDone: () => void }) {
  const live = flags.mail_mode === "live"
  const retry = c.estado !== "borrador"
  const n = retry ? c.fallidos : activos
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const ok = !live || typed.trim() === String(n)
  const run = async () => {
    setBusy(true); setErr("")
    try {
      const r = await sendCampaign(c.id_campaign)
      toast.success(`${r.message}: ${r.pendientes} destinatarios (${r.modo})`)
      onDone()
    } catch (e) { setErr(errMsg(e, "No se pudo enviar")); setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title={retry ? "Confirmar reintento" : "Confirmar envío"} tone={live ? "bad" : undefined} icon={I(Send, 22)}>
      <div className="pg-com dlgw">
        <div className="dlgbody">
          <p className="sub">{retry ? "Se reintentan solo los envíos fallidos; los ya enviados nunca se duplican. " : "Se enviará a los miembros activos que aún no recibieron esta campaña. "}Las bajas se respetan, también las que ocurran durante el envío.</p>
          {live && <div className="ban bad" role="alert">{I(TriangleAlert, 18)}<div><b>Envío real por SMTP:</b> los correos salen a {n} personas y no se pueden recuperar.</div></div>}
          <dl className="kv">
            <dt>Asunto</dt><dd>{c.asunto}</dd>
            <dt>Destinatarios</dt><dd className="num"><span style={{ fontSize: 24, lineHeight: 1.2 }}>{n}</span> <span className="sub fw6">{retry ? "fallidos por reintentar" : "activos sin entrega"}</span></dd>
            <dt>Modo</dt><dd>{modeText(flags.mail_mode)}</dd>
          </dl>
          {retry && <span className="sub">Se suman los miembros activos que no tengan entrega todavía (por ejemplo, altas nuevas).</span>}
          {live && (
            <div><label className="lb" htmlFor="com-n">Escribe {n} para confirmar</label>
              <input className="in" id="com-n" inputMode="numeric" value={typed} onChange={e => setTyped(e.target.value)} style={{ marginTop: 6, maxWidth: 160 }} aria-describedby="com-nw" autoComplete="off" /></div>
          )}
          {err && <div className="ban bad" role="alert">{I(CircleAlert, 18)}<div><b>No se pudo enviar.</b> {err}</div></div>}
        </div>
        <div className="acts">
          <Btn cls="out" onClick={onClose} busy={busy}>Cancelar</Btn>
          <Btn cls={live ? "dng" : ""} icon={Send} why={ok ? undefined : "com-nw"} busy={busy} onClick={() => void run()}>{busy ? "Enviando…" : live ? "Enviar ahora" : "Enviar ahora (simulación)"}</Btn>
          {!ok && <span className="sr" id="com-nw">Escribe {n} para habilitar el envío.</span>}
        </div>
      </div>
    </ErpDialog>
  )
}
