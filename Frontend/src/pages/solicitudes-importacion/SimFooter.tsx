import type { SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { CERRADA, ESTADO, consecuencia, esTerminal } from "./simCommon"
import { convInfo } from "./simConv"
import type { Draft } from "./simForm"
import { Spin } from "./simParts"

/** Pie fijo del panel: convertir a la izquierda, guardar (unica accion primaria) a la derecha. */
export function SimFooter({ r, k, d, dirty, busy, mob, onSave, onConvertir }: {
  r: Sol; k: string; d: Draft; dirty: boolean; busy: "save" | "conv" | null; mob: boolean; onSave: () => void; onConvertir: () => void
}) {
  const cv = convInfo({ r, k, busy: busy === "conv", onConvertir })
  const term = esTerminal(r.estado)
  const puede = dirty && !term && !busy
  const why = term ? CERRADA : busy === "save" ? "Guardando los cambios…" : !dirty ? "No hay cambios por guardar."
    : d.estado !== r.estado ? <><b>{ESTADO[d.estado].l}:</b> {consecuencia(d.estado, r.estado)}</> : "Se guardarán los cambios de la cotización y las notas."
  const sv = (
    <button type="button" className={`btn pri${mob ? " full" : ""}`} aria-disabled={!puede} aria-describedby={`${k}-sv`} onClick={() => { if (puede) onSave() }}>
      {busy === "save" ? <><Spin />Guardando…</> : "Guardar"}
    </button>
  )
  if (mob) return <div className="df"><div className="t1" id={`${k}-sv`} aria-live="polite">{why}</div>{sv}</div>
  return (
    <div className="df">
      <div className="t1" id={cv.id || undefined}>{cv.txt}</div>
      <div className="t1 t2" id={`${k}-sv`} aria-live="polite">{why}</div>
      <div>{cv.ctl}</div>
      <div style={{ justifySelf: "end" }}>{sv}</div>
    </div>
  )
}
