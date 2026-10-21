// Piezas compartidas del port criscom-ecom-contenido (todas las páginas .pg-contenido).
// Nota: en oscuro, globals.css fuerza color en <span> fuera de .pg-home/.pg-chrome:
// aquí NO se usan spans; el texto en línea usa <i>, <b>, <small> o <em>.
import type { ReactNode } from "react"
import "@/styles/contenido.css"
import { CircleAlert, CircleCheck, Circle, TriangleAlert } from "lucide-react"

// Cabecera única del diseño: h1 en fila de 44px + bajada de una línea.
export function PageHead({ titulo, sub, read, accion, iconoSub }: {
  titulo: string
  sub?: ReactNode
  read?: boolean
  accion?: ReactNode
  iconoSub?: ReactNode
}) {
  return (
    <>
      <div className={read ? "ph read" : "ph"}>
        <h1>{titulo}</h1>
        {accion}
      </div>
      {sub !== undefined
        ? <p className={iconoSub ? "sub l" : "sub"}>{iconoSub}{sub}</p>
        : <div style={{ height: 16 }} aria-hidden="true" />}
    </>
  )
}

type Tono = "ok" | "bad" | "warn" | "pri" | "neu"
const ICONOS: Record<Tono, typeof Circle> = {
  ok: CircleCheck, bad: CircleAlert, warn: TriangleAlert, pri: Circle, neu: Circle,
}

// Estado = icono + palabra (nunca solo color).
export function Estado({ tono, texto, icono }: { tono: Tono; texto: string; icono?: typeof Circle }) {
  const Icono = icono ?? ICONOS[tono]
  return (
    <i className={`st ${tono}`} style={{ fontStyle: "normal" }}>
      <Icono size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
      {texto}
    </i>
  )
}

// Alerta plana con rol según severidad (bad/warn = alert, info = status).
export function Alerta({ tono, icono, titulo, children }: {
  tono: "bad" | "warn"
  icono?: ReactNode
  titulo: string
  children?: ReactNode
}) {
  const Icono = tono === "bad" ? CircleAlert : TriangleAlert
  return (
    <div className={`alert ${tono}`} role="alert">
      <i className="ic" style={{ fontStyle: "normal" }}>{icono ?? <Icono size={20} strokeWidth={1.75} className="pg-ic" aria-hidden />}</i>
      <div>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
