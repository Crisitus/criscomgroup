import { Building2, CalendarDays, CircleAlert, CircleCheck, CircleX, PackageCheck, Ship, type LucideIcon } from "lucide-react"
import type { ImportRecord } from "../../services/importService"
import { longDate, todayLima } from "../../components/erp/format"

export const DOT = "\u00b7"
export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export type Estado = ImportRecord["estado"]
export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
export const ST: Record<Estado, [string, LucideIcon, string]> = {
  planificada: ["Planificada", CalendarDays, "neu"], en_transito: ["En tránsito", Ship, "neu"], en_aduanas: ["En aduanas", Building2, "warn"],
  liberada: ["Liberada", CircleCheck, "neu"], recibida: ["Recibida", PackageCheck, "ok"], cancelada: ["Cancelada", CircleX, "bad"],
}
export const ESTADOS = Object.keys(ST) as Estado[]
export const FLOW: Estado[] = ["planificada", "en_transito", "en_aduanas", "liberada", "recibida"]
export const NXT: Partial<Record<Estado, Estado>> = { planificada: "en_transito", en_transito: "en_aduanas", en_aduanas: "liberada" }
export const COSTS = ["costo_mercancia", "flete", "seguro", "tributos", "otros_costos"] as const
export const COST_LABEL: Record<(typeof COSTS)[number], string> = { costo_mercancia: "Mercancía", flete: "Flete", seguro: "Seguro", tributos: "Tributos", otros_costos: "Otros costos" }
export const WRITABLE = ["producto_id", "cantidad", "tipo_cambio", "referencia", "proveedor", "pais_origen", "descripcion", "tracking", "regimen_aduanero", "moneda", ...COSTS, "estado", "fecha_embarque", "fecha_llegada_estimada", "dam_dua", "notas_contables"] as const

const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const f2 = (n: number) => nf.format(n)
export const r2 = (n: number) => Math.round(n * 100 + 1e-6) / 100
export const cur = (m: string) => (m === "PEN" ? "S/" : m)
export const mon = (m: string, n: number) => `${cur(m)} ${f2(n)}`
export const sol = (n: number) => `S/ ${f2(n)}`
export const total = (o: Pick<ImportRecord, (typeof COSTS)[number]>) => COSTS.reduce((s, k) => s + (Number(o[k]) || 0), 0)
export const tcOf = (o: Pick<ImportRecord, "moneda" | "tipo_cambio">) => (o.moneda === "PEN" ? 1 : Number(o.tipo_cambio) || 0)
export const enSoles = (o: ImportRecord) => r2(total(o) * tcOf(o))
export const unit = (o: ImportRecord) => r2((total(o) * tcOf(o)) / Math.max(1, Number(o.cantidad) || 1))
/** `2026-08-31` -> `31/08/2026` */
export const fd = (iso?: string | null) => (iso ? longDate(iso.slice(0, 10)) : DASH)
/** Fechas del backend ya en hora de Lima: `2026-10-10 13:41:05` -> `10/10/2026 1:41 p. m.` */
export const ft = (ts?: string | null) => {
  if (!ts) return DASH
  const h = Number(ts.slice(11, 13))
  return `${fd(ts)} ${h % 12 || 12}:${ts.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}`
}
export const dias = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(todayLima())) / 864e5)
export const uds = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`
const nd = (n: number) => `${Math.abs(n)} ${Math.abs(n) === 1 ? "día" : "días"}`
export const errMsg = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || fb
export const Chip = ({ e, s = 16 }: { e: Estado; s?: number }) => { const x = ST[e]; return <span className={`st ${x[2]}`}>{I(x[1], s)}{x[0]}</span> }

export function Llegada({ o }: { o: ImportRecord }) {
  if (!o.fecha_llegada_estimada) return <span>Sin llegada estimada</span>
  if (o.estado === "cancelada") return <span>Llegada era el {fd(o.fecha_llegada_estimada)}</span>
  if (o.estado === "recibida") return <span>Llegada estimada {fd(o.fecha_llegada_estimada)}</span>
  const d = dias(o.fecha_llegada_estimada)
  if (d < 0) return <span className="st warn">{I(CircleAlert, 14)}Atrasada {nd(d)}{SEP}{fd(o.fecha_llegada_estimada)}</span>
  return <span>Llegada {fd(o.fecha_llegada_estimada)}{SEP}{d === 0 ? "llega hoy" : `en ${nd(d)}`}</span>
}

/** Cuerpo para PUT/POST: todos los campos editables; fechas y producto vacíos van como null. */
export const toPayload = (o: Record<string, unknown>) => Object.fromEntries(WRITABLE.map(k => {
  const v = o[k]
  if (k === "producto_id" || k.startsWith("fecha_")) return [k, v === "" || v == null ? null : v]
  return [k, v ?? ""]
}))

export function exportCsv(records: ImportRecord[]) {
  const headers = ["Referencia", "Proveedor", "País", "Descripción", "Tracking", "DAM/DUA", "Estado", "Moneda", "Mercancía", "Flete", "Seguro", "Tributos", "Otros", "Total", "Cantidad", "Tipo de cambio", "Total en soles", "Notas"]
  const rows = records.map(o => [o.referencia, o.proveedor, o.pais_origen, o.descripcion, o.tracking, o.dam_dua, o.estado, o.moneda, o.costo_mercancia, o.flete, o.seguro, o.tributos, o.otros_costos, total(o).toFixed(2), o.cantidad, tcOf(o).toFixed(6), enSoles(o).toFixed(2), o.notas_contables])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
  a.download = `importaciones-${todayLima()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
