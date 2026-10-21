import { Link } from "react-router-dom"
import { CircleAlert, FileX, Inbox, Lock, RefreshCw, TriangleAlert } from "lucide-react"
import { I, Msg } from "./sarParts"
import type { ListStatus } from "./useSarList"
import type { DetStatus } from "./useSarDetail"

const retry = (fn: () => void) => <button type="button" className="btn pri" onClick={fn}>{I(RefreshCw, 16)}Reintentar</button>

/** Estados de pantalla completa de la bandeja (permiso, sesion, error, vacio). */
export function ListPanel({ status, onRetry }: { status: ListStatus | "empty"; onRetry: () => void }) {
  if (status === "forbidden") {
    return (
      <Msg icon={Lock} title="Acceso denegado" action={<Link className="btn out" to="/">Volver al Dashboard</Link>}>
        Solo la cuenta maestra, con el módulo ecommerce activo, puede ver y gestionar las cotizaciones de armado. Si necesitas acceso, pídelo a quien administra la cuenta maestra.
      </Msg>
    )
  }
  if (status === "unauth") {
    return <Msg icon={CircleAlert} title="Tu sesión venció" action={<Link className="btn pri" to="/login">Iniciar sesión</Link>}>Vuelve a iniciar sesión para seguir gestionando las cotizaciones de armado.</Msg>
  }
  if (status === "error") {
    return <Msg error icon={TriangleAlert} title="No se pudieron cargar las solicitudes" action={retry(onRetry)}>El servidor no pudo atender la solicitud. Tus filtros se conservaron; vuelve a intentarlo.</Msg>
  }
  return <Msg icon={Inbox} title="Aún no hay solicitudes de armado">Las solicitudes que los clientes envíen desde criscomgroup.pe/armar-pc aparecerán aquí.</Msg>
}

/** Panel derecho cuando la solicitud no se pudo cargar. */
export function DetailPanel({ status, onRetry }: { status: DetStatus; onRetry: () => void }) {
  const bad = status === "error"
  const [icon, title, text] = status === "forbidden" ? [Lock, "Sin permiso para ver esta solicitud", "Solo la cuenta maestra puede abrir las cotizaciones de armado."]
    : status === "notfound" ? [FileX, "La solicitud ya no existe", "No se encontró en el servidor. Actualiza la lista para ver las solicitudes actuales."]
    : [TriangleAlert, "No se pudo cargar la solicitud", "El servidor no pudo atender la solicitud. Vuelve a intentarlo."]
  return (
    <section className="dp">
      <div className={`em${bad ? " er" : ""}`} role={bad ? "alert" : "status"}>
        <span className="ico">{I(icon, 24)}</span><h3>{title}</h3><p>{text}</p>{status !== "forbidden" && retry(onRetry)}
      </div>
    </section>
  )
}

export const DetailSkeleton = () => (
  <section className="dp" role="status" aria-label="Cargando detalle">
    <div className="skb">
      <div className="sk" style={{ width: "40%", height: 16 }} /><div className="sk" style={{ width: "60%", height: 22 }} />
      <div className="sk" style={{ height: 200, borderRadius: 8 }} /><div className="sk" style={{ height: 44, borderRadius: 8 }} />
      <div className="sk" style={{ height: 44, borderRadius: 8 }} /><div className="sk" style={{ height: 96, borderRadius: 8 }} />
    </div>
  </section>
)

export const DetailEmpty = () => (
  <section className="dp"><div className="em"><span className="ico">{I(Inbox, 22)}</span><h3>Ninguna solicitud seleccionada</h3><p>Elige una solicitud de la lista para ver su detalle.</p></div></section>
)
