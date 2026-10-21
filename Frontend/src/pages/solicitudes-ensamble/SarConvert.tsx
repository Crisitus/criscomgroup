import { Link } from "react-router-dom"
import { CircleCheck, ExternalLink, FileText, Lock } from "lucide-react"
import type { SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { RUTA_COTIZACIONES, fDT, motivoConversion, numeroCotizacion } from "./sarCommon"
import { I } from "./sarParts"

/** Banda de conversion: disponible / deshabilitada con motivo / ya convertida con enlace a Cotizaciones. */
export function SarConvert({ s, busy, onConvert }: { s: SolicitudEnsamble; busy: boolean; onConvert: () => void }) {
  if (s.cotizacion_id != null) {
    return (
      <section className="conv ok">
        {I(CircleCheck, 20)}
        <div className="tx"><b>Convertida en cotización profesional</b><p>{s.convertida_en ? `Creada en borrador el ${fDT(s.convertida_en)}. ` : ""}No se vuelve a convertir.</p></div>
        <Link className="btn out" to={RUTA_COTIZACIONES}>Cotización {numeroCotizacion(s)}{I(ExternalLink, 16)}</Link>
      </section>
    )
  }
  const why = motivoConversion(s)
  const id = `cv-${s.id_solicitud}`
  const off = !!why || busy
  return (
    <section className="conv">
      <div className="tx">
        <b>Convertir en cotización profesional</b>
        {why ? <p id={id} className="why" style={{ marginTop: 4 }}>{I(Lock, 14)}<span>{why}</span></p>
          : <p>Crea una cotización profesional en borrador con el monto acordado. No crea venta ni mueve stock.</p>}
      </div>
      <button type="button" className="btn out" aria-disabled={off} aria-describedby={why ? id : undefined} onClick={() => { if (!off) onConvert() }}>
        {I(FileText, 16)}{busy ? "Convirtiendo…" : "Convertir en cotización profesional"}
      </button>
    </section>
  )
}
