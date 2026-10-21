import type { User } from "../../../services/userService"

export const ROLE: Record<number, string> = {
  1: "Gerente · cuenta maestra", 2: "Administrador", 3: "Vendedor", 4: "Cliente", 5: "Auditor temporal", 6: "Técnico",
}
export const SELLER: Record<string, string> = { fisico: "Físico", virtual: "Virtual", afiliado: "Afiliado" }
export const AREAS: Record<string, string> = {
  ventas: "Ventas", inventario: "Inventario", compras: "Compras y proveedores", cotizaciones: "Cotizaciones",
  servicio_tecnico: "Servicio técnico", marketing: "Marketing", auditoria: "Auditoría", empresa_sunat: "Empresa y SUNAT", pagos_pos: "Pagos y POS",
}
export const LIMITE = 25
export type Tono = "nu" | "ok" | "wn" | "er"
export type Tab = "usuarios" | "solicitudes" | "afiliados"

/** Lectura legible de un permiso o rol; nunca devuelve vacío. */
export const roleName = (u: Pick<User, "id_role" | "tipo_vendedor">) =>
  u.id_role === 3 && u.tipo_vendedor ? `Vendedor · ${SELLER[u.tipo_vendedor] ?? u.tipo_vendedor}` : ROLE[u.id_role] ?? "Sin rol"

export const httpStatus = (e: unknown): number => (e as { response?: { status?: number } })?.response?.status ?? 0
export const serverMsg = (e: unknown, fallback = "No se pudo completar la operación"): string => {
  const d = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
  return d?.message || d?.error || fallback
}
export const fieldErrors = (e: unknown): Record<string, string> =>
  ((e as { response?: { data?: { errores?: Record<string, string> } } })?.response?.data?.errores) ?? {}

/* ---------- Fechas en hora de Lima (UTC-5, sin horario de verano) ---------- */
const TZ = "America/Lima"
export const limaParts = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a }, {})
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}
export const limaISO = (date: string, time: string) => `${date}T${time}:00-05:00`
export const inDays = (n: number) => { const p = limaParts(new Date(Date.now() + n * 864e5)); return limaISO(p.date, p.time) }
export const toDate = (v?: string | null): Date | null => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
const WALL = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
const dmy = (y: string, m: string, d: string) => `${d}/${m}/${y}`
const hm = (h: number, mi: string) => `${h % 12 || 12}:${mi} ${h < 12 ? "a. m." : "p. m."}`
/** Fecha y hora dd/mm/aaaa h:mm a. m. en Lima. Texto de pared sin zona se muestra tal cual. */
export const fmtDT = (v?: string | null): string => {
  if (!v) return "—"
  const w = WALL.exec(v)
  if (w) return `${dmy(w[1], w[2], w[3])} ${hm(Number(w[4]), w[5])}`
  const d = toDate(v)
  if (!d) return "—"
  const p = limaParts(d)
  return `${dmy(p.date.slice(0, 4), p.date.slice(5, 7), p.date.slice(8, 10))} ${hm(Number(p.time.slice(0, 2)), p.time.slice(3))}`
}
export const fmtD = (v?: string | null): string => {
  if (!v) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  return m ? dmy(m[1], m[2], m[3]) : fmtDT(v).split(" ")[0]
}
/** «Vence el dd/mm/aaaa a las h:mm a. m. (hora de Lima)». */
export const venceFrase = (iso?: string | null) => {
  const t = fmtDT(iso)
  return iso && t !== "—" ? `Vence el ${t.replace(" ", " a las ")} (hora de Lima)` : "Elige una fecha y hora"
}
export const isFutureLima = (iso?: string | null) => { const d = toDate(iso); return !!d && d.getTime() > Date.now() }
export const moneda = (v: string | number | null | undefined) => `S/ ${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ---------- Política de contraseña (8-72, mayúscula, número, símbolo) ---------- */
export const pwChecks = (p: string) => [
  { ok: p.length >= 8 && p.length <= 72, x: "De 8 a 72 caracteres" },
  { ok: /[A-Z]/.test(p), x: "Una mayúscula" },
  { ok: /[0-9]/.test(p), x: "Un número" },
  { ok: /[^A-Za-z0-9]/.test(p), x: "Un símbolo" },
]
export const pwValid = (p: string) => pwChecks(p).every(c => c.ok)
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

/** La prueba gratuita se compara por día (el servidor la manda como hora de pared de Lima, a veces con «Z»). */
export const enPrueba = (fin?: string | null) => !!fin && fin.slice(0, 10) >= limaParts(new Date()).date

/** Milisegundos de un texto de fecha: hora de pared sin zona se lee como hora de Lima; con zona se respeta. */
export const limaMs = (v?: string | null): number => {
  if (!v) return NaN
  const w = WALL.exec(v)
  return w ? Date.parse(`${w[1]}-${w[2]}-${w[3]}T${w[4]}:${w[5]}:${w[6] ?? "00"}-05:00`) : Date.parse(v)
}

/** Vigencia visible en la fila cuando aplica (auditor o administrador elevado). */
export function vigencia(u: User): string {
  if (u.activo === false) return ""
  if (u.id_role === 5 && u.acceso_expira_en) return `${u.acceso_vencido ? "Venció" : "Vence"} el ${fmtDT(u.acceso_expira_en)}`
  if (u.id_role === 2 && u.superusuario_temporal && u.superusuario_expira_en) return `${u.superusuario_vigente ? "Elevada hasta" : "Elevación venció"} ${fmtDT(u.superusuario_expira_en)}`
  return ""
}
