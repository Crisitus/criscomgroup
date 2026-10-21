import { CheckCheck, CircleCheck, CircleX, Hourglass, Inbox, Search, type LucideIcon } from "lucide-react"
import type { AccionPosterior, EstadoPostventa, SolicitudPostventa } from "../../services/postventaService"

export type Tone = "ok" | "warn" | "bad" | "neu"

export const ESTADOS: EstadoPostventa[] = ["recibida", "en_revision", "esperando_cliente", "aprobada", "rechazada", "resuelta"]

export const EST: Record<EstadoPostventa, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  esperando_cliente: "Esperando cliente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  resuelta: "Resuelta",
}

export const ESTI: Record<EstadoPostventa, [LucideIcon, Tone]> = {
  recibida: [Inbox, "neu"],
  en_revision: [Search, "neu"],
  esperando_cliente: [Hourglass, "warn"],
  aprobada: [CircleCheck, "ok"],
  rechazada: [CircleX, "bad"],
  resuelta: [CheckCheck, "ok"],
}

export const TIPO: Record<SolicitudPostventa["tipo"], string> = {
  cambio: "Cambio",
  devolucion: "Devolución",
  garantia: "Garantía",
}

export const ACC: Record<AccionPosterior, string> = {
  ninguna: "Ninguna",
  reingreso_stock: "Reingreso a stock",
  nota_credito: "Nota de crédito",
  reembolso: "Reembolso",
  otra: "Otra",
}

/** Transiciones validas desde cada estado (espejo del backend). Reabrir es aparte (solo rol 1). */
export const TR: Record<EstadoPostventa, EstadoPostventa[]> = {
  recibida: ["en_revision", "rechazada"],
  en_revision: ["esperando_cliente", "aprobada", "rechazada"],
  esperando_cliente: ["en_revision", "rechazada"],
  aprobada: ["resuelta"],
  rechazada: [],
  resuelta: [],
}

export const NEEDR: EstadoPostventa[] = ["aprobada", "rechazada", "resuelta"]
export const CON_ACCION: EstadoPostventa[] = ["aprobada", "resuelta"]
export const MIN_RESP = 10
export const LIMIT = 20

export const SEP = " · "
export const DASH = "–"
export const ELL = "…"
export const Q = (t: string) => `«${t}»`

const RX = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
const hm = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`

/** Las fechas llegan en hora de Lima (-05:00): se leen del texto, sin conversion. */
export function fdt(iso?: string | null): string {
  const m = RX.exec(iso || "")
  return m ? `${m[3]}/${m[2]}/${m[1]} ${hm(+m[4], +m[5])}` : ""
}
export function ftm(iso?: string | null): string {
  const m = RX.exec(iso || "")
  return m ? hm(+m[4], +m[5]) : ""
}
/** "Actualizada 9:40 a. m." si es el mismo dia que la creacion; con fecha si no. */
export function fupd(creada?: string | null, actualizada?: string | null): string {
  if ((creada || "").slice(0, 10) === (actualizada || "").slice(0, 10)) return ftm(actualizada)
  return fdt(actualizada)
}

/** Quita del texto del historial el prefijo "Estado: x a y" (ya se ve en el titulo) y traduce los tokens. */
export function notaLimpia(nota?: string | null): string {
  if (!nota) return ""
  let t = nota.replace(/^Estado:\s*[a-z_]+ a [a-z_]+\.?\s*/i, "").trim()
  t = t.replace(/Acción posterior: ([a-z_]+)/g, (_m, k: string) => `Acción posterior: ${ACC[k as AccionPosterior] ?? k}`)
  return t
}

export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
