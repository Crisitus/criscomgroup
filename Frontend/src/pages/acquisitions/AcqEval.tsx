import { Calculator, CircleAlert, CircleCheck, Clock, TriangleAlert } from "lucide-react"
import { Alerts, Grade, I, gl, num, type Evaluacion } from "./acqShared"

export function EvalPanel({ d, step, mob, busy, onCalc }: { d: Evaluacion | null; step: number; mob: boolean; busy: boolean; onCalc: () => void }) {
  const filled = step >= 3
  const btn = <button type="button" className={`btn out${mob ? " wide" : ""}`} aria-disabled={!filled || busy} aria-describedby={filled ? undefined : "cr-why"} onClick={() => { if (filled && !busy) onCalc() }}>{I(Calculator)}Calcular evaluación</button>
  const why = !filled && <span className="why" id="cr-why">{I(CircleAlert, 16)}<span>Registra la prueba funcional en el paso 3 para calcular.</span></span>
  if (mob) {
    const top = d
      ? <div className="top"><div className={`gb${d.grade.length > 1 ? " w" : ""}`}>{d.grade.length > 1 ? gl(d.grade).slice(0, 1) : d.grade}</div><div className="tx"><b>Evaluación técnica{" \u00b7 "}{gl(d.grade)}{" \u00b7 "}{num(d.score, 2)} / 100</b>{d.alerts.length ? <span className="st warn">{I(TriangleAlert, 14)}{d.alerts.length} alerta{d.alerts.length > 1 ? "s" : ""}</span> : <span className="st ok">{I(CircleCheck, 14)}Sin alertas</span>}</div></div>
      : <div className="top"><div className="tx"><b>Evaluación técnica</b><span className="st neu">{I(Clock, 14)}Sin calcular</span></div></div>
    return <div className="card evb" aria-live="polite">{top}{d && d.alerts.length > 0 && <Alerts d={d} />}{btn}{why}</div>
  }
  return (
    <aside className="card evp" aria-labelledby="et" aria-live="polite"><h3 id="et">Evaluación técnica</h3>
      {d
        ? <><Grade d={d} /><div><div className="sh" style={{ minHeight: 32 }}>Alertas <small>{d.alerts.length}</small></div><Alerts d={d} /></div></>
        : <div className="inl"><span className="st neu">{I(Clock, 16)}Sin calcular</span><span className="hint">{filled ? "Pulsa \u00abCalcular evaluación\u00bb para ver el grado con las métricas del paso 3." : "El grado se calcula con la prueba funcional y las métricas del paso 3."}</span></div>}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>{btn}{why}<span className="hint">Calcular no guarda el expediente. El grado es técnico, no un precio.</span></div>
    </aside>
  )
}
