import type { MouseEvent } from "react"
import { Circle, Info, Lock, RotateCcw, Save } from "lucide-react"
import type { SolicitudPostventa } from "../../services/postventaService"
import { PanelAlerts } from "./PvAlerts"
import { AccionField, NotasField, RespuestaField, StateOptions } from "./PvFields"
import { consecuencia, type PanelFlags } from "./pvDraft"
import { I } from "./pvParts"
import type { PostventaDetail } from "./usePostventaDetail"

/** Cuerpo del panel "Responder y cambiar estado". */
export function PanelBody({ det, c, f }: { det: PostventaDetail; c: SolicitudPostventa; f: PanelFlags }) {
  const d = det.d
  if (!d) return null
  const id = String(c.id_solicitud)
  const fld = { d, errs: det.errs, f, onField: det.setField, id }
  return (
    <>
      <PanelAlerts c={c} errs={det.errs} ban={det.ban} crf={det.crf} id={id} saving={det.saving}
        onReload={det.reload} onCrfNo={() => det.setCrf(false)} onCrfOk={() => void det.reopen()} />
      <h3><span>Responder y cambiar estado</span>{f.ro && <span className="tag">{I(Lock, 12)}Solo lectura</span>}</h3>
      <div className="fld">
        <div className="lb"><span>Estado</span></div>
        <StateOptions c={c} d={d} f={f} onState={det.setState} />
        {!f.closed && <div className="cons" aria-live="polite">{I(Info, 14)}<span>{consecuencia(c, d.estado)}</span></div>}
      </div>
      {!(f.closed && !c.respuesta_cliente) && <RespuestaField {...fld} />}
      {!(f.closed && !c.notas_admin) && <NotasField d={d} f={f} id={id} notesOpen={det.nopen} onField={det.setField} onToggleNotes={det.setNopen} />}
      <AccionField {...fld} />
    </>
  )
}

/** Pie de acciones: motivo/estado a la izquierda, Descartar y Guardar (o Reabrir) a la derecha. */
export function PanelFoot({ det, c, f, role }: { det: PostventaDetail; c: SolicitudPostventa; f: PanelFlags; role: number }) {
  const id = String(c.id_solicitud)
  const stale = det.ban?.k === "409"
  const rs = `rs-${id}`
  const noop = (ev: MouseEvent) => ev.preventDefault()
  if (f.ro) {
    const reason = role === 5 ? "Auditoría tiene acceso de solo lectura" : "Tu usuario no tiene permiso para modificar solicitudes"
    return (
      <>
        <span className="sp" id={rs}>{I(Lock, 14)}{reason}</span>
        {f.closed
          ? <button type="button" className="btn out" aria-disabled="true" aria-describedby={rs} onClick={noop}>{I(RotateCcw, 16)}Reabrir</button>
          : <button type="button" className="btn" aria-disabled="true" aria-describedby={rs} onClick={noop}>{I(Save, 16)}Guardar</button>}
      </>
    )
  }
  if (f.closed) {
    const own = role === 1
    return (
      <>
        <span className="sp" id={own ? undefined : rs}>{I(Lock, 14)}{own ? "Solicitud cerrada. Como Gerencia puedes reabrirla." : "Solicitud cerrada. Solo Gerencia (rol 1) puede reabrirla."}</span>
        {own
          ? !det.crf && <button type="button" className="btn out" onClick={() => det.setCrf(true)}>{I(RotateCcw, 16)}Reabrir</button>
          : <button type="button" className="btn out" aria-disabled="true" aria-describedby={rs} onClick={noop}>{I(RotateCcw, 16)}Reabrir</button>}
      </>
    )
  }
  const can = f.dirty && !stale && !det.saving
  return (
    <>
      {f.dirty
        ? <span className="sp dirty" id={rs} role="status">{I(Circle, 12)}Cambios sin guardar</span>
        : <span className="sp" id={rs}>{stale ? "Recarga la solicitud para poder guardar." : "Sin cambios por guardar"}</span>}
      {f.dirty && <button type="button" className="btn out" onClick={det.undo}>Descartar</button>}
      <button type="button" className="btn" aria-disabled={!can || undefined} aria-describedby={can ? undefined : rs}
        onClick={ev => { if (!can) return ev.preventDefault(); void det.save() }}>{I(Save, 16)}{det.saving ? "Guardando…" : "Guardar"}</button>
    </>
  )
}
