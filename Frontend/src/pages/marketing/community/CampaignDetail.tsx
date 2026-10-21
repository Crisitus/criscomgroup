import { useEffect, useState } from "react"
import { CircleCheck, CircleX, Info } from "lucide-react"
import { getCampaignStatus, type CampaignStatus, type CommunityCampaign } from "../../../services/communityService"
import { I, errMsg, pending } from "./comShared"

export function CampaignDetail({ c, tick }: { c: CommunityCampaign; tick: string }) {
  const [st, setSt] = useState<CampaignStatus | null>(null)
  const [err, setErr] = useState("")
  useEffect(() => {
    let off = false
    getCampaignStatus(c.id_campaign).then(s => { if (!off) { setSt(s); setErr("") } }).catch(e => { if (!off) setErr(errMsg(e, "No se pudo leer el detalle")) })
    return () => { off = true }
  }, [c.id_campaign, tick])
  const d = st || c
  const pct = d.destinatarios ? Math.round(((d.enviados + d.fallidos) / d.destinatarios) * 100) : 0
  const mode = st?.mail_mode || c.modo_envio
  return (
    <div className="dt">
      <div className="sum num">
        <span><b>{d.enviados}</b> de <b>{d.destinatarios}</b> enviados</span>
        <span><b>{d.fallidos}</b> fallidos</span>
        <span><b>{pending(d)}</b> pendientes</span>
        <span><b>{pct} %</b></span>
        {mode && <span>Modo <b>{mode}</b>{mode === "dry" ? " (simulado)" : ""}</span>}
      </div>
      {err && <div className="ban bad" role="alert">{I(CircleX, 18)}<div>{err}</div></div>}
      {d.fallidos > 0 ? (
        <>
          <div className="fl" role="list" aria-label="Fallos">
            <div className="fr sub" style={{ minHeight: 28 }}><span>Correo</span><span>Error</span></div>
            {(st?.fallos || []).map(f => (
              <div className="fr" role="listitem" key={f.subscriber_id}><span>{I(CircleX, 14)}<b>{f.email}</b></span><span className="mut">{f.error || "Sin detalle"}</span></div>
            ))}
            {st && st.fallos.length < d.fallidos && <div className="fr sub"><span>Se muestran los primeros {st.fallos.length} de {d.fallidos}.</span></div>}
          </div>
          <div className="ban warn">{I(Info, 18)}<div>Reintentar repite <b>solo los {d.fallidos} fallidos</b>; los {d.enviados} ya enviados nunca se duplican. Al reintentar, esta lista se borra.</div></div>
        </>
      ) : (
        <div className="ban ok">{I(CircleCheck, 18)}<div><b>Todos los correos se entregaron{mode === "dry" ? " (simulado)" : ""}.</b> Solo lectura: esta campaña no se edita ni se elimina.</div></div>
      )}
    </div>
  )
}
