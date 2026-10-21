import type { AccionPosterior, ActualizarPostventa, EstadoPostventa, SolicitudPostventa } from "../../services/postventaService"
import { CON_ACCION, EST, MIN_RESP, NEEDR, Q, TR } from "./pvCommon"

export type Draft = { estado: EstadoPostventa; resp: string; notas: string; acc: AccionPosterior; accN: string }
export type FieldKey = "estado" | "resp" | "notas" | "acc" | "accN"
export type Errs = Partial<Record<FieldKey, string>>

export const initDraft = (c: SolicitudPostventa): Draft => ({
  estado: c.estado,
  resp: c.respuesta_cliente || "",
  notas: c.notas_admin || "",
  acc: c.accion_posterior || "ninguna",
  accN: c.accion_posterior_nota || "",
})

export const isDirty = (c: SolicitudPostventa | null, d: Draft): boolean => {
  if (!c) return false
  const o = initDraft(c)
  return (Object.keys(o) as FieldKey[]).some(k => d[k] !== o[k])
}

/** Validacion previa al envio (el servidor vuelve a validar y su mensaje se muestra tal cual). */
export function validate(c: SolicitudPostventa, d: Draft): Errs {
  const e: Errs = {}
  const len = d.resp.trim().length
  if (d.estado !== c.estado && NEEDR.includes(d.estado) && len < MIN_RESP)
    e.resp = `La respuesta al cliente debe tener al menos ${MIN_RESP} caracteres (tiene ${len}).`
  const o = initDraft(c)
  const tocaAccion = d.acc !== o.acc || d.accN !== o.accN
  if (tocaAccion && (d.acc !== "ninguna" || d.accN.trim()) && !CON_ACCION.includes(d.estado))
    e.acc = "La acción posterior solo aplica con estado Aprobada o Resuelta. Elige «Ninguna» o cambia el estado."
  return e
}

/** Cuerpo parcial del PUT: solo lo que cambio. La accion posterior viaja solo con aprobada/resuelta. */
export function buildBody(c: SolicitudPostventa, d: Draft): ActualizarPostventa {
  const o = initDraft(c)
  const b: ActualizarPostventa = {}
  if (d.estado !== o.estado) b.estado = d.estado
  if (d.resp.trim() !== o.resp.trim() || (d.estado !== o.estado && NEEDR.includes(d.estado))) b.respuesta_cliente = d.resp.trim()
  if (d.notas !== o.notas) b.notas_admin = d.notas
  if (CON_ACCION.includes(d.estado)) {
    if (d.acc !== o.acc) b.accion_posterior = d.acc
    if (d.accN !== o.accN) b.accion_posterior_nota = d.accN
  }
  return b
}

const CLAVES: Record<string, FieldKey> = {
  estado: "estado",
  respuesta_cliente: "resp",
  notas_admin: "notas",
  accion_posterior: "acc",
  accion_posterior_nota: "accN",
}
export const mapErrores = (errores?: Record<string, string>): Errs => {
  const e: Errs = {}
  Object.entries(errores || {}).forEach(([k, v]) => { const f = CLAVES[k]; if (f) e[f] = v })
  return e
}

export type PanelFlags = { ro: boolean; closed: boolean; lock: boolean; need: boolean; len: number; dirty: boolean; showAcc: boolean }

/** Estado derivado del panel: solo lectura, caso cerrado, bloqueo por 409, respuesta obligatoria. */
export function panelFlags(c: SolicitudPostventa, d: Draft, o: { canWrite: boolean; stale: boolean; hasAccErr: boolean }): PanelFlags {
  const ro = !o.canWrite
  const closed = TR[c.estado].length === 0
  const lock = ro || closed || o.stale
  const need = NEEDR.includes(d.estado) && d.estado !== c.estado
  const showAcc = CON_ACCION.includes(d.estado) || o.hasAccErr || (closed && !!c.accion_posterior)
  return { ro, closed, lock, need, len: d.resp.trim().length, dirty: isDirty(c, d), showAcc }
}

/** Frase de consecuencia bajo el selector de estado. */
const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} o ${xs[xs.length - 1]}` : xs[0])

export function consecuencia(c: SolicitudPostventa, d: Draft["estado"]): string {
  if (d === c.estado) {
    const t = TR[c.estado].map(x => EST[x])
    return t.length ? `Sin cambio de estado. Desde ${Q(EST[c.estado])} solo puedes pasar a ${lista(t)}.` : `${Q(EST[c.estado])} es un estado cerrado: no admite cambios de estado.`
  }
  const m: Record<string, string> = {
    en_revision: "Pasa a revisión. La respuesta al cliente es opcional.",
    esperando_cliente: "El caso queda a la espera del cliente. La respuesta es opcional, pero el cliente la verá.",
    aprobada: "Al aprobar, el cliente verá tu respuesta y se registrará la acción posterior.",
    rechazada: "Al rechazar, el caso se cierra y el cliente verá tu respuesta. Solo Gerencia podrá reabrirlo.",
    resuelta: "Al resolver, el caso se cierra y el cliente verá tu respuesta.",
  }
  return m[d]
}
