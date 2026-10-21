import { CircleAlert, ExternalLink, MessageCircle } from "lucide-react"
import type { SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { Q, SEP, TIPO, usd } from "./simCommon"
import { I } from "./simParts"

const SITIO = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? "https://criscomgroup.pe"
const textoWa = (url: string | null) => {
  try { return decodeURIComponent((url ?? "").split("text=")[1] ?? "") } catch { return "" }
}

function presupuesto(r: Sol) {
  if (r.presupuesto_min != null && r.presupuesto_max != null) return `${usd(r.presupuesto_min)} – ${usd(r.presupuesto_max)}`
  if (r.presupuesto_max != null) return `Hasta ${usd(r.presupuesto_max)}`
  if (r.presupuesto_min != null) return `Desde ${usd(r.presupuesto_min)}`
  return null
}

/** Cliente (con WhatsApp manual y atajo al seguimiento publico) y pedido. */
export function SimSecPedido({ r, k }: { r: Sol; k: string }) {
  const pres = presupuesto(r)
  const wa = r.whatsapp_url
    ? <a className="btn out" href={r.whatsapp_url} target="_blank" rel="noopener noreferrer">{I(MessageCircle, 16)}Escribir por WhatsApp{I(ExternalLink, 14)}</a>
    : <button type="button" className="btn out" aria-disabled="true" aria-describedby={`${k}-nowa`}>{I(MessageCircle, 16)}Escribir por WhatsApp</button>
  return (
    <section className="sec" aria-labelledby={`${k}-h1`}>
      <h3 id={`${k}-h1`}>Cliente y pedido</h3>
      <div className="two">
        <div>
          <div className="cl2"><span className="cn">{r.nombre_solicitante}</span><span>{r.email_solicitante}</span><span>{r.telefono_solicitante || "Sin teléfono registrado"}</span></div>
          <div className="acts">
            {wa}
            <a className="btn txt" href={`${SITIO}/seguimiento-solicitud/${r.codigo_seguimiento}`} target="_blank" rel="noopener noreferrer">{I(ExternalLink, 14)}Ver seguimiento</a>
          </div>
          {r.whatsapp_url
            ? <div className="wp">{I(MessageCircle, 14)}<span>Se abre en otra pestaña con el mensaje <q>{textoWa(r.whatsapp_url)}</q> Lo envía una persona, nunca el sistema.</span></div>
            : <div className="hn" id={`${k}-nowa`} style={{ marginTop: 8 }}>{I(CircleAlert, 14)}<span>Sin teléfono registrado: no se puede abrir WhatsApp.</span></div>}
        </div>
        <dl className="dl">
          <dt>Tipo</dt><dd>{[TIPO[r.tipo_producto] ?? r.tipo_producto, r.marca, r.modelo].filter(Boolean).join(SEP)}</dd>
          <dt>Origen</dt><dd>{r.pais_origen || "No indicó"}</dd>
          <dt>Cantidad</dt><dd>{r.cantidad}</dd>
          {pres && <><dt>Presupuesto</dt><dd>{pres}</dd></>}
          {r.especificaciones && <><dt>Detalle</dt><dd>{r.especificaciones}</dd></>}
        </dl>
      </div>
      {r.mensaje && <div className="msg"><small>Mensaje del cliente</small>{Q(r.mensaje)}</div>}
    </section>
  )
}
