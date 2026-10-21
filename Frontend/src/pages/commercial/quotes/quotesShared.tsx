import { CircleCheck, CircleX, Clock, Pencil, Send, ShoppingCart, type LucideIcon } from "lucide-react"
import { longDate, todayLima } from "../../../components/erp/format"

export const SEP = " · "
export const DASH = "—"
export const ELL = "…"
export const ARROW = "→"
export const TIMES = "×"
export const MINUS = "−"
export const BULLET = "•"
export const Q = (s: string) => `«${s}»`

export type Estado = "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida" | "convertida"
export interface QuoteLine {
  id_cotizacion_detalle: number; producto_id: number | null; descripcion: string; cantidad: number
  precio_unitario: string; costo_unitario: string; subtotal: string
}
export interface Quote {
  id_cotizacion: number; numero: string; cliente_nombre: string; cliente_documento: string | null
  cliente_email: string | null; cliente_telefono: string | null; escenario: string; vigencia_dias: number
  subtotal: string; descuento: string; total: string; costo_total: string; margen: string; estado: Estado
  notas: string | null; creado_en: string; vence_en: string; transiciones: Estado[]; detalles: QuoteLine[]
}
export interface StockProduct {
  id_producto: number; nombre: string; sku: string; stock: number
  costo_promedio: string | number; precio_unitario_con_igv: string | number
}

export const ESTADOS: [Estado, string][] = [
  ["borrador", "Borrador"], ["enviada", "Enviada"], ["aprobada", "Aprobada"],
  ["rechazada", "Rechazada"], ["vencida", "Vencida"], ["convertida", "Convertida en venta"],
]
export const ESCENARIOS: [string, string][] = [
  ["economica", "Económica"], ["recomendada", "Recomendada"], ["premium", "Premium"], ["personalizada", "Personalizada"],
]
export const METODOS: [string, string][] = [
  ["efectivo", "Efectivo"], ["tarjeta", "Tarjeta"], ["transferencia", "Transferencia"], ["yape", "Yape"], ["plin", "Plin"],
]
export const ES: Record<string, string> = Object.fromEntries(ESTADOS)
export const SC: Record<string, string> = Object.fromEntries(ESCENARIOS)
export const ABIERTAS: Estado[] = ["borrador", "enviada", "aprobada"]

type Tone = [LucideIcon, string]
const ST: Record<Estado, Tone> = {
  borrador: [Pencil, "neu"], enviada: [Send, "neu"], aprobada: [CircleCheck, "ok"],
  rechazada: [CircleX, "bad"], vencida: [Clock, "warn"], convertida: [ShoppingCart, "ok"],
}
export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
export const EstChip = ({ e, s = 16 }: { e: Estado; s?: number }) => {
  const [Icon, tone] = ST[e] || ST.borrador
  return <span className={`st ${tone}`}>{I(Icon, s)}{ES[e] || e}</span>
}

const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const f2 = (n: number) => nf.format(n)
export const money = (n: number | string) => `S/ ${f2(Number(n) || 0)}`
export const sgn = (n: number) => `${n < 0 ? MINUS : ""}S/ ${f2(Math.abs(n))}`
export const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
export const fd = (ts?: string | null) => (ts ? longDate(ts.slice(0, 10)) : DASH)
export const num = (x: unknown) => Number(x) || 0
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
export const errMsg = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || fb

/** Dias hasta la fecha (calendario de Lima); negativo = ya paso. */
export const dias = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(todayLima())) / 864e5)
export interface Vence { tone: "warn" | "neu"; icon: boolean; short: string; long: string }
export function venceInfo(q: Quote): Vence | null {
  const d = dias(q.vence_en)
  if (q.estado === "vencida") return { tone: "warn", icon: true, short: `hace ${-d} d`, long: `Venció el ${fd(q.vence_en)} (hace ${pl(-d, "día", "días")})` }
  if (!ABIERTAS.includes(q.estado)) return null
  const warn = d <= 3
  return {
    tone: warn ? "warn" : "neu", icon: warn, short: d <= 0 ? "Vence hoy" : `Vence en ${d} d`,
    long: d <= 0 ? "Vence hoy" : `Vence ${fd(q.vence_en)}${SEP}en ${pl(d, "día", "días")}`,
  }
}
/** El backend guarda "Venta #N" al final de las notas al convertir. */
export const ventaId = (q: Quote) => { const m = (q.notas || "").match(/Venta #(\d+)/); return m ? Number(m[1]) : null }
export const notasLimpias = (q: Quote) => (q.notas || "").split("\n").filter(l => !/^Venta #\d+$/.test(l.trim())).join("\n").trim()

export const phone = (value: string) => {
  let r = value.replace(/\D/g, "")
  if (r.length === 9 && r.startsWith("9")) r = `51${r}`
  return /^\d{10,15}$/.test(r) ? r : ""
}
export const waText = (q: Pick<Quote, "cliente_nombre" | "numero" | "detalles" | "descuento" | "total" | "vigencia_dias" | "notas">) =>
  [
    `Hola ${q.cliente_nombre}, te enviamos la cotización *${q.numero}* de CRISCOM Group:`, "",
    ...q.detalles.map(i => `${BULLET} ${i.descripcion} ${DASH} ${i.cantidad} ${TIMES} ${money(i.precio_unitario)} = ${money(i.subtotal)}`), "",
    num(q.descuento) > 0 ? `Descuento: ${money(q.descuento)}` : null,
    `*TOTAL: ${money(q.total)}*`, `Vigencia: ${q.vigencia_dias} días.`,
    notasTxt(q.notas), "", "Si estás de acuerdo, respóndenos por este medio para confirmar.",
  ].filter((l): l is string => l !== null).join("\n")
function notasTxt(n: string | null) { const t = (n || "").trim(); return t ? `Notas: ${t}` : "" }
export const waUrl = (tel: string, text: string) => `https://wa.me/${phone(tel)}?text=${encodeURIComponent(text)}`
