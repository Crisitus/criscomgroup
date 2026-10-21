import { AlarmClock, CalendarClock, CircleCheck, CircleX, Clock, type LucideIcon } from "lucide-react"
import { areaLabel, fmtLima, ROLES } from "../maestra/maeCommon"

export type SolStatus = "pending" | "approved" | "rejected"

export interface SolGrant { id_grant: number; area: string; expires_at: string | null }
export interface SolMine {
  id_request: number; area: string; reason: string; status: string
  created_at: string; expires_at: string | null
}
export interface SolMy { areas: string[]; grants: SolGrant[]; requests: SolMine[] }
export interface SolPermiso { id_grant: number; estado: string; expires_at: string | null }
export interface SolRequest {
  id_request: number; user_id: number; area: string; reason: string; status: SolStatus
  created_at: string; reviewed_at: string | null; expires_at: string | null; review_note: string | null
  requester?: { id_user: number; name: string; email: string; id_role: number } | null
  permiso?: SolPermiso | null
}

/** Estado siempre icono + palabra. */
export const SOL_STATUS: Record<string, { t: string; c: "warn" | "ok" | "bad"; i: LucideIcon }> = {
  pending: { t: "Pendiente", c: "warn", i: Clock },
  approved: { t: "Aprobada", c: "ok", i: CircleCheck },
  rejected: { t: "Rechazada", c: "bad", i: CircleX },
}

export const SOL_DAYS = [1, 7, 30]
export const daysLabel = (n: number) => (n === 1 ? "1 día" : `${n} días`)

/** GET /access/my devuelve fechas de pared de Lima SIN zona: se leen como hora local del servidor. */
export const accessDate = (s: string | null | undefined): Date | null => {
  if (!s) return null
  const naive = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)
  const d = new Date(naive ? s.replace(" ", "T") : s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** dd/mm/aaaa h:mm a. m. Sin zona = hora de pared de Lima: se muestra tal cual (sin doble conversión). */
export const fmtAccess = (s: string | null | undefined): string => {
  if (!s) return "—"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (m && !/([+-]\d{2}:?\d{2}|Z)$/.test(s.trim())) {
    const h = Number(m[4])
    return `${m[3]}/${m[2]}/${m[1]} ${h % 12 || 12}:${m[5]} ${h < 12 ? "a. m." : "p. m."}`
  }
  const d = accessDate(s)
  return d ? fmtLima(d.toISOString()) : "—"
}

export interface SolVig { t: string; c: "warn" | "bad" | "neu"; i: LucideIcon }
/** Chip de vigencia: Vencido / Vence hoy / Vence mañana / Vence en N días (hora de Lima). */
export function solVigencia(expires: string | null | undefined, now = new Date()): SolVig {
  const e = accessDate(expires)
  if (!e) return { t: "Sin vencimiento", c: "neu", i: CalendarClock }
  if (e.getTime() <= now.getTime()) return { t: "Vencido", c: "bad", i: CircleX }
  const hrs = (e.getTime() - now.getTime()) / 36e5
  const dayN = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5
  const dd = Math.round(dayN(e) - dayN(now))
  if (dd <= 0) return { t: "Vence hoy", c: "warn", i: AlarmClock }
  if (dd === 1) return { t: "Vence mañana", c: hrs < 24 ? "warn" : "neu", i: hrs < 24 ? AlarmClock : CalendarClock }
  return { t: `Vence en ${dd} días`, c: "neu", i: CalendarClock }
}

/** El que vence antes primero (tolerante con fechas sin zona). */
export const solByExpiry = <T extends { expires_at: string | null }>(l: T[]): T[] =>
  [...l].sort((a, b) => (accessDate(a.expires_at)?.getTime() ?? Infinity) - (accessDate(b.expires_at)?.getTime() ?? Infinity))

export const solArea = areaLabel
export const solRole = (id: number | undefined) => (id && ROLES[id]) || "Personal"
