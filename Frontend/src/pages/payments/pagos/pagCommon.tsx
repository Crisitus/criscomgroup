import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CircleDot } from "lucide-react"
import { ST } from "./pagData"

export const I = (Icon: LucideIcon, size = 16, cls = "") => (
  <Icon className={`pa-ic${cls ? ` pa-${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
)

export function Stat({ k, text, size = 14 }: { k: string; text?: string; size?: number }) {
  const [tone, Icon, word] = ST[k] ?? ["neu", CircleDot, k]
  return <span className={`pa-st pa-${tone}`}>{I(Icon, size)}{text ?? word}</span>
}

/* ---------- Botón: deshabilitado = aria-disabled + motivo escrito ---------- */
export function Btn({ children, out, dis, by, busy, onClick, icon, od }: {
  children: ReactNode; out?: boolean; dis?: boolean; by?: string; busy?: boolean; onClick?: () => void; icon?: ReactNode; od?: string
}) {
  const off = Boolean(dis || busy)
  return (
    <button type="button" className={`pa-btn${out ? " pa-out" : ""}`} aria-disabled={off || undefined} aria-describedby={dis ? by : undefined} aria-busy={busy || undefined}
      data-od={od} onClick={() => { if (!off) onClick?.() }}>{icon}{children}</button>
  )
}

