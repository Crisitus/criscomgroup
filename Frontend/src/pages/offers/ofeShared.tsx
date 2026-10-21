import type { LucideIcon } from "lucide-react"
import { CircleHelp, TriangleAlert } from "lucide-react"
import { SEP, mg, mgs, money } from "./ofeCalc"

export const I = (Icon: LucideIcon, size = 18) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden />

export type Tone = "ok" | "warn" | "bad" | "neu" | "on"
export const Chip = ({ k, icon, t }: { k: Tone; icon: LucideIcon; t: string }) => (
  <span className={`st ${k}`}>{I(icon, 14)}{t}</span>
)

/** Margen sobre el costo promedio neto: siempre palabra + icono cuando hay una alerta. */
export function MgCell({ price, cost, pre }: { price: number; cost: number | null; pre?: string }) {
  if (cost === null) return <div className="stk rt"><span className="sub">—</span></div>
  if (!(cost > 0)) return <div className="stk rt"><Chip k="neu" icon={CircleHelp} t="Sin costo" /></div>
  const m = mg(price, cost)
  if (m === null) return <div className="stk rt"><span className="sub">—</span></div>
  if (m < 0) {
    return (
      <div className="stk rt">
        <Chip k="bad" icon={TriangleAlert} t="Bajo el costo" />
        <span className="sub num">{pre ? `${pre}${SEP}` : ""}{mgs(m)}</span>
      </div>
    )
  }
  return (
    <div className="stk rt">
      <span className="a num">{mgs(m)}</span>
      <span className="sub num">{pre || `Costo ${money(cost)}`}</span>
    </div>
  )
}
