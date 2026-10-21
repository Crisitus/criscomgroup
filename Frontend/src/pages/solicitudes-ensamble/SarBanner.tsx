import { CircleAlert, CircleCheck, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react"
import type { SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { ES, fDT, money } from "./sarCommon"
import { I } from "./sarParts"
import type { Banner } from "./useSarDetail"

type Tono = "ok" | "wn" | "er"
function contenido(b: Banner, s: SolicitudEnsamble): [Tono, LucideIcon, string, string] {
  switch (b.k) {
    case "save": {
      const hasta = s.estado === "cotizada" && s.valida_hasta ? ` y es válida hasta ${fDT(s.valida_hasta)}` : ""
      const aviso = b.recot ? (s.email_solicitante ? ` El servidor avisa por correo a ${s.email_solicitante}.` : " El cliente no dejó correo: avísale por WhatsApp.") : ""
      return ["ok", CircleCheck, b.recot ? "Cotización guardada" : "Cambios guardados", `${s.codigo_seguimiento} quedó ${ES[s.estado][0]}${hasta}${hasta.endsWith(".") ? "" : "."}${aviso}`]
    }
    case "conv": return ["ok", CircleCheck, b.ya ? "La solicitud ya estaba convertida" : "Cotización creada en borrador", `${b.numero || "La cotización"} se creó con el monto acordado de ${money(s.cotizacion_monto ?? 0)}. No se creó ninguna venta ni se movió stock.`]
    case "c409": return ["wn", TriangleAlert, "Esta solicitud no admite ese cambio", `Tus cambios no se guardaron (409). ${b.msg}`]
    default: return ["er", CircleAlert, "No se pudo completar la acción", b.msg]
  }
}

export function SarBanner({ b, s, onReload }: { b: Banner; s: SolicitudEnsamble; onReload: () => void }) {
  const [t, icon, h, p] = contenido(b, s)
  return (
    <div className={`bn ${t}`} role={t === "ok" ? "status" : "alert"}>
      {I(icon, 18)}
      <div className="tx"><b>{h}</b><p>{p}</p></div>
      {b.k === "c409" && <button type="button" className="btn out" onClick={onReload}>{I(RefreshCw, 16)}Recargar la solicitud</button>}
    </div>
  )
}

/** Aviso inline al cambiar de solicitud con cambios sin guardar (nada se guarda solo). */
export function SarLeave({ de, a, onStay, onDiscard }: { de: string; a: string; onStay: () => void; onDiscard: () => void }) {
  return (
    <div className="bn wn" role="group" aria-label="Cambios sin guardar">
      {I(TriangleAlert, 18)}
      <div className="tx">
        <b>Tienes cambios sin guardar en {de}</b>
        <p>Si abres {a}, perderás el monto y la nota que escribiste en {de}. Nada se guarda solo.</p>
        <div className="ba">
          <button type="button" className="btn out" onClick={onStay}>Seguir editando</button>
          <button type="button" className="btn out" onClick={onDiscard}>Descartar y abrir {a}</button>
        </div>
      </div>
    </div>
  )
}
