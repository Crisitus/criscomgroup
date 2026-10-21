import { Link } from "react-router-dom"
import { CircleAlert, ClipboardList, FileX, Lock, RefreshCw, TriangleAlert } from "lucide-react"
import { I, Msg } from "./simParts"
import type { ListStatus } from "./useSimList"
import type { DetStatus } from "./useSimDetail"

const retry = (fn: () => void) => <button type="button" className="btn pri" onClick={fn}>{I(RefreshCw, 16)}Reintentar</button>

/** Estados de pantalla completa de la bandeja: permiso, sesion, error y vacio real. */
export function ListPanel({ status, msg, onRetry }: { status: ListStatus | "empty"; msg: string; onRetry: () => void }) {
  if (status === "forbidden") {
    return (
      <Msg icon={Lock} title="Sin permiso para ver las solicitudes de importación" action={<Link className="btn out" to="/">Volver al Dashboard</Link>}>
        Esta pantalla es solo para la cuenta maestra (Gerencia). Si necesitas acceso, pídelo desde «Solicitudes de acceso».
      </Msg>
    )
  }
  if (status === "unauth") {
    return <Msg icon={CircleAlert} title="Tu sesión venció" action={<Link className="btn pri" to="/login">Iniciar sesión</Link>}>Vuelve a iniciar sesión para seguir gestionando las solicitudes.</Msg>
  }
  if (status === "error") {
    return (
      <Msg error icon={TriangleAlert} title="No se pudieron cargar las solicitudes" action={retry(onRetry)}>
        {msg || "El servidor no pudo atender la solicitud."} Tu búsqueda y tus filtros se conservaron; vuelve a intentarlo.
      </Msg>
    )
  }
  return (
    <Msg icon={ClipboardList} title="Aún no hay solicitudes de importación">
      Las solicitudes que los clientes envíen desde el formulario público de la tienda (criscomgroup.pe/solicitud-importacion) aparecerán aquí con su código de seguimiento.
    </Msg>
  )
}

/** Panel derecho cuando la solicitud no se pudo cargar. */
export function DetailPanel({ status, onRetry }: { status: DetStatus; onRetry: () => void }) {
  const bad = status === "error"
  const [icon, title, text] = status === "forbidden" ? [Lock, "Sin permiso para ver esta solicitud", "Solo la cuenta maestra puede abrir las solicitudes de importación."]
    : status === "notfound" ? [FileX, "La solicitud ya no existe", "No se encontró en el servidor. Actualiza la lista para ver las solicitudes actuales."]
    : [TriangleAlert, "No se pudo cargar la solicitud", "El servidor no pudo atender la solicitud. Vuelve a intentarlo."]
  return (
    <section className="dp">
      <div className={`es${bad ? " er" : ""}`} role={bad ? "alert" : "status"}>
        <span className="eic2">{I(icon, 22)}</span><h2>{title}</h2><p>{text}</p>{bad && retry(onRetry)}
      </div>
    </section>
  )
}

export const DetailEmpty = () => (
  <section className="dp" aria-label="Detalle">
    <div className="hint0">{I(ClipboardList, 24)}<b style={{ color: "hsl(var(--foreground))" }}>Elige una solicitud</b><span>Su detalle y la gestión aparecen aquí, sin ventana emergente.</span></div>
  </section>
)

export const DetailSkeleton = () => (
  <section className="dp" aria-busy="true" aria-label="Cargando detalle">
    <div className="dh"><span className="sk" style={{ width: "60%", height: 16 }} /><span className="sk" style={{ width: "40%", height: 22, marginTop: 6 }} /></div>
    <div className="db">
      <div className="sec"><span className="sk" style={{ width: "30%", height: 14, marginBottom: 12 }} /><span className="sk" style={{ width: "90%", height: 12, marginBottom: 8 }} /><span className="sk" style={{ width: "70%", height: 12 }} /></div>
      <div className="sec"><span className="sk" style={{ width: "25%", height: 14, marginBottom: 12 }} /><span className="sk" style={{ width: "100%", height: 60 }} /></div>
    </div>
  </section>
)
