import { CircleAlert, CircleCheck, Info, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import type { Banner } from "./useLibroDetail"
import { I } from "./libroParts"

type Tono = "ok" | "wn" | "er"
function contenido(b: Banner, r: Reclamacion): [Tono, LucideIcon, string, string] {
  switch (b.k) {
    case "enviado": return ["ok", CircleCheck, "Respuesta enviada", `La hoja pasó a Respondido y el correo a ${r.email} salió (correo: enviado).`]
    case "omitido": return ["wn", Info, "Respuesta guardada, correo omitido", "La hoja pasó a Respondido, pero no se envió ningún correo (correo: omitido)."]
    case "error": return ["er", CircleAlert, "Respuesta guardada, pero el correo no salió", "La hoja quedó Respondida y el correo al consumidor falló (correo: error). Avísale por otro medio."]
    case "c409": return ["wn", TriangleAlert, "Otra persona modificó esta hoja", "Tu acción no se aplicó: la hoja cambió mientras la editabas o ya está en ese estado (409). Recarga para ver su estado actual."]
    default: return ["er", CircleAlert, "No se pudo completar la acción", b.msg]
  }
}

export function LibroBanner({ b, r, onReload }: { b: Banner; r: Reclamacion; onReload: () => void }) {
  const [t, icon, h, p] = contenido(b, r)
  return (
    <div className={`bn ${t}`} role={t === "ok" ? "status" : "alert"}>
      {I(icon, 18)}
      <div className="tx"><b>{h}</b><p>{p}</p></div>
      {b.k === "c409" && <button type="button" className="btn out" onClick={onReload}>{I(RefreshCw, 16)}Recargar hoja</button>}
    </div>
  )
}
