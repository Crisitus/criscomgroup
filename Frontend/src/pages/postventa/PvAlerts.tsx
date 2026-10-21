import type { MouseEvent } from "react"
import { CircleAlert, CircleCheck, Lock, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react"
import type { SolicitudPostventa } from "../../services/postventaService"
import { EST, Q } from "./pvCommon"
import type { Errs, FieldKey } from "./pvDraft"
import type { Ban } from "./usePostventaDetail"
import { Banner, I } from "./pvParts"

const FIELD_ID: Partial<Record<FieldKey, string>> = { resp: "f-resp", notas: "f-notas", acc: "f-acc", accN: "f-accN" }

/** Resumen de errores por campo (400) y avisos de 403 / 409 / guardado / reapertura. */
export function PanelAlerts({ c, errs, ban, crf, id, saving, onReload, onCrfNo, onCrfOk }: {
  c: SolicitudPostventa
  errs: Errs
  ban: Ban
  crf: boolean
  id: string
  saving: boolean
  onReload: () => void
  onCrfNo: () => void
  onCrfOk: () => void
}) {
  const keys = Object.keys(errs) as FieldKey[]
  const go = (k: FieldKey) => (ev: MouseEvent) => {
    ev.preventDefault()
    const base = FIELD_ID[k]
    if (base) document.getElementById(`${base}-${id}`)?.focus()
  }
  return (
    <>
      {keys.length > 0 && (
        <Banner tone="bad" icon={CircleAlert} role="alert" title={`Revisa ${keys.length} ${keys.length > 1 ? "campos" : "campo"} antes de guardar`}>
          <ul>{keys.map(k => <li key={k}><a href={`#${k}`} onClick={go(k)}>{errs[k]}</a></li>)}</ul>
        </Banner>
      )}
      {ban?.k === "403" && <Banner tone="bad" icon={Lock} role="alert" title="No tienes permiso para esta acción (403)">{ban.t}</Banner>}
      {ban?.k === "409" && (
        <Banner tone="warn" icon={TriangleAlert} role="alert" title="La solicitud cambió desde otro puesto (409)"
          actions={<button type="button" className="btn out" onClick={onReload}>{I(RefreshCw, 16)}Recargar la solicitud</button>}>
          {ban.t} Tus cambios no se guardaron.
        </Banner>
      )}
      {ban?.k === "err" && <Banner tone="bad" icon={CircleAlert} role="alert" title="No se pudo guardar">{ban.t}</Banner>}
      {ban?.k === "ok" && <Banner tone="ok" icon={CircleCheck} title="Cambios guardados">{ban.t}</Banner>}
      {crf && (
        <Banner tone="warn" icon={RotateCcw} role="alertdialog" label="Confirmar reapertura" title="¿Reabrir esta solicitud?"
          actions={<>
            <button type="button" className="btn out" onClick={onCrfNo}>Cancelar</button>
            <button type="button" className="btn" disabled={saving} onClick={onCrfOk}>{saving ? "Reabriendo…" : "Reabrir solicitud"}</button>
          </>}>
          Pasará de {Q(EST[c.estado])} a {Q("En revisión")} y quedará registrado en el historial. Podrás aprobarla o rechazarla de nuevo. El cliente verá el nuevo estado al consultar su código.
        </Banner>
      )}
    </>
  )
}

/** Aviso de cambios sin guardar al abrir otro caso o volver a la bandeja. */
export function PendingBox({ c, pend, target, onKeep, onDrop }: {
  c: SolicitudPostventa
  pend: "list" | number
  target: string
  onKeep: () => void
  onDrop: () => void
}) {
  const lista = pend === "list"
  return (
    <Banner tone="warn" className="pend" icon={TriangleAlert} role="alertdialog" label="Cambios sin guardar" title="Tienes cambios sin guardar"
      actions={<>
        <button type="button" className="btn out" onClick={onKeep}>Seguir editando</button>
        <button type="button" className="btn dng" onClick={onDrop}>Descartar y {lista ? "volver" : "abrir"}</button>
      </>}>
      Si {lista ? "vuelves a" : "abres"} {target}, se perderá lo escrito en {c.codigo_seguimiento}.
    </Banner>
  )
}
