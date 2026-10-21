import type { ReactNode } from "react"
import { TriangleAlert, Unlink, type LucideIcon } from "lucide-react"
import type { EstadoPostventa, SolicitudPostventa } from "../../services/postventaService"
import { EST, ESTI } from "./pvCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => (
  <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
)

export const StateChip = ({ e, size = 14 }: { e: EstadoPostventa; size?: number }) => {
  const [Icon, tone] = ESTI[e]
  return <span className={`st ${tone}`}>{I(Icon, size)}{EST[e]}</span>
}

/** Etiquetas informativas: sin vincular / fuera de plazo (no bloquean nada). */
export const Tags = ({ c }: { c: SolicitudPostventa }) => (
  <>
    {!c.vinculado && <span className="tag warn">{I(Unlink, 13)}Sin vincular</span>}
    {c.fuera_de_plazo === true && <span className="tag warn">{I(TriangleAlert, 13)}Fuera de plazo</span>}
  </>
)

type Tone = "" | "bad" | "warn" | "ok"

/** Aviso en linea (clase `bn` del diseno): titulo, texto y acciones opcionales. */
export function Banner({ tone = "", icon, title, role = "status", label, className = "", children, actions }: {
  tone?: Tone
  icon: LucideIcon
  title: string
  role?: "status" | "alert" | "alertdialog"
  label?: string
  className?: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={`bn ${tone} ${className}`.trim()} role={role} aria-label={label}>
      {I(icon, 18)}
      <div className="bx">
        <b>{title}</b>
        {children}
        {actions && <div className="ba">{actions}</div>}
      </div>
    </div>
  )
}
