import type { LucideIcon } from "lucide-react"
import { Archive, CircleAlert, CircleCheck, CircleDot, Clock, Inbox, Check } from "lucide-react"
import type { EstadoReclamacion, ReclamacionFila } from "../../services/libroReclamacionesService"

export const SEP = " · "
export const DASH = "—"
export const ELL = "…"
export const BUL = "•"
export const Q = (s: string) => `«${s}»`
export const MIN_RESP = 20
export const MAX_RESP = 4000
export const LIMITE = 15

export type Tono = "nu" | "ok" | "wn" | "er"

export const ESTADOS: [EstadoReclamacion | "", string][] = [
  ["", "Todas"], ["pendiente", "Pendientes"], ["en_proceso", "En proceso"], ["respondido", "Respondidas"], ["archivado", "Archivadas"],
]
export const ES: Record<EstadoReclamacion, [string, LucideIcon]> = {
  pendiente: ["Pendiente", Inbox],
  en_proceso: ["En proceso", CircleDot],
  respondido: ["Respondido", Check],
  archivado: ["Archivado", Archive],
}
/** Transiciones validas del backend. */
export const TRANS: Record<EstadoReclamacion, EstadoReclamacion[]> = {
  pendiente: ["en_proceso", "respondido", "archivado"],
  en_proceso: ["respondido", "archivado"],
  respondido: ["archivado"],
  archivado: [],
}

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
/** Fechas con hora: el backend ya las entrega en hora de Lima (ISO -05:00); se leen como texto. */
export const fD = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
export const fT = (s: string) => { const h = +s.slice(11, 13); return `${h % 12 || 12}:${s.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}` }
export const fDT = (s: string) => `${fD(s)} ${fT(s)}`
/** Fecha civil AAAA-MM-DD: nunca pasa por new Date() local (restaba un dia). */
export const fCivil = (s: string) => fD(s.slice(0, 10))
export const fLarga = (s: string) => {
  const [a, m, d] = s.slice(0, 10).split("-").map(Number)
  return `${DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} ${MES[m - 1]} ${a}`
}
export const money = (n: number | null) => (n == null ? "No indicó monto" : "S/ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const pl = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`
export const tipoTxt = (t: string | null) => (t === "queja" ? "Queja" : "Reclamo")
export const clean = (t: string) => t.replace(/\s*seed-care$/, "")

export interface Plazo { t: Tono; icon: LucideIcon; x: string; big?: number | string; cap?: string }
/** Plazo legal: 15 dias habiles. Respondidas/archivadas ya no cuentan dias. */
export function plazoDe(r: Pick<ReclamacionFila, "estado" | "dias_restantes" | "vencido" | "por_vencer" | "respondido_en_plazo">): Plazo | null {
  if (r.estado === "archivado") return null
  if (r.estado === "respondido") {
    if (r.respondido_en_plazo === true) return { t: "ok", icon: CircleCheck, x: "Respondido en plazo" }
    if (r.respondido_en_plazo === false) return { t: "er", icon: CircleAlert, x: "Respondido fuera de plazo" }
    return null
  }
  const n = r.dias_restantes
  if (n === null || n === undefined) return null
  if (r.vencido || n < 0) return { t: "er", icon: CircleAlert, x: `Vencido ${SEP.trim()} hace ${pl(-n, "día hábil", "días hábiles")}`, big: -n, cap: "de retraso, en días hábiles" }
  if (n === 0) return { t: "wn", icon: Clock, x: "Vence hoy", big: "Hoy", cap: "último día del plazo" }
  if (r.por_vencer) return { t: "wn", icon: Clock, x: `Vence en ${pl(n, "día", "días")}`, big: n, cap: "días hábiles restantes" }
  return { t: "nu", icon: Clock, x: `En plazo ${SEP.trim()} ${pl(n, "día hábil", "días hábiles")}`, big: n, cap: "días hábiles restantes" }
}

/** Mas urgente: la mas atrasada; luego la que vence antes; si no, la primera. */
export function masUrgente<T extends ReclamacionFila>(rows: T[]): T | null {
  const abiertas = rows.filter(r => r.dias_restantes !== null && (r.estado === "pendiente" || r.estado === "en_proceso"))
  const orden = [...abiertas].sort((a, b) => (a.dias_restantes as number) - (b.dias_restantes as number))
  const urg = orden.find(r => r.vencido || r.por_vencer || (r.dias_restantes as number) <= 0)
  return urg ?? rows[0] ?? null
}

export const maskDoc = (d: string) => `${BUL.repeat(4)}${d.slice(-4)}`
export const maskDom = (d: string) => `${BUL.repeat(6)}${SEP}${d.split(",").map(s => s.trim()).slice(-2).join(", ")}`
export const docEtiqueta = (d: string) => (/^\d{8}$/.test(d) ? "DNI" : /^\d{11}$/.test(d) ? "RUC" : "Documento")

export const estadoHttp = (error: unknown): number =>
  (error as { response?: { status?: number } })?.response?.status ?? 0
