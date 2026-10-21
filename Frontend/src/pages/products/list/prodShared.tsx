import type { LucideIcon } from "lucide-react"
import { API_URL } from "../../../config/api"

export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const MINUS = "\u2212"
export const EN = "\u2013"
export const ARROW = "\u2192"
export const Q = (s: string) => `\u00ab${s}\u00bb`

export interface BarcodeRef { codigo_barras?: string; codigo?: string; cantidad: number }
export interface Prod {
  id_producto: number; sku: string; nombre: string; descripcion?: string | null
  precio_unitario_con_igv: string; precio_mayoritario_con_igv: string | null
  es_oferta: boolean; precio_oferta_con_igv?: string | null
  stock: number; stock_minimo?: number; costo_promedio?: string | null
  condicion: "nuevo" | "segunda_mano"; origen: "local" | "importado"; garantia_meses: number
  imagen_url: string | null; id_categoria: number; categoria?: { nombre: string } | null
  codigos_barras?: BarcodeRef[]
}
export interface Quant {
  id_quant_inventario: number; producto_id: number; ubicacion_id: number; lote: string | null
  numero_serie: string | null; disponible: number; reservado: number
}
export interface Metric {
  id_producto: number; stock_minimo: number; costo_promedio: string; stock_sin_ubicar: number; stock_reservado: number
  valor_stock: number; margen_unitario: number; margen_porcentaje: number; costo_conocido: boolean; bajo_minimo: boolean; quants: Quant[]
}
export interface Summary { productos: number; unidades: number; valor_stock: number; bajo_minimo: number; sin_costo: number }
export interface Dash { products: Metric[]; summary: Summary }
export interface Cat { id_categoria: number; nombre: string; total_productos?: number }
export interface Loc { id_ubicacion_inventario: number; codigo: string; nombre: string; tipo: string; activa: boolean }

export interface Row {
  p: Prod; id: number; price: number; offer: number | null; mayor: number | null
  costo: number; ck: boolean; mu: number; mp: number | null; valor: number
  su: number; rs: number; mn: number; bajo: boolean; sin: boolean; inc: boolean; codeSum: number; quants: Quant[]
}

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (n: number | string) => `S/ ${nf.format(Number(n) || 0)}`
export const pct = (n: number) => `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} %`
export const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
export const errMsg = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || (e as Error)?.message || fb
export const errStatus = (e: unknown) => (e as { response?: { status?: number } }).response?.status
export const codeOf = (b: BarcodeRef) => b.codigo_barras || b.codigo || ""

/** URL absoluta de la imagen (igual que la pantalla original). */
export const imgUrl = (u: string | null | undefined) => {
  if (!u) return null
  if (u.startsWith("http")) return u
  const base = API_URL.replace("/api", "")
  if (u.includes("/uploads/")) return `${base}${u}`
  const file = u.split("\\").pop() || u.split("/").pop() || u
  return `${base}/uploads/productos/${file}`
}

export function buildRow(p: Prod, m?: Metric): Row {
  const price = Number(p.precio_unitario_con_igv) || 0
  const costo = Number(m?.costo_promedio ?? p.costo_promedio ?? 0) || 0
  const ck = m ? m.costo_conocido : costo > 0
  const neto = Math.round((price / 1.18) * 100) / 100
  const mu = m ? m.margen_unitario : Math.round((neto - costo) * 100) / 100
  const mp = ck ? (m ? m.margen_porcentaje : neto > 0 ? Math.round(((neto - costo) / neto) * 10000) / 100 : null) : null
  const mn = Number(m?.stock_minimo ?? p.stock_minimo ?? 0)
  const codes = p.codigos_barras || []
  const codeSum = codes.reduce((s, c) => s + (Number(c.cantidad) || 0), 0)
  const quants = m?.quants || []
  return {
    p, id: p.id_producto, price,
    offer: p.es_oferta && p.precio_oferta_con_igv ? Number(p.precio_oferta_con_igv) : null,
    mayor: p.precio_mayoritario_con_igv ? Number(p.precio_mayoritario_con_igv) : null,
    costo, ck, mu, mp, valor: m ? m.valor_stock : Math.round(costo * p.stock * 100) / 100,
    su: m ? m.stock_sin_ubicar : p.stock - quants.reduce((s, q) => s + q.disponible, 0), rs: m?.stock_reservado ?? 0,
    mn, bajo: m ? m.bajo_minimo : mn > 0 && p.stock <= mn, sin: p.stock === 0,
    inc: codes.length > 0 && codeSum !== p.stock, codeSum, quants,
  }
}

/** Fechas del backend ya en hora de Lima: `2026-10-10 13:41:05` -> `10/10/2026, 1:41 p. m.` */
export const fdt = (ts?: string | null) => {
  if (!ts) return DASH
  const h = Number(ts.slice(11, 13))
  return `${ts.slice(8, 10)}/${ts.slice(5, 7)}/${ts.slice(0, 4)}, ${h % 12 || 12}:${ts.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}`
}

export const TIPOS: Record<string, string> = { almacen: "Almacén", tienda: "Tienda", taller: "Taller", transito: "En tránsito", virtual: "Virtual" }
