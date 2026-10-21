import { Download, RefreshCw } from "lucide-react"
import { I, Spin } from "./audParts"

/** Cabecera de 44 px: h1 a la izquierda; Actualizar y Exportar CSV (unica accion primaria) a la derecha. */
export function AudHeader({ mob, exporting, canExport, motivo, onRefresh, onExport }: {
  mob: boolean; exporting: boolean; canExport: boolean; motivo: string; onRefresh: () => void; onExport: () => void
}) {
  return (
    <div className="hd">
      <h1>Logs de auditoría</h1>
      <div className="acts">
        {mob
          ? <button type="button" className="ib bd" aria-label="Actualizar" onClick={onRefresh}>{I(RefreshCw, 18)}</button>
          : <button type="button" className="btn out" onClick={onRefresh}>{I(RefreshCw, 16)}Actualizar</button>}
        <button type="button" className={`btn${mob ? " sm" : ""}`} aria-disabled={!canExport || exporting} aria-busy={exporting || undefined}
          aria-describedby={canExport ? undefined : "aud-exp-why"} title={canExport ? "Exporta con los mismos filtros del listado" : motivo}
          onClick={() => { if (canExport && !exporting) onExport() }}>
          {exporting ? <><Spin />Exportando…</> : <>{I(Download, 16)}Exportar CSV</>}
        </button>
        {!canExport && <span className="sr" id="aud-exp-why">{motivo}</span>}
      </div>
    </div>
  )
}
