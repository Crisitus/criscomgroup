import { Download, Plus } from "lucide-react"
import { I } from "./comShared"

export function ComHeader({ mob, onNew, onExport, exporting }: { mob: boolean; onNew: () => void; onExport: () => void; exporting: boolean }) {
  return (
    <>
      <div className="hd">
        <h1>Comunidad y correos</h1>
        <div className="r">
          {mob
            ? <button type="button" className="ib bd" aria-label="Exportar CSV" aria-disabled={exporting || undefined} onClick={() => !exporting && onExport()}>{I(Download, 18)}</button>
            : <button type="button" className="btn out" aria-disabled={exporting || undefined} onClick={() => !exporting && onExport()}>{I(Download, 16)}Exportar CSV</button>}
          {!mob && <button type="button" className="btn" onClick={onNew}>{I(Plus, 16)}Nueva campaña</button>}
        </div>
      </div>
      {mob && <button type="button" className="btn fw" onClick={onNew}>{I(Plus, 16)}Nueva campaña</button>}
    </>
  )
}
