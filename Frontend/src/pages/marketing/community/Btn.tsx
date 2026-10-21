import type { LucideIcon } from "lucide-react"
import { I } from "./comShared"

/** Botón del diseño. Con `why` queda aria-disabled y apunta al motivo escrito (no se oculta). */
export function Btn({ cls = "", icon, children, onClick, why, busy, type = "button" }: {
  cls?: string; icon?: LucideIcon; children: React.ReactNode; onClick?: () => void; why?: string; busy?: boolean; type?: "button" | "submit"
}) {
  const off = !!why || !!busy
  return (
    <button type={type} className={`btn${cls ? ` ${cls}` : ""}`} aria-disabled={off || undefined} aria-describedby={why} onClick={() => { if (!off) onClick?.() }}>
      {icon && I(icon, 16)}{children}
    </button>
  )
}
