import type { Product } from "../../services/productService"
import { num, productoValido } from "./productData"

export interface FiltrosBase {
  busqueda: string
  categoria: string
  soloConStock: boolean
  soloOfertas: boolean
  ordenamiento: string
}

export interface FiltrosTicket extends FiltrosBase {
  precioMin: string
  precioMax: string
}

export interface FiltrosExcel extends FiltrosBase {
  soloModificados: boolean
}

export const FILTROS_TICKET: FiltrosTicket = {
  busqueda: "", categoria: "", precioMin: "", precioMax: "", soloConStock: true, soloOfertas: false, ordenamiento: "id_desc",
}
export const FILTROS_EXCEL: FiltrosExcel = {
  busqueda: "", categoria: "", soloModificados: false, soloConStock: true, soloOfertas: false, ordenamiento: "id_desc",
}

export const ORDENES_BASE = [
  { value: "id_desc", label: "Últimos agregados" },
  { value: "id_asc", label: "Primeros agregados" },
  { value: "updated_desc", label: "Últimos modificados" },
  { value: "updated_asc", label: "Primeros modificados" },
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "stock_asc", label: "Stock menor a mayor" },
  { value: "stock_desc", label: "Stock mayor a menor" },
]
export const ORDENES_TICKET = [
  ...ORDENES_BASE.slice(0, 6),
  { value: "precio_asc", label: "Precio menor a mayor" },
  { value: "precio_desc", label: "Precio mayor a menor" },
  ...ORDENES_BASE.slice(6),
]

const fecha = (p: Product) => new Date(p.actualizado_en || p.creado_en).getTime()
const precio = (p: Product) => num(p.precio_unitario_con_igv)

const comparar = (orden: string) => (a: Product, b: Product): number => {
  switch (orden) {
    case "id_asc": return a.id_producto - b.id_producto
    case "name_asc": return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    case "name_desc": return b.nombre.localeCompare(a.nombre, "es", { sensitivity: "base" })
    case "updated_desc": return fecha(b) - fecha(a)
    case "updated_asc": return fecha(a) - fecha(b)
    case "precio_asc": return precio(a) - precio(b)
    case "precio_desc": return precio(b) - precio(a)
    case "stock_asc": return num(a.stock) - num(b.stock)
    case "stock_desc": return num(b.stock) - num(a.stock)
    default: return b.id_producto - a.id_producto
  }
}

export const categoriasDe = (productos: Product[]) =>
  [...new Set(productos.map(p => p.categoria?.nombre).filter((n): n is string => Boolean(n)))].sort()

/** Filtra y ordena en el navegador. Los campos propios de cada pantalla son opcionales. */
export const filtrarProductos = (
  productos: Product[],
  f: FiltrosBase & Partial<FiltrosTicket> & Partial<FiltrosExcel>,
): Product[] => {
  let r = productos.filter(productoValido)
  const q = f.busqueda.trim().toLowerCase()
  if (q) r = r.filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  if (f.categoria && f.categoria !== "todas") {
    r = r.filter(p => (f.categoria === "sin_categoria" ? !p.categoria?.nombre : p.categoria?.nombre === f.categoria))
  }
  const min = Number.parseFloat(f.precioMin ?? "")
  if (Number.isFinite(min)) r = r.filter(p => precio(p) >= min)
  const max = Number.parseFloat(f.precioMax ?? "")
  if (Number.isFinite(max)) r = r.filter(p => precio(p) <= max)
  if (f.soloModificados) r = r.filter(p => new Date(p.actualizado_en).getTime() > new Date(p.creado_en).getTime())
  if (f.soloConStock) r = r.filter(p => num(p.stock) > 0)
  if (f.soloOfertas) r = r.filter(p => Boolean(p.es_oferta))
  return [...r].sort(comparar(f.ordenamiento))
}

/** Resumen de filtros activos para auditoria (solo valores simples, sin datos de productos). */
export const filtrosParaAuditoria = (f: FiltrosBase & Partial<FiltrosTicket> & Partial<FiltrosExcel>) => {
  const out: Record<string, string | number | boolean> = {
    soloConStock: f.soloConStock, soloOfertas: f.soloOfertas, ordenamiento: f.ordenamiento,
  }
  if (f.busqueda.trim()) out.busqueda = f.busqueda.trim().slice(0, 100)
  if (f.categoria) out.categoria = f.categoria
  if (f.precioMin) out.precioMin = f.precioMin
  if (f.precioMax) out.precioMax = f.precioMax
  if (f.soloModificados !== undefined) out.soloModificados = f.soloModificados
  return out
}
