import { useId } from "react"
import { CircleAlert, CircleCheck, Lock, Pencil, Star } from "lucide-react"
import type { EmisorSunat } from "../../../services/facturacionService"
import { I, Why } from "./sunShared"
import { origen } from "./sunCommon"
import type { useSunEmitters } from "./useSunEmitters"

export type Ctl = ReturnType<typeof useSunEmitters>

const Si = ({ ok, label, yes, no, src }: { ok: boolean; label: string; yes: string; no: string; src?: string }) => (
  <div className="si">
    <span className={`tn ${ok ? "ok" : "warn"}`}>{I(ok ? CircleCheck : CircleAlert, 16)}</span>
    <span><span className="w">{label}: {ok ? yes : no}</span> <span className="mut">· Origen: {origen(src)}</span></span>
  </div>
)

export function SunEmitterCard({ e, reason, current, ctl }: { e: EmisorSunat; reason: string; current?: EmisorSunat; ctl: Ctl }) {
  const whyId = useId()
  const off = !!reason
  const asking = ctl.confirmDef === e.id_company
  const err = ctl.defErr && ctl.defErr.id === e.id_company ? ctl.defErr.message : ""
  const btn = (label: string, Icon: typeof Pencil, run: () => void) => (
    <button type="button" className="btn out sm" aria-disabled={off || undefined} aria-describedby={off ? whyId : undefined} onClick={() => { if (!off) run() }}>{I(Icon)}{label}</button>
  )
  return (
    <article className="card ecard">
      <div className="nm">{e.razon_social}</div>
      <div className="ln">
        <span className="num"><b>RUC</b> {e.ruc}</span>
        <span className="sutag">{I(e.facturacion_habilitada ? CircleCheck : Lock, 12)}{e.facturacion_habilitada ? "Habilitado" : "Deshabilitado"}</span>
        {e.emisor_predeterminado && <span className="st pri">{I(Star, 14)}Predeterminado</span>}
      </div>
      <div className="susub">{e.direccion || "Domicilio fiscal pendiente"}</div>
      <div className="ser">
        <div><span>Serie de factura</span><b className="num">{e.serie_factura}</b></div>
        <div><span>Serie de boleta</span><b className="num">{e.serie_boleta}</b></div>
      </div>
      <Si ok={!!e.credenciales_sol_configuradas} label="SOL" yes="Configuradas" no="Pendientes" src={e.origen_credenciales} />
      <Si ok={!!e.certificado_configurado} label="Certificado" yes="Configurado" no="Pendiente" src={e.origen_certificado} />
      {err && <div className="er4" role="alert">{I(CircleAlert, 16)}<div><b>No se cambió el emisor predeterminado.</b><br />{err}</div></div>}
      {asking ? (
        <div className="cf" role="group" aria-label="Confirmar emisor predeterminado">
          <p><b>¿Hacer predeterminado a este emisor?</b> Dejará de serlo {current ? current.razon_social : "el emisor actual"}: solo hay un emisor predeterminado.</p>
          <div className="acts2">
            <button type="button" className="btn out sm" onClick={ctl.cancelDefault} disabled={ctl.defBusy}>Cancelar</button>
            <button type="button" className="btn sm" onClick={() => void ctl.doDefault()} disabled={ctl.defBusy}>{ctl.defBusy ? "Guardando…" : "Hacer predeterminado"}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="acts2">
            {btn("Editar series", Pencil, () => ctl.startEdit(e))}
            {!e.emisor_predeterminado && btn("Hacer predeterminado", Star, () => e.id_company && ctl.askDefault(e.id_company))}
          </div>
          {off && <Why id={whyId}>{reason}</Why>}
        </>
      )}
    </article>
  )
}

