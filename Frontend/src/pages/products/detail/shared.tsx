import type { LucideIcon } from "lucide-react"
import { longDate } from "../../../components/erp/format"

export const DOT = "\u00b7"
export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const MINUS = "\u2212"
export const ARROW = "\u2192"
export const LQ = "\u00ab"
export const RQ = "\u00bb"
/** `\u00abTexto\u00bb` */
export const Q = (s: string) => `${LQ}${s}${RQ}`
export const IGV = 1.18

export const I = (Icon: LucideIcon, size = 16, cls = "") => (
  <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
)

export const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || fallback

const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const n2 = (v: number) => nf.format(v)
export const net = (withIgv: number) => withIgv / IGV
export const r2 = (n: number) => Math.round(n * 100 + 1e-6) / 100

/** `2026-10-10 13:41:05` (ya en hora de Lima) -> `10/10/2026` */
export const fd = (ts?: string | null) => (ts ? longDate(ts.slice(0, 10)) : DASH)
/** `2026-10-10 13:41:05` -> `1:41 p. m.` */
export const ftime = (ts?: string | null) => {
  if (!ts || ts.length < 16) return ""
  const h = Number(ts.slice(11, 13))
  return `${h % 12 || 12}:${ts.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}`
}
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** Entero no negativo en texto; NaN si no lo es. */
export const intOf = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : Number.NaN)
export const moneyOf = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(",", ".")))
