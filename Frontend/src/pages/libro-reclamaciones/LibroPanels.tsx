import { Link } from "react-router-dom"
import { CircleAlert, FileX, Inbox, Lock, RefreshCw, TriangleAlert } from "lucide-react"
import { I, Msg } from "./libroParts"
import type { ListStatus } from "./useLibroList"
import type { DetStatus } from "./useLibroDetail"

const retry = (fn: () => void) => <button type="button" className="btn pri" onClick={fn}>{I(RefreshCw, 16)}Reintentar</button>

/** Estados de pantalla completa de la bandeja (permiso, sesion, error, vacio). */
export function ListPanel({ status, onRetry }: { status: ListStatus | "empty"; onRetry: () => void }) {
  if (status === "forbidden") {
    return (
      <Msg icon={Lock} title="Sin permiso para ver el Libro de reclamaciones"
        action={<Link className="btn out" to="/">Volver al Dashboard</Link>}>
        Esta pantalla es solo para los roles 1 y 2 (personal de atención). Puedes pedir acceso en «Solicitudes de acceso».
      </Msg>
    )
  }
  if (status === "unauth") {
    return <Msg icon={CircleAlert} title="Tu sesión venció" action={<Link className="btn pri" to="/login">Iniciar sesión</Link>}>Vuelve a iniciar sesión para seguir gestionando las hojas.</Msg>
  }
  if (status === "error") {
    return <Msg error icon={TriangleAlert} title="No se pudieron cargar las hojas" action={retry(onRetry)}>El servidor no pudo atender la solicitud. Tus filtros se conservaron; vuelve a intentarlo.</Msg>
  }
  return (
    <Msg icon={Inbox} title="Aún no hay hojas de reclamación">
      Las hojas que los consumidores envíen desde criscomgroup.pe/libro-reclamaciones aparecerán aquí. Cuando haya hojas podrás exportarlas.
    </Msg>
  )
}

/** Panel derecho cuando la hoja no se pudo cargar. */
export function DetailPanel({ status, onRetry }: { status: DetStatus; onRetry: () => void }) {
  const bad = status === "error"
  const [icon, title, text] = status === "forbidden" ? [Lock, "Sin permiso para ver esta hoja", "Tu rol no puede abrir las hojas del Libro de reclamaciones."]
    : status === "notfound" ? [FileX, "La hoja ya no existe", "No se encontró en el servidor. Actualiza la lista para ver las hojas actuales."]
    : [TriangleAlert, "No se pudo cargar la hoja", "El servidor no pudo atender la solicitud. Vuelve a intentarlo."]
  return (
    <section className="dp">
      <div className={`em${bad ? " er" : ""}`} role={bad ? "alert" : "status"}>
        <span className="ico">{I(icon, 24)}</span><h3>{title}</h3><p>{text}</p>{status !== "forbidden" && retry(onRetry)}
      </div>
    </section>
  )
}
