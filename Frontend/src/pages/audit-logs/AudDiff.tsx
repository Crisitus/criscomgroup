import { CircleMinus, CirclePlus, Clock, Info, Lock, Minus } from "lucide-react"
import type { AuditChange } from "../../services/auditLogService"
import { OCULTO, campoLabel, esSecreto } from "./audCommon"
import { I } from "./audParts"
import { AudValue } from "./AudValue"

const num = (v: unknown) => v !== null && v !== "" && typeof v !== "boolean" && !Number.isNaN(Number(v))

function Fila({ c }: { c: AuditChange }) {
  const sens = c.sensible || esSecreto(c.campo, c.antes) || esSecreto(c.campo, c.despues)
  const igual = !sens && num(c.antes) && num(c.despues) && String(c.antes) !== String(c.despues) && Number(c.antes) === Number(c.despues)
  const utc = [c.antes, c.despues].some(v => typeof v === "string" && /\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v))
  const oculto = <><span className="sens">{I(Lock, 14)}{OCULTO}</span> <span className="sub">Valor sensible redactado</span></>
  return (
    <li className="df">
      <div className="dfh"><b>{campoLabel(c.campo)}</b><code>{c.campo}</code></div>
      {c.antes === null && !sens
        ? <div className="dv z"><span className="w">{I(Minus, 14)}Antes</span><span className="v"><i>(sin valor)</i></span></div>
        : <div className="dv b"><span className="w">{I(CircleMinus, 14)}Antes</span><span className="v">{sens ? oculto : <AudValue v={c.antes} />}</span></div>}
      <div className="dv n"><span className="w">{I(CirclePlus, 14)}Después</span><span className="v">{sens ? oculto : <AudValue v={c.despues} />}</span></div>
      {igual && <p className="nf">{I(Info, 14)}Mismo valor, distinto formato</p>}
      {utc && <p className="nf">{I(Clock, 14)}Hora tal como se guardó (UTC)</p>}
    </li>
  )
}

/** Diff antes -> despues: solo los campos que cambian; los secretos nunca se muestran. */
export function AudDiff({ cambios }: { cambios: AuditChange[] }) {
  return <ul className="dfl">{cambios.map(c => <Fila key={c.campo} c={c} />)}</ul>
}
