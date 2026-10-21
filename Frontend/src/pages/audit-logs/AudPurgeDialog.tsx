import * as Dialog from "@radix-ui/react-dialog"
import { CircleAlert, Info, Trash2 } from "lucide-react"
import { FRASE, ddmm } from "./audCommon"
import { I, Spin } from "./audParts"
import { useAudPurge } from "./useAudPurge"

/** Purga blindada: fecha de corte -> "Contar logs" (dryRun) -> frase exacta -> "Purgar". No se cierra con clic fuera. */
export function AudPurgeDialog({ onClose, onDone }: { onClose: () => void; onDone: (n: number, fecha: string, logId: number | null) => void }) {
  const p = useAudPurge(onDone)
  const busy = p.busy !== ""
  const corte = p.iso ? ddmm(p.iso) : ""
  const ok = p.puede
  const sinLogs = p.count === 0
  return (
    <Dialog.Root open onOpenChange={o => { if (!o && !busy) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="erp-scrim" />
        <Dialog.Content className="erp-dlg" aria-describedby={undefined} onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
          <div className="pg-auditoria dlgw pw">
            <div className="dlg" role="alertdialog" aria-modal="true">
              <div className="dic bad">{I(Trash2, 22)}</div>
              <Dialog.Title asChild><h3>Purgar historial de auditoría</h3></Dialog.Title>
              <label className="fl" htmlFor="aud-pf">Eliminar logs anteriores al</label>
              <div className="row">
                <div className="fld" aria-invalid={!!p.fechaErr && p.txt.trim().length >= 10}>
                  <input id="aud-pf" inputMode="numeric" placeholder="dd/mm/aaaa" value={p.txt} aria-describedby="aud-pd" onChange={e => p.setFecha(e.target.value)} />
                </div>
                <button type="button" className="btn out" aria-disabled={busy || !!p.fechaErr} onClick={() => { if (!busy) void p.contar() }}>{p.busy === "count" ? <><Spin />Contando…</> : "Contar logs"}</button>
              </div>
              <p className="hint" id="aud-pd">Día civil de Lima, hasta las 00:00 de ese día (excluido). {p.fechaErr || "No puede ser hoy ni futura."}</p>
              {p.count != null && !sinLogs && <div className="res" role="status">{I(Info, 18)}<span><b>Se eliminarán {p.count} logs</b> anteriores al {corte} 00:00 (Lima)</span></div>}
              {sinLogs && <div className="res bad" role="alert">{I(CircleAlert, 18)}<span><b>No hay logs para ese criterio.</b> Cambia la fecha de corte y vuelve a contar.</span></div>}
              {p.err && <div className="res bad" role="alert">{I(CircleAlert, 18)}<span><b>{p.err}</b></span></div>}
              <p className="cons"><b>Quedará una fila “Purgar” en este historial con el criterio y el conteo. No se puede deshacer.</b></p>
              <label className="fl" htmlFor="aud-pp">Escribe <code>{FRASE}</code> para confirmar</label>
              <div className="row"><div className="fld"><input id="aud-pp" autoComplete="off" spellCheck={false} aria-describedby="aud-ph" value={p.phrase} onChange={e => p.setPhrase(e.target.value)} /></div></div>
              <p className="hint" id="aud-ph">{ok ? "Listo para purgar." : "«Purgar» se habilita con la frase exacta y al menos 1 log por eliminar."}</p>
              <div className="acts">
                <button type="button" className="btn out" disabled={busy} onClick={onClose}>Cancelar</button>
                <button type="button" className="btn dng" aria-disabled={!ok} aria-describedby="aud-ph" onClick={() => { if (ok) void p.purgar() }}>
                  {p.busy === "purge" ? <><Spin />Purgando…</> : <>{I(Trash2, 16)}Purgar</>}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
