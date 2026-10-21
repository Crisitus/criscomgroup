import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { RefreshCw } from "lucide-react"
import type { EstadoEnsamble, SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { ES, vigDe, type Tono } from "./sarCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

export const Chip = ({ t, icon, x, lg }: { t: Tono; icon: LucideIcon; x: string; lg?: boolean }) => (
  <span className={`ch ${t}${lg ? " lg" : ""}`}>{I(icon, lg ? 15 : 13)}<span>{x}</span></span>
)

export const EstadoChip = ({ e, lg }: { e: EstadoEnsamble; lg?: boolean }) => {
  const [x, icon, t] = ES[e] ?? [e, ES.recibida[1], "nu" as Tono]
  return <Chip t={t} icon={icon} x={x} lg={lg} />
}

export const VigChip = ({ s, lg }: { s: Pick<SolicitudEnsamble, "estado" | "valida_hasta" | "vencida">; lg?: boolean }) => {
  const v = vigDe(s)
  return v ? <Chip t={v.t} icon={v.icon} x={v.x} lg={lg} /> : null
}

export const Spin = () => I(RefreshCw, 16, "spin")

/** Estado de pantalla completa dentro del panel (vacio, error, permiso). */
export function Msg({ icon, title, children, action, error }: { icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode; error?: boolean }) {
  return (
    <div className="one">
      <section className="lp">
        <div className={`em${error ? " er" : ""}`} role={error ? "alert" : "status"}>
          <span className="ico">{I(icon, 24)}</span>
          <h3>{title}</h3>
          <p>{children}</p>
          {action}
        </div>
      </section>
    </div>
  )
}
