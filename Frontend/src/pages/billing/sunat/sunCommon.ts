import { CircleCheck, Clock, FileCheck2, Send, TriangleAlert, XCircle, type LucideIcon } from "lucide-react"
import type { EstadoDocumento } from "../../../services/facturacionService"

export const SEP = " · "
export const MOTIVO_MAESTRA = "Solo la cuenta maestra puede modificar el emisor fiscal y sus series"
export const MOTIVO_RUC20_ROL = "Solo la cuenta maestra puede bloquear RUC 20"
export const MOTIVO_RUC20_NADA = "No hay emisores RUC 20 habilitados"
export const LINK_RUC = "Cargar certificado o claves SOL en RUC y empresa"

export const TIPO: Record<string, string> = { "01": "Factura", "03": "Boleta", "07": "Nota de crédito", "08": "Nota de débito" }
export const ESTADO: Record<EstadoDocumento, [string, LucideIcon, string]> = {
  pendiente: ["Pendiente", Clock, "neu"],
  firmado: ["Firmado", FileCheck2, "neu"],
  enviado: ["Enviado", Send, "neu"],
  aceptado: ["Aceptado", CircleCheck, "ok"],
  rechazado: ["Rechazado", XCircle, "bad"],
  error: ["Error", TriangleAlert, "warn"],
}
export const FILTROS: [string, EstadoDocumento | undefined][] = [
  ["Todos", undefined], ["Pendiente", "pendiente"], ["Firmado", "firmado"], ["Enviado", "enviado"],
  ["Aceptado", "aceptado"], ["Rechazado", "rechazado"], ["Error", "error"],
]
export const ORIGEN: Record<string, string> = { servidor: "Servidor", empresa: "Empresa", ninguna: "Ninguna" }
export const origen = (o?: string) => ORIGEN[o ?? "ninguna"] ?? "Ninguna"

/** Las fechas del backend ya llegan en hora de Lima (ISO con -05:00): se leen como texto. */
export const fmtD = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
export const fmtT = (s: string) => {
  const h = Number(s.slice(11, 13))
  return `${h % 12 || 12}:${s.slice(14, 16)} ${h >= 12 ? "p. m." : "a. m."}`
}
export const numeroDoc = (d: { serie: string; correlativo: number }) => `${d.serie}-${String(d.correlativo).padStart(8, "0")}`

export type Status = "loading" | "ok" | "403" | "500" | "red" | "vacio"
