import type { LucideIcon } from "lucide-react"
import { CircleCheck, CircleDashed, CircleDot, CircleX, Clock, Power } from "lucide-react"

export { money } from "../../../components/erp/format"

export const NB = "\u00a0"
export const SEP = " · "
export const DASH = "—"
export const ELL = "…"
export const Q = (s: string) => `«${s}»`

/* ---------- Fechas (hora de Lima) ---------- */
const hm = (h: number, m: string) => `${h % 12 || 12}:${m}${NB}${h < 12 ? "a." : "p."}${NB}m.`
const LIMA = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })

/** `dd/mm/aaaa h:mm a. m.`. Sin zona en el texto = ya viene en hora de Lima; con zona se convierte. */
export const fdate = (input?: string | Date | null): string => {
  if (!input) return DASH
  if (typeof input === "string") {
    const plain = input.match(/^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?$/)
    if (plain) return `${plain[3]}/${plain[2]}/${plain[1]} ${hm(+plain[4], plain[5])}`
  }
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return DASH
  const p = Object.fromEntries(LIMA.formatToParts(d).map(x => [x.type, x.value]))
  return `${p.day}/${p.month}/${p.year} ${hm(+p.hour % 24, p.minute)}`
}

export type Tone = "ok" | "warn" | "bad" | "neu"
export const ST: Record<string, [Tone, LucideIcon, string]> = {
  not_configured: ["neu", CircleDashed, "Sin configurar"],
  saved: ["warn", Clock, "Guardado, falta probar"],
  connected: ["ok", CircleCheck, "Conectado"],
  error: ["bad", CircleX, "Error de conexión"],
  contract_required: ["warn", Clock, "Falta activación comercial"],
  prep: ["neu", Clock, "En preparación"],
  uso: ["ok", Power, "En uso en la tienda web"],
  sinuso: ["neu", Power, "Sin uso en la tienda web"],
  creado: ["neu", CircleDot, "Creado"],
  pagado: ["ok", CircleCheck, "Pagado"],
  fallido: ["bad", CircleX, "Fallido"],
  devuelto: ["neu", CircleDot, "Devuelto"],
  pendiente_confirmacion: ["warn", Clock, "Pendiente de confirmación"],
  confirmado: ["ok", CircleCheck, "Confirmado"],
  anulado: ["neu", CircleX, "Anulado"],
}
export const CANAL: Record<string, string> = { pos: "POS", qr: "QR", link: "Enlace de pago" }
export const PROVEEDOR: Record<string, string> = { culqi: "Culqi", manual: "Manual" }
export const SOURCE: Record<string, [string, string]> = {
  ninguna: ["Sin llaves", "No hay llaves de Culqi guardadas aquí ni en el servidor."],
  pasarela: ["Base de datos (guardadas aquí)", "La tienda web cobra con las llaves guardadas en esta pantalla."],
  servidor: ["Servidor (variables de entorno)", "La tienda web cobra con las llaves del servidor."],
}
