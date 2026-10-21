import { Clock } from "lucide-react"
import type { SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { fCivil, fD, fDT, money } from "./sarCommon"
import { I, VigChip } from "./sarParts"

/** Resumen de la cotizacion vigente (monto, vigencia, entrega) y aviso de vencida. */
export function SarQuote({ s }: { s: SolicitudEnsamble }) {
  return (
    <>
      {s.cotizacion_monto != null && (
        <div className="cot">
          <div><div className="big">{money(s.cotizacion_monto)}</div><div className="cap">Monto cotizado al cliente · IGV incluido</div></div>
          <dl>
            <div><dt>Válida hasta</dt><dd>{s.valida_hasta ? fDT(s.valida_hasta) : "—"}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{s.fecha_entrega_estimada ? fCivil(s.fecha_entrega_estimada) : "Sin fecha"}</dd></div>
            {s.estado === "cotizada" && s.valida_hasta && <div><dt>Vigencia</dt><dd><VigChip s={s} /></dd></div>}
          </dl>
        </div>
      )}
      {s.vencida && s.estado === "cotizada" && s.valida_hasta && (
        <div className="bn wn" role="status">
          {I(Clock, 18)}
          <div className="tx"><b>La cotización venció el {fD(s.valida_hasta)}</b><p>Para renovarla, cambia el monto o devuelve la solicitud a revisión y cotízala de nuevo: la vigencia se renueva al cotizar.</p></div>
        </div>
      )}
    </>
  )
}
