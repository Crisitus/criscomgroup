import type { LucideIcon } from "lucide-react"

export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const ARROW = "\u2192"
export const TIMES = "\u00d7"
export const Q = (s: string) => `\u00ab${s}\u00bb`

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={cls || undefined} size={size} strokeWidth={1.75} aria-hidden="true" />
export const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
