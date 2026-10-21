import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowUp, CircleCheck, CircleX, Eye, FileText, Inbox, Minus, PackageCheck, Truck, TriangleAlert } from "lucide-react"
import type { EstadoSolicitud, NivelUrgencia } from "../../services/solicitudImportacionService"

export const SEP = " · "
export const DASH = "—"
export const ELL = "…"
export const Q = (s: string) => `«${s}»`
export const LIMITE = 20
export const MAX_NOTA = 2000
export const MAX_NOTAS = 4000
export const CERRADA = "Esta solicitud está cerrada y no se puede reabrir."

export type Tono = "nu" | "ok" | "wn" | "er"

export const ESTADO: Record<EstadoSolicitud, { l: string; i: LucideIcon; t: Tono }> = {
  recibida: { l: "Recibida", i: Inbox, t: "nu" },
  en_revision: { l: "En revisión", i: Eye, t: "nu" },
  cotizada: { l: "Cotizada", i: FileText, t: "wn" },
  aprobada: { l: "Aprobada", i: CircleCheck, t: "ok" },
  en_transito: { l: "En tránsito", i: Truck, t: "ok" },
  entregada: { l: "Entregada", i: PackageCheck, t: "ok" },
  rechazada: { l: "Rechazada", i: CircleX, t: "er" },
}
export const ESTADOS = Object.keys(ESTADO) as EstadoSolicitud[]
export const URG: Record<NivelUrgencia, { l: string; i: LucideIcon; t: Tono }> = {
  baja: { l: "Baja", i: ArrowDown, t: "nu" },
  media: { l: "Media", i: Minus, t: "nu" },
  alta: { l: "Alta", i: ArrowUp, t: "wn" },
  urgente: { l: "Urgente", i: TriangleAlert, t: "er" },
}
export const URGENCIAS = Object.keys(URG) as NivelUrgencia[]
export const TIPO: Record<string, string> = {
  laptop: "Laptop", componente: "Componente", periferico: "Periférico", monitor: "Monitor",
  almacenamiento: "Almacenamiento", red: "Red", otro: "Otro",
}

/** Matriz de respaldo; la verdad son las `transiciones` que devuelve el servidor. */
export const MAT: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  recibida: ["en_revision", "cotizada", "rechazada"],
  en_revision: ["cotizada", "rechazada"],
  cotizada: ["en_revision", "aprobada", "rechazada"],
  aprobada: ["en_transito", "rechazada"],
  en_transito: ["entregada"],
  entregada: [],
  rechazada: [],
}
export const esTerminal = (e: EstadoSolicitud) => e === "entregada" || e === "rechazada"
/** Desde «aprobada» el monto, la vigencia y la nota ya no se editan. */
export const esBloqueada = (e: EstadoSolicitud) => e === "aprobada" || e === "en_transito" || esTerminal(e)

const CONS: Partial<Record<EstadoSolicitud, string>> = {
  cotizada: "El cliente recibirá un correo con el monto, la vigencia y tu nota. Exige monto y nota.",
  aprobada: "Bloquea el monto cotizado: ya no se podrá cambiar. Exige monto.",
  en_transito: "Marca la compra en camino: el cliente verá el nuevo estado en su seguimiento.",
  entregada: "Cierra la solicitud: es definitivo y no se puede reabrir.",
  rechazada: "Es definitivo: el cliente verá el motivo que escribas. Exige motivo.",
}
export function consecuencia(to: EstadoSolicitud, from: EstadoSolicitud): string {
  if (to === "en_revision") {
    return from === "recibida" ? "Marca que ya estás revisando la solicitud. No se envía correo." : "Devuelve la solicitud a revisión: permite corregir o quitar el monto. No se envía correo."
  }
  return CONS[to] ?? ""
}

const CAMPOS: Record<string, string> = {
  cotizacion_nota: "la nota de cotización", fecha_entrega_estimada: "la fecha de entrega", notas_admin: "las notas internas",
}
export const lista = (a: string[]) => (a.length < 2 ? (a[0] ?? "") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`)
export const camposTxt = (nota: string | null) => lista((nota ?? "").replace("Campos: ", "").split(", ").filter(Boolean).map(c => CAMPOS[c] ?? c))

/** Fechas con hora: el backend ya las entrega en hora de Lima (ISO -05:00); se leen como texto. */
export const fD = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
export const fT = (s: string) => { const h = +s.slice(11, 13); return `${h % 12 || 12}:${s.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}` }
export const fDT = (s: string) => `${fD(s)}${SEP}${fT(s)}`
/** Fecha civil AAAA-MM-DD: nunca pasa por new Date() local. */
export const fCivil = (s: string) => fD(s.slice(0, 10))
export const usd = (n: number | null | undefined) =>
  n == null ? DASH : "US$ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date())
const dayNum = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5
export const diasEntre = (a: string, b: string) => Math.round(dayNum(b) - dayNum(a))
export const estadoHttp = (error: unknown): number => (error as { response?: { status?: number } })?.response?.status ?? 0
export const errCampos = (error: unknown): Record<string, string> =>
  (error as { response?: { data?: { errores?: Record<string, string> } } })?.response?.data?.errores ?? {}
export const errMensaje = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

export const describe = (k: string, name: string, o: { hint?: string; err?: string }) =>
  [o.hint ? `${k}-${name}-h` : "", o.err ? `${k}-${name}-e` : ""].filter(Boolean).join(" ") || undefined
