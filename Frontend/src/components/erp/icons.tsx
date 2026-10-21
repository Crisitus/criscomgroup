import type { LucideProps } from "lucide-react"
import { isBalanced } from "./format"
import { CircleAlert, CircleCheck, CircleMinus, Clock, TriangleAlert } from "lucide-react"

/** Estados de caja del rediseño: SIEMPRE icono + palabra (nunca solo color). */
export type CashState = "cerrado" | "abierto" | "sin cierre" | "sin actividad"

const stroke: Partial<LucideProps> = { strokeWidth: 1.75, "aria-hidden": true }

export function CashStateChip({ estado }: { estado: CashState }) {
  if (estado === "cerrado") return <span className="erp-st ok"><CircleCheck size={14} {...stroke} />Cerrado</span>
  if (estado === "abierto") return <span className="erp-st warn"><Clock size={14} {...stroke} />Abierto</span>
  if (estado === "sin cierre") return <span className="erp-st bad"><CircleAlert size={14} {...stroke} />Sin cierre</span>
  return <span className="erp-st neu"><CircleMinus size={14} {...stroke} />Sin actividad</span>
}

export function DifferenceChip({ difference }: { difference: number }) {
  return isBalanced(difference)
    ? <span className="erp-st ok"><CircleCheck size={14} {...stroke} />Cuadrado</span>
    : <span className="erp-st bad"><TriangleAlert size={14} {...stroke} />Descuadre</span>
}
