import { CircleAlert, Lock, type LucideIcon } from "lucide-react"
import type { EstadoDocumento } from "../../../services/facturacionService"
import { ESTADO } from "./sunCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => (
  <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
)

export const StateChip = ({ e }: { e: EstadoDocumento }) => {
  const [word, Icon, tone] = ESTADO[e] ?? ["Desconocido", CircleAlert, "neu"]
  return <span className={`st ${tone}`}>{I(Icon, 14)}{word}</span>
}

export const Why = ({ id, children }: { id: string; children: string }) => (
  <p className="suwhy" id={id}>{I(Lock, 14)}<span>{children}</span></p>
)

