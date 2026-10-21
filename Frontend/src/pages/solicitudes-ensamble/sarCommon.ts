import type { LucideIcon } from "lucide-react"
import { CircleAlert, CircleCheck, CircleX, Clock, Eye, FileText, Inbox, Package, Wrench } from "lucide-react"
import { MODO_ENSAMBLE_LABELS, TIER_LABELS, type EstadoEnsamble, type SolicitudEnsamble } from "../../services/solicitudEnsambleService"

export const SEP = " · "
export const DASH = "—"
export const LIMITE = 20
export const MAX_NOTA = 2000
export const MAX_INT = 4000
export const RUTA_COTIZACIONES = "/commercial-control?tab=quotes"

export type Tono = "nu" | "pu" | "ok" | "wn" | "er"

export const ESTADOS: [EstadoEnsamble | "", string][] = [
  ["", "Todas"], ["recibida", "Recibida"], ["en_revision", "En revisión"], ["cotizada", "Cotizada"],
  ["aprobada", "Aprobada"], ["en_ensamble", "En ensamble"], ["entregada", "Entregada"], ["rechazada", "Rechazada"],
]
export const ES: Record<EstadoEnsamble, [string, LucideIcon, Tono]> = {
  recibida: ["Recibida", Inbox, "nu"],
  en_revision: ["En revisión", Eye, "nu"],
  cotizada: ["Cotizada", FileText, "pu"],
  aprobada: ["Aprobada", CircleCheck, "ok"],
  en_ensamble: ["En ensamble", Wrench, "pu"],
  entregada: ["Entregada", Package, "ok"],
  rechazada: ["Rechazada", CircleX, "er"],
}
export const MODOS: [string, string][] = [
  ["", "Todos"], ["marketplace", MODO_ENSAMBLE_LABELS.marketplace], ["presupuesto", MODO_ENSAMBLE_LABELS.presupuesto], ["ensamble_propio", MODO_ENSAMBLE_LABELS.ensamble_propio],
]
/** Matriz del backend (respaldo si el detalle aun no trae transiciones[]). */
export const MATRIZ: Record<EstadoEnsamble, EstadoEnsamble[]> = {
  recibida: ["en_revision", "cotizada", "rechazada"], en_revision: ["cotizada", "rechazada"],
  cotizada: ["en_revision", "aprobada", "rechazada"], aprobada: ["en_ensamble", "rechazada"],
  en_ensamble: ["entregada"], entregada: [], rechazada: [],
}
/** Con estos estados la cotizacion ya no se puede modificar (409 del backend). */
export const BLOQUEADOS: EstadoEnsamble[] = ["aprobada", "en_ensamble", "entregada", "rechazada"]
export const CERRADOS: EstadoEnsamble[] = ["entregada", "rechazada"]

/** Fechas con hora: el backend ya las entrega en hora de Lima (ISO -05:00); se leen como texto. */
export const fD = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
export const fT = (s: string) => { const h = +s.slice(11, 13); return `${h % 12 || 12}:${s.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}` }
export const fDT = (s: string) => `${fD(s)} ${fT(s)}`
/** Fecha civil AAAA-MM-DD: nunca pasa por new Date() local (restaba un dia). */
export const fCivil = (s: string) => fD(s.slice(0, 10))
export const money = (n: number) => "S/ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pl = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`
export const clean = (t: string) => { const x = t.replace(/^seed-adm:\s*/, ""); return x.charAt(0).toUpperCase() + x.slice(1) }
export const estadoHttp = (error: unknown): number => (error as { response?: { status?: number } })?.response?.status ?? 0

/** Texto del monto escrito: "1,980.50" -> 1980.5 (NaN si no es numero). */
export const numero = (v: string) => parseFloat(v.replace(/,/g, "").trim())
/** dd/mm/aaaa -> AAAA-MM-DD, o null si no es una fecha real. */
export function aIso(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [d, mo, a] = [+m[1], +m[2], +m[3]]
  const t = new Date(Date.UTC(a, mo - 1, d))
  if (t.getUTCFullYear() !== a || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null
  return `${a}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date())
const dias = (a: string, b: string) => Math.round((Date.parse(a.slice(0, 10)) - Date.parse(b)) / 864e5)

export interface Vig { t: Tono; icon: LucideIcon; x: string }
/** Vigencia de la cotizacion: Vencida (contrato) / Vence en N dias (3 o menos) / Vigente. */
export function vigDe(s: Pick<SolicitudEnsamble, "estado" | "valida_hasta" | "vencida">): Vig | null {
  if (s.estado !== "cotizada" || !s.valida_hasta) return null
  if (s.vencida) return { t: "er", icon: CircleAlert, x: "Vencida" }
  const n = dias(s.valida_hasta, hoyLima())
  if (n <= 3) return { t: "wn", icon: Clock, x: n <= 0 ? "Vence hoy" : `Vence en ${pl(n, "día", "días")}` }
  return { t: "ok", icon: CircleCheck, x: "Vigente" }
}

export function resumenPedido(s: Pick<SolicitudEnsamble, "modo" | "productos" | "tier_presupuesto">): string {
  if (s.modo === "marketplace") return `${pl(s.productos?.length ?? 0, "producto", "productos")} del marketplace`
  if (s.modo === "presupuesto") return s.tier_presupuesto ? TIER_LABELS[s.tier_presupuesto] : "Por presupuesto"
  return "Cliente trae sus piezas"
}

/** Numero COT-… de la cotizacion creada: el detalle solo trae el id; el numero queda en el historial. */
export function numeroCotizacion(s: Pick<SolicitudEnsamble, "historial" | "cotizacion_id">): string {
  const nota = s.historial?.find(h => h.accion === "convertir")?.nota ?? ""
  return nota.match(/COT-[A-Z0-9]+/)?.[0] ?? `n.º ${s.cotizacion_id ?? ""}`.trim()
}

/** Por que no se puede convertir (null = se puede). Solo marketplace en cotizada/aprobada con monto. */
export function motivoConversion(s: SolicitudEnsamble): string | null {
  if (s.modo !== "marketplace") return "Solo las solicitudes con productos del catálogo se convierten en cotización. Para este modo, arma la cotización a mano en Cotizaciones."
  if (s.estado !== "cotizada" && s.estado !== "aprobada") return `Solo se convierten solicitudes cotizadas o aprobadas (estado actual: «${ES[s.estado][0]}»).`
  if (!((s.cotizacion_monto ?? 0) > 0)) return "La solicitud no tiene un monto cotizado."
  return null
}
