import { CircleAlert, CircleCheck, CircleMinus, CircleX, Eraser, ExternalLink } from "lucide-react"
import { I } from "../shared"
import { checkNet, type Net } from "./netCheck"

const STW = { ok: [CircleCheck, "Válido"], bad: [CircleX, "Inválido"], empty: [CircleMinus, "Vacía · no sale en la web"] } as const

export function NetRow({ n, value, disabled, onChange }: { n: Net; value: string; disabled: boolean; onChange: (v: string) => void }) {
  const c = checkNet(n, value)
  const [W, label] = STW[c.s]
  const wa = n.k === "whatsapp_number"
  const href = c.s === "ok" ? (wa ? `https://wa.me/${c.v}` : c.v) : ""
  const mid = `m-${n.k}`
  return (
    <div className="nr">
      <div className="t">
        <label htmlFor={`in-${n.k}`}>{I(n.icon, 20)}{n.n}</label>
        <span className={`st ${c.s === "empty" ? "neu" : c.s}`}>{I(W, 16)}{label}</span>
      </div>
      <div className="l">
        <input className={`in${c.s === "bad" ? " bad" : ""}`} id={`in-${n.k}`} type="text" inputMode={wa ? "numeric" : "url"} autoComplete="off"
          value={value} placeholder={n.ph} disabled={disabled} onChange={e => onChange(e.target.value)}
          aria-invalid={c.s === "bad" || undefined} aria-describedby={c.s === "bad" || c.note ? mid : undefined} />
        {c.s === "ok" && <a className="btn out" href={href} target="_blank" rel="noopener noreferrer">{I(ExternalLink, 16)}Abrir</a>}
        {c.s === "bad" && <span className="btn out" role="link" aria-disabled="true">{I(ExternalLink, 16)}Abrir</span>}
        {c.s !== "empty" && <button type="button" className="btn out" disabled={disabled} onClick={() => onChange("")} aria-label={`Vaciar ${n.n}`}>{I(Eraser, 16)}Vaciar</button>}
      </div>
      {c.s === "bad" && <div className="msg st bad" role="alert" id={mid}>{I(CircleAlert, 16)}<span>{c.m}</span></div>}
      {c.s === "ok" && c.note && <div className="msg st ok" id={mid}>{I(CircleCheck, 16)}<span>{c.note}</span></div>}
    </div>
  )
}
