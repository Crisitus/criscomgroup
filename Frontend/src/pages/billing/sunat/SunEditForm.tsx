import { useId } from "react"
import { createPortal } from "react-dom"
import { CircleAlert, Lock } from "lucide-react"
import type { EmisorSunat } from "../../../services/facturacionService"
import { I } from "./sunShared"
import type { Ctl } from "./SunEmitterCard"
import type { EditVals } from "./useSunEmitters"

const LABEL: Record<keyof EditVals, string> = { razon_social: "Razón social", direccion: "Domicilio fiscal", serie_factura: "Serie de factura", serie_boleta: "Serie de boleta" }

function Field({ k, id, ctl }: { k: keyof EditVals; id: string; ctl: Ctl }) {
  const edit = ctl.edit!
  const er = edit.errs[k]
  return (
    <div className="ff">
      <label htmlFor={id}>{LABEL[k]}</label>
      <div className={`inp${er ? " bad" : ""}`}>
        <input id={id} value={edit.vals[k]} autoComplete="off" disabled={edit.busy} maxLength={k.startsWith("serie") ? 4 : 255}
          aria-invalid={er ? true : undefined} aria-describedby={er ? `${id}-e` : undefined}
          onChange={ev => ctl.setField(k, ev.target.value)} />
      </div>
      {er && <p className="fe" id={`${id}-e`}>{I(CircleAlert, 14)}<span>{er}</span></p>}
    </div>
  )
}

export function SunEditForm({ e, ctl, mob }: { e: EmisorSunat; ctl: Ctl; mob: boolean }) {
  const edit = ctl.edit!
  const formId = useId()
  const keys = Object.keys(edit.errs).filter(k => edit.errs[k]) as (keyof EditVals)[]
  const p = `sun-${e.id_company}-`
  const foot = (
    <>
      <p className="note">Al guardar, este emisor queda habilitado y predeterminado.</p>
      <div className="fb">
        <button type="button" className="btn out" onClick={ctl.cancelEdit} disabled={edit.busy}>Cancelar</button>
        <button type="submit" form={formId} className="btn" disabled={edit.busy}>{edit.busy ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </>
  )
  return (
    <form id={formId} className={`card ecard eform${mob ? " withfoot" : ""}`} onSubmit={ev => { ev.preventDefault(); void ctl.save() }} aria-label="Editar series">
      <div className="nm">Editar series</div>
      <div className="ln"><span className="num"><b>RUC</b> {e.ruc}</span><span className="sutag">{I(Lock, 12)}El RUC no se edita aquí</span></div>
      {(keys.length > 0 || edit.summary) && (
        <div className="sum" role="alert">
          {I(CircleAlert, 18)}
          <div>
            <b>{keys.length ? `No se guardó: revisa ${keys.length} ${keys.length > 1 ? "campos" : "campo"}` : "No se guardó"}</b>
            {keys.length ? <ul>{keys.map(k => <li key={k}>{LABEL[k]}: {edit.errs[k]}</li>)}</ul> : <p>{edit.summary}</p>}
          </div>
        </div>
      )}
      <Field k="razon_social" id={`${p}rs`} ctl={ctl} />
      <Field k="direccion" id={`${p}dir`} ctl={ctl} />
      <div className="frow"><Field k="serie_factura" id={`${p}fa`} ctl={ctl} /><Field k="serie_boleta" id={`${p}bo`} ctl={ctl} /></div>
      {mob ? createPortal(<div className="pg-sunat dlgw sfoot fixed">{foot}</div>, document.body) : <div className="sfoot">{foot}</div>}
    </form>
  )
}
