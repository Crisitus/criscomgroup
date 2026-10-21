import { Moon, ShieldCheck } from "lucide-react"
import { EmpCard, EmpField, EmpNote } from "./empParts"
import { EmpPreview } from "./EmpPreview"
import { EmpSaveBar, type SaveKind } from "./EmpSaveBar"
import { EmpError, EmpForbidden, EmpLoading, EmpNoCompany } from "./EmpStates"
import { pl } from "./empFormat"
import type { EmpTabProps } from "./EmpEmpresaTab"
import { normTime, useEmpHorario } from "./useEmpHorario"

const REASON = "Solo Gerencia (rol 1) puede cambiar el horario laboral."

export function EmpHorarioTab({ onDirty, onGoto }: EmpTabProps) {
  const h = useEmpHorario(onDirty)
  const { draft: d, errs, base } = h
  if (h.status === "load") return <EmpLoading what="el horario laboral" hours />
  if (h.status === "forbidden") return <EmpForbidden reason={REASON} />
  if (h.status === "error") return <EmpError what="el horario laboral" message={h.failure?.message} onRetry={() => void h.load()} />
  if (h.status === "nocompany" || !base) return <EmpNoCompany onGoto={() => onGoto?.("company")} />

  const noc = !errs.ini && !errs.fin && d.ini > d.fin
  const bad = !!(errs.ini || errs.fin)
  let kind: SaveKind = "clean"
  if (h.saving) kind = "saving"
  else if (bad && h.changed.length) kind = "err"
  else if (h.changed.length) kind = "dirty"
  else if (h.saved) kind = "saved"
  const names = bad ? ([errs.ini && "Hora de inicio", errs.fin && "Hora de cierre"].filter(Boolean) as string[]) : h.changed

  return (
    <>
      <div className="zn">
        {h.msg && <EmpNote kind="bad"><strong>No se pudo guardar el horario</strong>{h.msg}</EmpNote>}
        {h.saved && (
          <EmpNote kind="ok" acts={<button type="button" className="btn out" onClick={h.dismissSaved}>Entendido</button>}>
            <strong>Horario laboral actualizado</strong>
            {h.saved.avisos.length > 0 ? <>El servidor devolvió {pl(h.saved.avisos.length, "aviso")}:<ul>{h.saved.avisos.map(a => <li key={a}>{a}</li>)}</ul></> : "No hubo avisos."}
          </EmpNote>
        )}
        <div className="hz">
          <EmpCard sec="hor" title="Horario laboral" help="Para vendedores físicos.">
            <div className="cl">
              <button type="button" className="sw" role="switch" aria-checked={d.on} onClick={() => h.set({ on: !d.on })}>
                <span className="tr" />
                <span>Restringir el horario laboral · <span className={d.on ? "ok" : "neu"}>{d.on ? "Activa" : "Inactiva"}</span></span>
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <EmpField label="Hora de inicio (24 h)" time inputMode="numeric" value={d.ini} disabled={!d.on} error={errs.ini}
                  onChange={v => h.set({ ini: v.replace(/[^\d:]/g, "").slice(0, 5) })} onBlur={() => h.set({ ini: normTime(d.ini) })} />
                <EmpField label="Hora de cierre (24 h)" time inputMode="numeric" value={d.fin} disabled={!d.on} error={errs.fin}
                  onChange={v => h.set({ fin: v.replace(/[^\d:]/g, "").slice(0, 5) })} onBlur={() => h.set({ fin: normTime(d.fin) })} />
              </div>
              {noc && <EmpNote kind="inf" icon={Moon}><strong>Turno nocturno</strong>Empieza a las {d.ini} y termina a las {d.fin} del día siguiente: cruza la medianoche y es válido.</EmpNote>}
              {!d.on && <div className="hint">Activa la restricción para editar las horas.</div>}
              <EmpNote icon={ShieldCheck}>
                {d.on
                  ? <div><strong>Bloquea solo a vendedores físicos</strong> (rol 3, tipo físico). No bloquea a gerentes, administradores, auditores, afiliados ni vendedores online.</div>
                  : <div><strong>Sin restricción:</strong> los vendedores físicos operan a cualquier hora. Gerentes, administradores, auditores, afiliados y vendedores online nunca se bloquean.</div>}
              </EmpNote>
            </div>
          </EmpCard>
          <EmpPreview d={d} ahora={base.ahora_lima || "00:00"} dirty={h.changed.length > 0} />
        </div>
      </div>
      <EmpSaveBar kind={kind} tab="Horario" count={names.length} names={names} savedAt={h.saved?.at} onSave={() => void h.submit()} onDiscard={h.discard} />
    </>
  )
}
