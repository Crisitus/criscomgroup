import type { EstadoSolicitud, SolicitudImportacion, UpdateEstadoPayload } from "../../services/solicitudImportacionService"
import { MAX_NOTA, MAX_NOTAS, esBloqueada, esTerminal, lista } from "./simCommon"

/** Borrador del panel de gestion. Texto tal cual lo escribe la persona. */
export interface Draft { estado: EstadoSolicitud; monto: string; vig: string; entrega: string; nota: string; notas: string }
export type Errs = Partial<Record<"monto" | "vig" | "entrega" | "nota" | "notas", string>>

const dmy = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "")
const fmtMonto = (n: number | null) => (n == null ? "" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const diasDe = (r: SolicitudImportacion) => {
  if (!r.cotizacion_fecha || !r.valida_hasta) return 7
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.max(1, Math.round((t(r.valida_hasta) - t(r.cotizacion_fecha)) / 864e5))
}

export const draftDe = (r: SolicitudImportacion): Draft => ({
  estado: r.estado, monto: fmtMonto(r.cotizacion_monto), vig: String(diasDe(r)), entrega: dmy(r.fecha_entrega_estimada),
  nota: r.cotizacion_nota ?? "", notas: r.notas_admin ?? "",
})
export const montoNum = (s: string): number | null => {
  const t = s.replace(/[\s,]/g, "")
  if (!t) return null
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN
}
/** dd/mm/aaaa -> AAAA-MM-DD (null si vacio, NaN-string "bad" si invalida). */
export function fechaIso(s: string): string | null | "bad" {
  const t = s.trim()
  if (!t) return null
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (!m) return "bad"
  const [d, mo, y] = [+m[1], +m[2], +m[3]]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "bad"
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export const requiereMonto = (e: EstadoSolicitud) => e === "cotizada" || e === "aprobada"
export const requiereNota = (e: EstadoSolicitud) => e === "cotizada" || e === "rechazada"

/** Campos que se pueden editar segun el estado actual y el elegido. */
export function editables(r: SolicitudImportacion, d: Draft) {
  const bq = esBloqueada(r.estado)
  const term = esTerminal(r.estado)
  return { monto: !bq, vig: !bq, entrega: !term, nota: !bq || (d.estado === "rechazada" && !term), notas: !term }
}

export function dirty(r: SolicitudImportacion, d: Draft): boolean {
  if (esTerminal(r.estado)) return false
  const o = draftDe(r)
  return (Object.keys(o) as (keyof Draft)[]).some(k => k !== "vig" && o[k] !== d[k]) || (editables(r, d).vig && o.vig !== d.vig && d.monto !== "")
}

/** Validacion previa al guardado: marca los campos obligatorios del estado elegido. */
export function validar(r: SolicitudImportacion, d: Draft): Errs {
  const e: Errs = {}
  const ed = editables(r, d)
  const m = montoNum(d.monto)
  if (ed.monto) {
    if (Number.isNaN(m) || (m !== null && (m <= 0 || m > 99999999.99))) e.monto = "El monto debe ser un número mayor que 0, con hasta 2 decimales."
    else if (requiereMonto(d.estado) && !(m && m > 0)) e.monto = "Indica el monto cotizado (mayor que 0)."
  } else if (requiereMonto(d.estado) && !(r.cotizacion_monto && r.cotizacion_monto > 0)) e.monto = "Indica el monto cotizado (mayor que 0)."
  if (requiereNota(d.estado) && !d.nota.trim()) e.nota = d.estado === "rechazada" ? "Indica el motivo del rechazo: lo verá el cliente." : "Escribe la nota que verá el cliente con la cotización."
  else if ([...d.nota].length > MAX_NOTA) e.nota = `Máximo ${MAX_NOTA} caracteres.`
  if ([...d.notas].length > MAX_NOTAS) e.notas = `Máximo ${MAX_NOTAS} caracteres.`
  if (ed.vig) {
    const v = Number(d.vig)
    if (!Number.isInteger(v) || v < 1 || v > 90) e.vig = "La vigencia debe ser de 1 a 90 días."
  }
  if (ed.entrega && fechaIso(d.entrega) === "bad") e.entrega = "Fecha inválida. Usa dd/mm/aaaa."
  return e
}

/** Cuerpo parcial del PUT: solo lo que cambio (el servidor fija fecha de cotizacion y vigencia). */
export function payloadDe(r: SolicitudImportacion, d: Draft): UpdateEstadoPayload {
  const o = draftDe(r)
  const ed = editables(r, d)
  const p: UpdateEstadoPayload = {}
  if (d.estado !== r.estado) p.estado = d.estado
  const montoCambia = ed.monto && o.monto !== d.monto
  if (montoCambia) p.cotizacion_monto = montoNum(d.monto)
  if (ed.nota && o.nota !== d.nota) p.cotizacion_nota = d.nota.trim() || null
  if (ed.notas && o.notas !== d.notas) p.notas_admin = d.notas.trim() || null
  if (ed.entrega && o.entrega !== d.entrega) { const f = fechaIso(d.entrega); p.fecha_entrega_estimada = f === "bad" ? null : f }
  if (ed.vig && (montoCambia || (d.estado === "cotizada" && r.estado !== "cotizada") || o.vig !== d.vig) && d.monto !== "") p.vigencia_dias = Number(d.vig)
  return p
}

/** Lo que se perderia al descartar el borrador, en una frase. */
export function cambiosTxt(r: SolicitudImportacion, d: Draft): string {
  const o = draftDe(r)
  const x: string[] = []
  if (d.estado !== o.estado) x.push("el estado elegido")
  if (o.monto !== d.monto || o.vig !== d.vig) x.push("el monto y la vigencia")
  if (o.entrega !== d.entrega) x.push("la fecha de entrega")
  if (o.nota !== d.nota) x.push("la nota al cliente")
  if (o.notas !== d.notas) x.push("las notas internas")
  return lista(x)
}
