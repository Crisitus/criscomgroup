/** Etiquetas y reglas de la pantalla Cuenta maestra (contrato: odd/tasks/admin-usuarios-auditoria.md). */
export const AREAS: Record<string, string> = {
  ventas: "Ventas", inventario: "Inventario", compras: "Compras y proveedores", cotizaciones: "Cotizaciones",
  servicio_tecnico: "Servicio técnico", marketing: "Marketing", auditoria: "Auditoría", empresa_sunat: "Empresa y SUNAT", pagos_pos: "Pagos y POS",
}
export const ROLES: Record<number, string> = { 1: "Cuenta maestra", 2: "Administrador", 3: "Vendedor", 4: "Cliente", 5: "Auditor temporal", 6: "Técnico" }
export const areaLabel = (a: string) => AREAS[a] || a

export const REQS = ["12 o más caracteres", "Una mayúscula", "Un número", "Un símbolo", "Distinta de la actual"]
export const NOPW = "Cambia tu nombre o escribe una nueva contraseña; siempre pide la actual."
export const LIMIT_MSG = "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."
export const OK_NAME = "Cuenta maestra actualizada"
export const OK_PASS = "Contraseña actualizada. Inicia sesión de nuevo."
export const LOGOUT_CONS = "Al cambiar la contraseña se cerrará tu sesión aquí y en todos los demás dispositivos. Tendrás que iniciar sesión de nuevo con la nueva contraseña."

/** Requisitos en vivo de la nueva contraseña (el servidor es quien manda). */
export const reqFlags = (nw: string, cur: string): boolean[] => [
  nw.length >= 12, /[A-ZÁÉÍÓÚÑ]/.test(nw), /\d/.test(nw), /[^A-Za-z0-9À-ÿ\s]/.test(nw), nw.length > 0 && nw !== cur,
]

export const revokeText = (area: string, who: string) =>
  `Revocar el permiso de ${area} a ${who}. Dejará de tener acceso a esa área en su siguiente acción. Para volver a tenerlo tendrá que solicitarlo y tú aprobarlo de nuevo. Es definitivo.`

const LIMA = "America/Lima"
const partsLima = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: LIMA, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]))
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: p.minute as string }
}
/** dd/mm/aaaa h:mm a. m. (hora de Lima, sin segundos). */
export const fmtLima = (iso: string) => {
  const t = partsLima(new Date(iso))
  return `${String(t.d).padStart(2, "0")}/${String(t.mo).padStart(2, "0")}/${t.y} ${t.h % 12 || 12}:${t.mi} ${t.h < 12 ? "a. m." : "p. m."}`
}

export type Vig = { t: string; c: "ok" | "warn" | "bad" | "neu"; i: "clock" | "alert" }
/** Vigencia relativa derivada de expires_at (null = permiso heredado sin tope). */
export const vigencia = (iso: string | null, now = new Date()): Vig => {
  if (!iso) return { t: "Sin vencimiento", c: "warn", i: "alert" }
  const e = new Date(iso)
  const hrs = (e.getTime() - now.getTime()) / 36e5
  if (hrs < 0) return { t: "Vencido", c: "bad", i: "clock" }
  const a = partsLima(e), b = partsLima(now)
  const dd = Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / 864e5)
  if (dd <= 0) return { t: "Vence hoy", c: "warn", i: "clock" }
  if (dd === 1) return { t: "Vence mañana", c: hrs < 24 ? "warn" : "neu", i: "clock" }
  return { t: `Vence en ${dd} días`, c: "neu", i: "clock" }
}

/** El que vence antes primero; sin vencimiento al final. */
export const byExpiry = <T extends { expires_at: string | null }>(l: T[]): T[] =>
  [...l].sort((a, b) => (a.expires_at ? new Date(a.expires_at).getTime() : Infinity) - (b.expires_at ? new Date(b.expires_at).getTime() : Infinity))

/** Login del ERP (Vite base /erp/). */
export const LOGIN_URL = `${import.meta.env.BASE_URL}login`

export const whoOf = (g: { user: { name: string } | null; user_id: number }) => g.user?.name ?? `Usuario ${g.user_id}`
