import type { EstadoEnsamble, SolicitudEnsamble, UpdateEstadoEnsamblePayload } from "../../services/solicitudEnsambleService"
import { ES, aIso, fCivil, numero } from "./sarCommon"

/** Lo que el equipo escribe en el panel de gestion (texto tal cual, sin convertir). */
export interface Draft { dest: EstadoEnsamble; monto: string; nota: string; vig: string; entrega: string; int: string }
export type CampoErr = Partial<Record<"estado" | "monto" | "nota" | "vig" | "entrega" | "int", string>>

export const baseDraft = (s: SolicitudEnsamble): Draft => ({
  dest: s.estado,
  monto: s.cotizacion_monto != null ? s.cotizacion_monto.toFixed(2) : "",
  nota: s.cotizacion_nota ?? "",
  vig: "7",
  entrega: s.fecha_entrega_estimada ? fCivil(s.fecha_entrega_estimada) : "",
  int: s.notas_admin ?? "",
})
export const hayCambios = (d: Draft, b: Draft) => (Object.keys(d) as (keyof Draft)[]).some(k => k !== "vig" && d[k] !== b[k])

const montoNuevo = (d: Draft) => {
  const n = numero(d.monto)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}
/** Cambia el monto frente a lo guardado (eso es lo que renueva la vigencia en el backend). */
export const montoCambia = (d: Draft, s: SolicitudEnsamble) => montoNuevo(d) !== s.cotizacion_monto
/** La vigencia solo se aplica al cotizar o re-cotizar. */
export const recotiza = (d: Draft, s: SolicitudEnsamble) => d.dest === "cotizada" && (s.estado !== "cotizada" || montoCambia(d, s))

/** Motivo por el que no se puede guardar todavia (null = se puede). */
export function motivoBloqueo(d: Draft, s: SolicitudEnsamble, cambios: boolean): string | null {
  const m = numero(d.monto)
  if (d.dest === "cotizada" && !(m > 0)) return "Falta el monto cotizado (mayor que 0)."
  if (d.dest === "cotizada" && !d.nota.trim()) return "Falta la nota que verá el cliente con la cotización."
  if (d.dest === "aprobada" && !((s.cotizacion_monto ?? 0) > 0)) return "Falta un monto cotizado para aprobar."
  if (d.dest === "rechazada" && !d.nota.trim()) return "Indica el motivo del rechazo: lo verá el cliente."
  if (!cambios) return "no hay cambios por guardar."
  return null
}
export const etiquetaGuardar = (dest: EstadoEnsamble) => (dest === "cotizada" ? "Guardar cotización" : dest === "rechazada" ? "Rechazar solicitud" : "Guardar cambios")

/** Valida en el cliente lo que el backend tambien valida; devuelve errores por campo. */
export function validar(d: Draft, s: SolicitudEnsamble): CampoErr {
  const e: CampoErr = {}
  if (d.monto.trim() && !(numero(d.monto) > 0)) e.monto = "Indica un monto mayor que 0."
  if (d.entrega.trim() && !aIso(d.entrega)) e.entrega = "Usa una fecha real con el formato dd/mm/aaaa."
  const v = Number(d.vig)
  if (recotiza(d, s) && (!Number.isInteger(v) || v < 1 || v > 90)) e.vig = "La vigencia debe ser de 1 a 90 días."
  return e
}

/** Cuerpo parcial del PUT: solo lo que cambio (el servidor fija fechas y vigencia). */
export function aPayload(d: Draft, b: Draft, s: SolicitudEnsamble): UpdateEstadoEnsamblePayload {
  const p: UpdateEstadoEnsamblePayload = {}
  if (d.dest !== s.estado) p.estado = d.dest
  if (montoCambia(d, s)) p.cotizacion_monto = montoNuevo(d)
  if (d.nota !== b.nota || d.dest === "rechazada" || (d.dest === "cotizada" && s.estado !== "cotizada")) p.cotizacion_nota = d.nota.trim()
  if (d.int !== b.int) p.notas_admin = d.int.trim() || null
  if (d.entrega !== b.entrega) p.fecha_entrega_estimada = d.entrega.trim() ? aIso(d.entrega) : null
  if (recotiza(d, s)) p.vigencia_dias = Number(d.vig)
  return p
}
/** Nombre de campo del backend -> campo del formulario. */
export const CAMPO_FORM: Record<string, keyof NonNullable<CampoErr>> = {
  estado: "estado", cotizacion_monto: "monto", cotizacion_nota: "nota", vigencia_dias: "vig", fecha_entrega_estimada: "entrega", notas_admin: "int",
}
export const ETIQUETA_CAMPO: Record<keyof NonNullable<CampoErr>, string> = {
  estado: "Estado", monto: "Monto cotizado", nota: "Nota para el cliente", vig: "Vigencia (días)", entrega: "Entrega estimada", int: "Notas internas",
}
export const estadoTxt = (e: EstadoEnsamble) => ES[e][0]
