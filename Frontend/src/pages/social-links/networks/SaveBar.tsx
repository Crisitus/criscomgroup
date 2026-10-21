import { CircleAlert, Info, RotateCcw, TriangleAlert } from "lucide-react"
import { I, pl } from "../shared"
import type { Networks } from "./useNetworks"

export function SaveBar({ nw }: { nw: Networks }) {
  const { dirty, bad, loadError, canSave, saving } = nw
  const changes = `${dirty} ${dirty > 1 ? "cambios sin guardar" : "cambio sin guardar"}`
  let msg
  if (loadError) msg = <span className="st bad">{I(CircleAlert, 16)}No se puede guardar: la carga de redes falló. Pulsa Reintentar.</span>
  else if (!dirty) msg = <span className="st neu">{I(Info, 16)}Sin cambios por guardar</span>
  else if (bad) msg = <span className="st warn">{I(TriangleAlert, 16)}{changes}{" · "}corrige {pl(bad, "enlace inválido", "enlaces inválidos")} para poder guardar</span>
  else msg = <span className="st warn">{I(TriangleAlert, 16)}{changes}</span>
  const canDiscard = dirty > 0 && !loadError && !saving
  return (
    <div className="sv">
      <div className="svc">
        <div className="m" role="status">{msg}</div>
        <div className="a">
          <button type="button" className="btn out" aria-disabled={!canDiscard} onClick={() => { if (canDiscard) nw.discard() }}>{I(RotateCcw, 16)}Descartar</button>
          <button type="button" className="btn" aria-disabled={!canSave} onClick={() => void nw.save()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </div>
    </div>
  )
}
