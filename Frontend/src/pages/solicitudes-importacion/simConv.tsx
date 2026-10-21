import { Link } from "react-router-dom"
import { ExternalLink, Ship } from "lucide-react"
import type { SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { ESTADO, Q, fDT } from "./simCommon"
import { I, Spin } from "./simParts"

/** Convertir es idempotente: con importacion_id solo hay enlace; sin ella, boton con la consecuencia exacta. */
export function convInfo({ r, k, busy, onConvertir }: { r: Sol; k: string; busy: boolean; onConvertir: () => void }) {
  const idNo = `${k}-nocv`
  if (r.importacion_id != null) {
    return {
      txt: <>Convertida{r.convertida_en ? ` el ${fDT(r.convertida_en)}` : ""}. Búscala en Importaciones con el código {r.codigo_seguimiento}.</>,
      ctl: <Link className="lk" to="/imports">{I(Ship, 16)}Importación #{r.importacion_id}{I(ExternalLink, 14)}</Link>, id: "",
    }
  }
  if (busy) {
    return { id: "", txt: <>Creando la importación planificada… no vuelvas a pulsar: es idempotente.</>, ctl: <button type="button" className="btn out" aria-disabled="true" aria-busy="true"><Spin />Convirtiendo…</button> }
  }
  if (r.estado === "cotizada" || r.estado === "aprobada") {
    return {
      id: "", txt: <>Crea una importación planificada: proveedor «Por definir», costo de mercancía 0, sin dinero ni stock. Si ya existe, no se duplica.</>,
      ctl: <button type="button" className="btn out" onClick={onConvertir}>{I(Ship, 16)}Convertir en importación</button>,
    }
  }
  return {
    id: idNo, txt: <>Solo se convierten solicitudes cotizadas o aprobadas (estado actual: {Q(ESTADO[r.estado].l.toLowerCase())}).</>,
    ctl: <button type="button" className="btn out" aria-disabled="true" aria-describedby={idNo}>{I(Ship, 16)}Convertir en importación</button>,
  }
}

