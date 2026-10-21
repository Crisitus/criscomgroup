import { ChevronRight, CircleAlert, Eye, Info, TriangleAlert } from "lucide-react"
import type { AccionPosterior, SolicitudPostventa } from "../../services/postventaService"
import { ACC, EST, ESTI, MIN_RESP, TR } from "./pvCommon"
import type { Draft, Errs, FieldKey, PanelFlags } from "./pvDraft"
import { I, StateChip } from "./pvParts"

type Props = {
  c: SolicitudPostventa
  d: Draft
  errs: Errs
  f: PanelFlags
  notesOpen: boolean
  onState: (e: Draft["estado"]) => void
  onField: (f: Exclude<FieldKey, "estado">, v: string) => void
  onToggleNotes: (open: boolean) => void
}

/** Selector de estado: solo la transicion actual + las validas desde ese estado. */
export function StateOptions({ c, d, f, onState }: Pick<Props, "c" | "d" | "f" | "onState">) {
  if (f.closed) {
    return <div className="rop"><StateChip e={c.estado} size={16} /><span className="mut" style={{ fontWeight: 400, fontSize: 13 }}>Cerrada: no admite cambios de estado.</span></div>
  }
  return (
    <div className="opts" role="radiogroup" aria-label="Estado">
      {[c.estado, ...TR[c.estado]].map(e => {
        const [Icon] = ESTI[e]
        return (
          <button key={e} type="button" className="opt" role="radio" aria-checked={d.estado === e} aria-disabled={f.lock || undefined}
            onClick={() => { if (!f.lock) onState(e) }}>
            {I(Icon, 16)}{EST[e]}{e === c.estado && <small>(actual)</small>}
          </button>
        )
      })}
    </div>
  )
}

export function RespuestaField({ d, errs, f, onField, id }: Pick<Props, "d" | "errs" | "f" | "onField"> & { id: string }) {
  const bad = f.need && f.len < MIN_RESP
  const cnt = bad ? `${f.len} / ${MIN_RESP} mínimo` : `${f.len} / 2000`
  return (
    <div className={`fld${errs.resp ? " err" : ""}`}>
      <div className="lb"><span>Respuesta al cliente . pública{f.need && <> <i aria-hidden="true">*</i></>}</span><span className={`cnt ${bad ? "bad" : f.need ? "ok" : "neu"}`}>{cnt}</span></div>
      <textarea className="ta" id={`f-resp-${id}`} rows={2} maxLength={2000} value={d.resp} disabled={f.lock}
        aria-describedby={`h-resp-${id}${errs.resp ? ` e-resp-${id}` : ""}`} aria-invalid={!!errs.resp || undefined}
        placeholder={f.need ? `Obligatoria: mínimo ${MIN_RESP} caracteres.` : "Opcional en este estado."}
        onChange={e => onField("resp", e.target.value)} />
      {errs.resp && <div className="why bad" id={`e-resp-${id}`} role="alert">{I(CircleAlert, 14)}{errs.resp}</div>}
      <div className="hint" id={`h-resp-${id}`}>{I(Eye, 13, "")}{" "}El cliente verá este texto al consultar su código. No ve su correo, teléfono, detalle, pedido ni tus notas internas.</div>
    </div>
  )
}

export function NotasField({ d, f, notesOpen, onField, onToggleNotes, id }: Pick<Props, "d" | "f" | "notesOpen" | "onField" | "onToggleNotes"> & { id: string }) {
  return (
    <details className="nt" open={!!d.notas || notesOpen} onToggle={e => onToggleNotes((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{I(ChevronRight, 16)}Notas internas <span>. el cliente nunca las ve</span></summary>
      <div className="fld">
        <textarea className="ta" id={`f-notas-${id}`} rows={2} maxLength={2000} aria-label="Notas internas" value={d.notas} disabled={f.lock}
          onChange={e => onField("notas", e.target.value)} />
      </div>
    </details>
  )
}

export function AccionField({ d, errs, f, onField, id }: Pick<Props, "d" | "errs" | "f" | "onField"> & { id: string }) {
  if (!f.showAcc) {
    return f.closed ? null : <div className="why neu">{I(Info, 14)}<span>Acción posterior: solo con estado Aprobada o Resuelta.</span></div>
  }
  const off = f.lock && !errs.acc
  return (
    <div className={`fld${errs.acc ? " err" : ""}`}>
      <div className="row2">
        <div className="fld">
          <label htmlFor={`f-acc-${id}`}>Acción posterior</label>
          <select className="sl" id={`f-acc-${id}`} value={d.acc} disabled={off} onChange={e => onField("acc", e.target.value as AccionPosterior)}>
            {(Object.keys(ACC) as AccionPosterior[]).map(k => <option key={k} value={k}>{ACC[k]}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor={`f-accN-${id}`}>Nota de la acción <span className="mut" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input className="in" id={`f-accN-${id}`} maxLength={1000} value={d.accN} disabled={off} onChange={e => onField("accN", e.target.value)} />
        </div>
      </div>
      {errs.acc && <div className="why bad" id={`e-acc-${id}`} role="alert">{I(CircleAlert, 14)}{errs.acc}</div>}
      <div className="why">{I(TriangleAlert, 14)}<span>Solo deja constancia: no mueve dinero ni stock.</span></div>
    </div>
  )
}

