import { Archive, CircleAlert } from "lucide-react"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { I, Spin } from "./libroParts"

/** Archivar es definitivo: el dialogo dice la consecuencia exacta. */
export function ArchiveDialog({ codigo, busy, error, onCancel, onConfirm }: {
  codigo: string; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onCancel() }} title={`¿Archivar la hoja ${codigo}?`} icon={I(Archive, 22)} tone="bad">
      <div className="pg-libro dlgw">
        <p>Archivar es <b>definitivo</b>. Al confirmar:</p>
        <ul>
          <li>La hoja pasa a Archivado y ya no admite cambios.</li>
          <li>No se puede reabrir ni devolver a Pendiente o En proceso.</li>
          <li>No se puede borrar: el sistema no tiene opción de borrado.</li>
        </ul>
        <p className="s">Si todavía debes contestarla, envía la respuesta antes de archivar.</p>
        {error && <p className="msg" role="alert">{I(CircleAlert, 16)}<span>{error}</span></p>}
        <div className="acts">
          <button type="button" className="btn out" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" className="btn dng" onClick={onConfirm} disabled={busy}>{busy ? <><Spin />Archivando…</> : <>{I(Archive, 16)}Archivar hoja</>}</button>
        </div>
      </div>
    </ErpDialog>
  )
}
