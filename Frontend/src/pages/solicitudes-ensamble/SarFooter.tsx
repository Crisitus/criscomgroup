import { CircleAlert, CircleX, Check, Info, Lock } from "lucide-react"
import type { SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { CERRADOS } from "./sarCommon"
import { etiquetaGuardar, motivoBloqueo, type Draft } from "./sarDraft"
import { I, Spin } from "./sarParts"

/** Pie del detalle: una sola accion primaria (Guardar), el motivo si esta deshabilitada y la confirmacion de rechazo. */
export function SarFooter({ s, d, dirty, busy, rej, onRej, onSave }: {
  s: SolicitudEnsamble; d: Draft; dirty: boolean; busy: boolean; rej: boolean; onRej: (v: boolean) => void; onSave: () => void
}) {
  if (CERRADOS.includes(s.estado)) {
    return <p className="why">{I(Lock, 14)}<span><b>Estado cerrado:</b> no se reabre. {s.estado === "rechazada" ? "La solicitud fue rechazada." : "La solicitud fue entregada."}</span></p>
  }
  const why = motivoBloqueo(d, s, dirty)
  if (rej && !why) {
    return (
      <div className="bn er" role="group" aria-labelledby={`rj-${s.id_solicitud}`}>
        {I(CircleAlert, 18)}
        <div className="tx">
          <b id={`rj-${s.id_solicitud}`}>¿Rechazar la solicitud {s.codigo_seguimiento}?</b>
          <p>Pasará a Rechazada y no se reabre: no podrás cotizarla, aprobarla ni cambiar su monto. El cliente verá este motivo: «{d.nota.trim()}».</p>
          <div className="ba">
            <button type="button" className="btn out" onClick={() => onRej(false)}>Seguir editando</button>
            <button type="button" className="btn dng" aria-disabled={busy} onClick={() => { if (!busy) onSave() }}>{busy ? <Spin /> : I(CircleX, 16)}Rechazar solicitud</button>
          </div>
        </div>
      </div>
    )
  }
  const lab = etiquetaGuardar(d.dest)
  const id = `wy-${s.id_solicitud}`
  const off = !!why || busy
  const aviso = !why && d.dest === "cotizada" ? (s.email_solicitante ? `Al guardar, el servidor avisa por correo a ${s.email_solicitante}.` : "El cliente no dejó correo: avísale por WhatsApp.") : ""
  const click = () => { if (off) return; if (d.dest === "rechazada") onRej(true); else onSave() }
  return (
    <>
      {why ? <p className="why" id={id}>{I(Lock, 14)}<span><b>{lab}:</b> {why}</span></p>
        : aviso ? <p className="why">{I(Info, 14)}<span>{aviso}</span></p> : null}
      <div className="dfb">
        <button type="button" className={`btn ${d.dest === "rechazada" ? "out" : "pri"}`} aria-disabled={off} aria-describedby={why ? id : undefined} onClick={click}>
          {busy ? <Spin /> : I(d.dest === "rechazada" ? CircleX : Check, 16)}{busy ? "Guardando…" : lab}
        </button>
      </div>
    </>
  )
}
