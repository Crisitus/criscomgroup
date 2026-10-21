import { Copy, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { MODO_ENSAMBLE_LABELS, type SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { SEP } from "./sarCommon"
import { EstadoChip, I, VigChip } from "./sarParts"

const copiar = async (codigo: string) => {
  try { await navigator.clipboard.writeText(codigo); toast.success("Código copiado") } catch { toast.error("No se pudo copiar el código") }
}

/** Codigo + chips (estado, modo, vigencia) -> cliente y WhatsApp. */
export function SarHead({ s }: { s: SolicitudEnsamble }) {
  const motivo = "Sin enlace de WhatsApp: el teléfono de la solicitud no es válido."
  return (
    <div className="dh">
      <div className="dh1">
        <button type="button" className="cpy" aria-label={`Copiar el código ${s.codigo_seguimiento}`} onClick={() => void copiar(s.codigo_seguimiento)}>{s.codigo_seguimiento}{I(Copy, 14)}</button>
        <EstadoChip e={s.estado} lg /><span className="tp">{MODO_ENSAMBLE_LABELS[s.modo]}</span><VigChip s={s} lg />
      </div>
      <div className="dh2">
        <div>
          <h2>{s.nombre_solicitante}</h2>
          <p className="cl">{[s.telefono_solicitante, s.email_solicitante ?? "No dejó correo", s.ciudad].join(SEP)}</p>
        </div>
        {s.whatsapp_url
          ? <a className="btn out" href={s.whatsapp_url} target="_blank" rel="noopener noreferrer">{I(MessageCircle, 16)}Escribir por WhatsApp</a>
          : <button type="button" className="btn out" aria-disabled="true" aria-describedby="sar-wa-why">{I(MessageCircle, 16)}Escribir por WhatsApp<span className="vh" id="sar-wa-why">{motivo}</span></button>}
      </div>
    </div>
  )
}
