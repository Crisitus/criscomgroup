import { Ban, CircleCheck, type LucideIcon } from "lucide-react"
import { longDate } from "../../../components/erp/format"

export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const ARROW = "\u2192"
export const TIMES = "\u00d7"
export const EN = "\u2013"
export const Q = (s: string) => `\u00ab${s}\u00bb`

export interface Supplier {
  id_proveedor: number; razon_social: string; ruc_documento: string | null; contacto: string | null; telefono: string | null
  email: string | null; direccion: string | null; ciudad: string | null; dias_credito: number; activo: boolean
}
export interface PurchaseLine {
  id_compra_detalle: number; producto_id: number; cantidad: number; costo_unitario: string; costo_asignado: string; subtotal: string
  producto?: { id_producto: number; nombre: string; sku: string }
}
export interface Purchase {
  id_compra: number; numero: string; proveedor_id: number; fecha: string; documento: string | null; moneda: "PEN" | "USD"
  tipo_cambio: string; costos_adicionales: string; total: string; estado: "recibida" | "anulada" | "borrador"; notas: string | null
  proveedor?: Supplier; detalles: PurchaseLine[]
}
export interface StockProduct { id_producto: number; nombre: string; sku: string; stock: number; costo_promedio: string | number }

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const f2 = (n: number) => nf.format(n)
export const money = (n: number | string, cur: string = "PEN") => `${cur === "USD" ? "US$" : "S/"} ${f2(Number(n) || 0)}`
export const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
export const fd = (ts?: string | null) => (ts ? longDate(ts.slice(0, 10)) : DASH)
/** Fechas del backend ya en hora de Lima: `2026-10-10 13:41:05` -> `1:41 p. m.` */
export const ft = (ts?: string | null) => {
  if (!ts) return DASH
  const h = Number(ts.slice(11, 13))
  return `${h % 12 || 12}:${ts.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}`
}
export const errMsg = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || fb
export const errStatus = (e: unknown) => (e as { response?: { status?: number } }).response?.status

type Tone = [string, LucideIcon, string]
const EST: Record<string, Tone> = { recibida: ["Recibida", CircleCheck, "ok"], anulada: ["Anulada", Ban, "neu"], borrador: ["Borrador", Ban, "neu"] }
export const EstChip = ({ e, s = 14 }: { e: string; s?: number }) => { const x = EST[e] || EST.borrador; return <span className={`st ${x[2]}`}>{I(x[1], s)}{x[0]}</span> }
export const ActChip = ({ on, s = 14 }: { on: boolean; s?: number }) => <span className={`st ${on ? "ok" : "neu"}`}>{I(on ? CircleCheck : Ban, s)}{on ? "Activo" : "Inactivo"}</span>
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
