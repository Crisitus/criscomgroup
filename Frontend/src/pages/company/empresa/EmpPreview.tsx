import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, CircleMinus } from "lucide-react"
import { durLabel, h12, isHHmm, toMin } from "./empFormat"
import { EmpCard, ic } from "./empParts"
import type { HzDraft } from "./useEmpHorario"

/** Previsualizacion de la jornada: barra de 24 h con la franja permitida y la hora de Lima del servidor. */
export function EmpPreview({ d, ahora, dirty }: { d: HzDraft; ahora: string; dirty: boolean }) {
  const valid = isHHmm(d.ini) && isHHmm(d.fin) && d.ini !== d.fin
  const now = toMin(ahora)
  const a = valid ? toMin(d.ini) : 0
  const b = valid ? toMin(d.fin) : 0
  const noc = valid && a > b
  const inside = d.on && valid && (noc ? now >= a || now < b : now >= a && now < b)
  const pc = (m: number) => `${(m / 14.4).toFixed(2)}%`

  let big: ReactNode
  let cl: string
  if (!valid) { big = <>{ic(CircleAlert, 22)}No se puede previsualizar</>; cl = "bad" }
  else if (!d.on) { big = <>{ic(CircleMinus, 22)}Sin restricción</>; cl = "neu" }
  else if (inside) { big = <>{ic(CircleCheck, 22)}Dentro del horario</>; cl = "ok" }
  else { big = <>{ic(CircleAlert, 22)}Fuera del horario</>; cl = "bad" }

  const right = now / 14.4 > 55
  const fills = d.on && valid
    ? (noc ? [{ left: pc(a), right: "0" }, { left: "0", width: pc(b) }] : [{ left: pc(a), width: `${((b - a) / 14.4).toFixed(2)}%` }])
    : []
  const ticks = ["00", "06", "12", "18", "24"]

  return (
    <EmpCard sec="prev" title="Previsualización de la jornada" help="Hora de Lima según el servidor.">
      <div className="pv">
        <div className="top">
          <div className={`big ${cl}`}>{big}</div>
          {dirty && <span className="tag">Vista previa — sin guardar</span>}
        </div>
        <div className="bw" role="img" aria-label={`Barra de 24 horas con la franja permitida y la hora actual de Lima, ${h12(ahora)}`}>
          <span className="nwl" style={{ left: pc(now), ...(right ? { transform: "translateX(-100%)", marginLeft: -10 } : { marginLeft: 10 }) }}>Ahora {h12(ahora)} · Lima</span>
          <div className={`trk${!d.on || !valid ? " off" : ""}`}>{fills.map((f, i) => <i key={i} style={f} />)}</div>
          <span className="nw" style={{ left: pc(now) }} />
          <div className="tk" aria-hidden="true">{ticks.map((t, i) => <span key={t} style={{ left: `${i * 25}%` }}>{t}</span>)}</div>
        </div>
        <div className="pvf">
          {!valid ? <span>Elige un inicio y un cierre distintos para ver la jornada.</span>
            : !d.on ? <span>Los vendedores físicos operan a cualquier hora.</span>
            : noc ? <span>Permitido <b>{d.ini} – 24:00</b> y <b>00:00 – {d.fin}</b> · cruza la medianoche · {durLabel(d.ini, d.fin)}</span>
            : <span>Permitido <b>{d.ini} – {d.fin}</b> ({h12(d.ini)} – {h12(d.fin)}) · {durLabel(d.ini, d.fin)}</span>}
          {d.on && valid && !inside && <span>Los vendedores físicos podrán operar desde las <b>{h12(d.ini)}</b>{now > a ? " de mañana" : ""}.</span>}
        </div>
      </div>
    </EmpCard>
  )
}
