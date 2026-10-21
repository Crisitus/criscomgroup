import { useId } from "react"
import { CircleAlert, CircleCheck, Loader } from "lucide-react"
import { pl } from "./empFormat"
import { ic } from "./empParts"

export type SaveKind = "clean" | "dirty" | "err" | "saved" | "saving" | "alta" | "altaok"

interface Props {
  kind: SaveKind
  tab: string
  count?: number
  names?: string[]
  savedAt?: string
  missing?: string
  saveLabel?: string
  onSave: () => void
  onDiscard?: () => void
}

/** Guardado fijo al pie de Empresa / Horario: estado, contador de cambios, Descartar y Guardar. */
export function EmpSaveBar({ kind, tab, count = 0, names = [], savedAt, missing, saveLabel = "Guardar cambios", onSave, onDiscard }: Props) {
  const id = useId()
  const list = names.join(" · ")
  const can = kind === "dirty" || kind === "err" || kind === "altaok"
  const busy = kind === "saving"
  let left
  if (kind === "alta") left = <><span className="st warn">{ic(CircleAlert, 16)}Faltan datos obligatorios</span><small id={id}>{missing}</small></>
  else if (kind === "altaok") left = <><span className="st ok">{ic(CircleCheck, 16)}Listo para registrar</span><small id={id}>Se enviarán los datos y el certificado.</small></>
  else if (kind === "saved") left = <><span className="st ok">{ic(CircleCheck, 16)}Cambios guardados</span><small id={id}>{savedAt} (Lima) · sin cambios pendientes</small></>
  else if (kind === "saving") left = <><span className="st neu spin">{ic(Loader, 16)}Guardando…</span><small id={id}>{list}</small></>
  else if (kind === "err") left = <><span className="st bad">{ic(CircleAlert, 16)}Corrige {pl(count, "campo")} para guardar</span><small id={id}>{list}</small></>
  else if (kind === "dirty") left = <><span className="st warn"><span className="dot" aria-hidden="true" />{pl(count, "cambio")} sin guardar</span><small id={id}>{list}</small></>
  else left = <><span className="st neu">{ic(CircleCheck, 16)}Sin cambios</span><small id={id}>Guardar se activa al editar un campo de {tab}.</small></>

  return (
    <div className="sv" role="region" aria-label={`Guardado de ${tab}`}>
      <div className="svs" aria-live="polite">{left}</div>
      {onDiscard && (kind === "dirty" || kind === "err" || kind === "alta" || kind === "altaok") && <button type="button" className="btn out" onClick={onDiscard}>{kind === "alta" || kind === "altaok" ? "Cancelar" : "Descartar"}</button>}
      <button type="button" className="btn" aria-disabled={!can || busy} aria-describedby={can ? undefined : id} onClick={() => { if (can && !busy) onSave() }}>
        {busy ? "Guardando…" : saveLabel}
      </button>
    </div>
  )
}
