import { Download, FileSpreadsheet, Info, Loader2 } from "lucide-react"
import { I } from "./expCommon"

export function MotivoBoton({ texto, cargando }: { texto: string; cargando?: boolean }) {
  return <span className="why" id="exp-why" role="status">{cargando ? I(Loader2, 16, "spin") : I(Info, 16)}<span>{texto}</span></span>
}

export function BotonDescarga({ cantidad, motivo, busy, onClick }: { cantidad: number; motivo: string; busy: boolean; onClick: () => void }) {
  if (busy) return <button type="button" className="btn" aria-disabled="true">{I(Loader2, 16, "spin")}Generando…</button>
  return (
    <button type="button" className="btn" aria-disabled={motivo ? true : undefined} aria-describedby={motivo ? "exp-why" : undefined} onClick={() => { if (!motivo) onClick() }}>
      {I(Download, 16)}Descargar Excel ({cantidad})
    </button>
  )
}

/** Cabecera de 44 px: h1 y, en escritorio, la unica accion primaria con su motivo al lado. */
export function ExpHeader({ cantidad, motivo, busy, cargando, onDescargar, movil, onArchivo }: {
  cantidad: number; motivo: string; busy: boolean; cargando: boolean; onDescargar: () => void; movil: boolean; onArchivo?: () => void
}) {
  if (movil) {
    return (
      <header className="hd">
        <h1>Exportar productos</h1>
        {onArchivo && <button type="button" className="btn out sm" onClick={onArchivo}>{I(FileSpreadsheet, 16)}Archivo</button>}
      </header>
    )
  }
  return (
    <header className="hd">
      <h1>Exportar productos</h1>
      <div className="act">
        {!busy && motivo && <MotivoBoton texto={motivo} cargando={cargando} />}
        <BotonDescarga cantidad={cantidad} motivo={motivo} busy={busy} onClick={onDescargar} />
      </div>
    </header>
  )
}
