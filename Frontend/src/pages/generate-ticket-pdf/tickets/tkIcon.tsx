import type { LucideIcon } from "lucide-react"

/** Icono lucide con la clase `.ic` del diseno (trazo 1,75). */
export const I = (Icon: LucideIcon, size = 16, cls = "") => (
  <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
)
