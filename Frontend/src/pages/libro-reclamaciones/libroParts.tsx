import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { RefreshCw } from "lucide-react"
import type { EstadoReclamacion } from "../../services/libroReclamacionesService"
import { ES, plazoDe, type Tono } from "./libroCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

export const Chip = ({ t, icon, x, lg }: { t: Tono; icon: LucideIcon; x: string; lg?: boolean }) => (
  <span className={`ch ${t}${lg ? " lg" : ""}`}>{I(icon, lg ? 15 : 13)}<span>{x}</span></span>
)

export const EstadoChip = ({ e, lg }: { e: EstadoReclamacion; lg?: boolean }) => {
  const [x, icon] = ES[e] ?? [e, ES.pendiente[1]]
  return <Chip t="nu" icon={icon} x={x} lg={lg} />
}

export const PlazoChip = ({ r, lg }: { r: Parameters<typeof plazoDe>[0]; lg?: boolean }) => {
  const p = plazoDe(r)
  return p ? <Chip t={p.t} icon={p.icon} x={p.x} lg={lg} /> : null
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
