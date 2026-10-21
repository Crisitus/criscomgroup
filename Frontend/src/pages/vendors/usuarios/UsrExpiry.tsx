import { useId, useState } from "react"
import { inDays, limaISO, limaParts, toDate, venceFrase } from "./usrCommon"
import { Seg } from "./UsrParts"

type Mode = "1" | "7" | "30" | "exacta"
const OPTS = [{ v: "1" as Mode, x: "1 día" }, { v: "7" as Mode, x: "7 días" }, { v: "30" as Mode, x: "30 días" }, { v: "exacta" as Mode, x: "Fecha y hora exactas" }]

/** Vigencia en hora de Lima: 1 / 7 / 30 días o fecha y hora exactas. value = ISO con -05:00. */
export function UsrExpiry({ value, onChange, label = "Vigencia", error, maxDays, presets = true }: {
  value: string; onChange: (iso: string) => void; label?: string; error?: string; maxDays?: number; presets?: boolean }) {
  const id = useId()
  const [mode, setMode] = useState<Mode>("exacta")
  const d = toDate(value)
  const p = d ? limaParts(d) : { date: "", time: "" }
  const pick = (m: Mode) => { setMode(m); if (m !== "exacta") onChange(inDays(Number(m))) }
  const exact = (date: string, time: string) => onChange(date && time ? limaISO(date, time) : "")
  const tope = maxDays ? limaParts(new Date(Date.now() + maxDays * 864e5)) : null

  return (
    <div className="rg">
      <span className="lab2" id={`${id}-l`}>{label}</span>
      {presets && <Seg label={label} value={mode === "exacta" && !value ? "" : mode} opts={OPTS} onPick={pick} />}
      {(mode === "exacta" || !presets) && (
        <div className="fg">
          <div>
            <label className="lab2" htmlFor={`${id}-d`}>Fecha</label>
            <input id={`${id}-d`} className={`inp${error ? " bad" : ""}`} type="date" value={p.date} max={tope?.date} onChange={e => exact(e.target.value, p.time || "23:59")} />
          </div>
          <div>
            <label className="lab2" htmlFor={`${id}-t`}>Hora (Lima)</label>
            <input id={`${id}-t`} className={`inp${error ? " bad" : ""}`} type="time" value={p.time} onChange={e => exact(p.date || limaParts(new Date()).date, e.target.value)} />
          </div>
        </div>
      )}
      <p className="hint" aria-live="polite"><b>{venceFrase(value)}</b></p>
      {tope && <p className="hint">Máximo {maxDays} días: hasta el {tope.date.split("-").reverse().join("/")} (hora de Lima).</p>}
      {error && <p className="fe" role="alert"><span>{error}</span></p>}
    </div>
  )
}
