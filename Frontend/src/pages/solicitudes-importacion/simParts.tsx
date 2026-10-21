import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Clock, RefreshCw } from "lucide-react"
import type { EstadoSolicitud, NivelUrgencia } from "../../services/solicitudImportacionService"
import { ESTADO, URG, type Tono } from "./simCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

export const Chip = ({ t, icon, x, lg }: { t: Tono; icon: LucideIcon; x: string; lg?: boolean }) => (
  <span className={`ch ${t}${lg ? " lg" : ""}`}>{I(icon, lg ? 15 : 13)}<span>{x}</span></span>
)
export const EstadoChip = ({ e, lg }: { e: EstadoSolicitud; lg?: boolean }) => {
  const s = ESTADO[e] ?? ESTADO.recibida
  return <Chip t={s.t} icon={s.i} x={ESTADO[e] ? s.l : e} lg={lg} />
}
export const UrgChip = ({ u, lg }: { u: NivelUrgencia; lg?: boolean }) => {
  const s = URG[u] ?? URG.media
  return <Chip t={s.t} icon={s.i} x={lg ? `Urgencia ${s.l.toLowerCase()}` : s.l} lg={lg} />
}
export const VencidaChip = ({ lg }: { lg?: boolean }) => <Chip t="wn" icon={Clock} x="Vencida" lg={lg} />
export const Spin = () => I(RefreshCw, 16, "spin")

/** Estado de pantalla completa dentro del panel (vacio, error, permiso). */
export function Msg({ icon, title, children, action, error }: { icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode; error?: boolean }) {
  return (
    <div className="one">
      <section className="lp">
        <div className={`es${error ? " er" : ""}`} role={error ? "alert" : "status"}>
          <span className="eic2">{I(icon, 22)}</span>
          <h2>{title}</h2>
          <p>{children}</p>
          {action}
        </div>
      </section>
    </div>
  )
}
