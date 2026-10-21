import { useId } from "react"
import { Ban, CircleAlert } from "lucide-react"
import type { Block } from "./useSunData"
import type { EmisoresRespuesta } from "../../../services/facturacionService"
import { BlockError, EmitterSkeleton, EmptyEmitters } from "./SunBlocks"
import { SunEditForm } from "./SunEditForm"
import { SunEmitterCard, type Ctl } from "./SunEmitterCard"
import { I, Why } from "./sunShared"
import { MOTIVO_MAESTRA, MOTIVO_RUC20_NADA, MOTIVO_RUC20_ROL } from "./sunCommon"

function Ruc20Row({ n, canEdit, ctl }: { n: number; canEdit: boolean; ctl: Ctl }) {
  const id = useId()
  const reason = !canEdit ? MOTIVO_RUC20_ROL : n > 0 ? "" : MOTIVO_RUC20_NADA
  const word = n > 0 ? `${n} emisor${n > 1 ? "es" : ""} RUC 20 habilitado${n > 1 ? "s" : ""}` : "RUC 20 bloqueado"
  return (
    <section className="card r20" aria-label="RUC 20">
      <div className="t"><span className={`tn ${n > 0 ? "warn" : "neu"}`}>{I(n > 0 ? CircleAlert : Ban, 18)}</span>RUC 20</div>
      <div className="x">{word}</div>
      <button type="button" className="btn out" aria-disabled={reason ? true : undefined} aria-describedby={reason ? id : undefined} onClick={() => { if (!reason) ctl.openBlock() }}>{I(Ban)}Bloquear RUC 20</button>
      {reason && <Why id={id}>{reason}</Why>}
    </section>
  )
}

export function SunEmitters({ block, ctl, mob, onRetry }: { block: Block<EmisoresRespuesta>; ctl: Ctl; mob: boolean; onRetry: () => void }) {
  if (block.status === "loading") return <div className="lcol"><EmitterSkeleton /><EmitterSkeleton /></div>
  if (block.status === "403" || block.status === "500" || block.status === "red") {
    return <div className="lcol"><BlockError status={block.status} what="los emisores fiscales" message={block.message} onRetry={onRetry} /></div>
  }
  const d = block.data
  if (!d) return null
  const canEdit = d.permisos.puede_editar
  const prod = d.sunat.mode === "production"
  const current = d.emisores.find(e => e.emisor_predeterminado)
  const reasonFor = (e: (typeof d.emisores)[number]) =>
    !canEdit ? d.permisos.motivo || MOTIVO_MAESTRA
    : prod && !(e.certificado_configurado && e.credenciales_sol_configuradas) ? "Falta el certificado de este emisor: en Producción no se puede habilitar ni hacer predeterminado" : ""
  return (
    <div className="lcol">
      <h2 className="sr">Emisores</h2>
      {block.status === "vacio" ? <EmptyEmitters /> : d.emisores.map(e => (
        ctl.edit && ctl.edit.id === e.id_company ? <SunEditForm key={e.id_company ?? e.ruc} e={e} ctl={ctl} mob={mob} />
          : <SunEmitterCard key={e.id_company ?? e.ruc} e={e} reason={reasonFor(e)} current={current} ctl={ctl} />
      ))}
      <Ruc20Row n={d.ruc20_habilitados_pendientes} canEdit={canEdit} ctl={ctl} />
    </div>
  )
}
