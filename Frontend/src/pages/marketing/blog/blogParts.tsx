import type { ReactNode } from "react"
import { CircleAlert as CircleAlertIcon, type LucideIcon } from "lucide-react"
import { ST, type Estado } from "./blogCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

export const Chip = ({ e }: { e: Estado }) => { const x = ST[e]; return <span className={`st ${x[2]}`}>{I(x[1], 14)}{x[0]}</span> }

export const Msg = ({ tone = "", icon, id, children }: { tone?: "" | "bad" | "warn" | "ok"; icon: LucideIcon; id?: string; children: ReactNode }) => (
  <p className={`msg ${tone}`} id={id}>{I(icon, 16)}<span>{children}</span></p>
)

export function Field({ id, label, count, error, children }: { id: string; label: string; count?: { t: string; bad?: boolean }; error?: string; children: ReactNode }) {
  return (
    <div className="f">
      <div className="lb"><label htmlFor={id}>{label}</label>{count && <span className={`cnt${count.bad ? " bad" : ""}`}>{count.t}</span>}</div>
      {children}
      {error && <Msg tone="bad" icon={CircleAlertIcon} id={`${id}-e`}>{error}</Msg>}
    </div>
  )
}
