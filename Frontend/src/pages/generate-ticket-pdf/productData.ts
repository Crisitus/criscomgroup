import type { Product } from "../../services/productService"
import { esCode128Valido } from "../../utils/barcode128"

export const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Producto valido para exportar: id numerico, nombre y SKU con texto. */
export const productoValido = (p: unknown): p is Product => {
  const x = p as Partial<Product> | null
  return !!x && typeof x.id_producto === "number" && typeof x.nombre === "string" && x.nombre.length > 0
    && typeof x.sku === "string" && x.sku.length > 0
}

/** Productos descartados por datos incompletos (para avisar en pantalla en vez de ocultarlos). */
export const contarInvalidos = (productos: unknown[]) => productos.filter(p => !productoValido(p)).length

export const nombreCategoria = (p: Product) => p.categoria?.nombre || "Sin categoría"

/** Codigos de barras del producto (todos los lotes, en orden de alta). */
export const codigosDe = (p: Product): string[] =>
  (p.codigos_barras ?? []).map(c => c.codigo_barras).filter(c => typeof c === "string" && c.trim().length > 0)

export const sinCodigoBarras = (p: Product) => codigosDe(p).length === 0

/** Suma de cantidades de los lotes distinta del stock: la fuente de la cantidad del Excel es `stock`. */
export const lotesNoCuadran = (p: Product) => {
  const lotes = p.codigos_barras ?? []
  return lotes.length > 0 && lotes.reduce((s, c) => s + num(c.cantidad), 0) !== num(p.stock)
}

export interface CodigoTicket {
  texto: string
  origen: "lote" | "sku"
  /** Se puede dibujar como Code 128 escaneable. */
  escaneable: boolean
}

/**
 * Codigo que imprime el ticket: el lote con stock mas antiguo (cantidad > 0); si ninguno tiene
 * unidades, el primero; sin lotes, el SKU (marcado como tal). Solo ASCII es dibujable en Code 128.
 */
export const codigoTicket = (p: Product): CodigoTicket => {
  const lotes = (p.codigos_barras ?? []).filter(c => typeof c.codigo_barras === "string" && c.codigo_barras.trim())
  const elegido = lotes.find(c => num(c.cantidad) > 0) ?? lotes[0]
  if (elegido) {
    const texto = elegido.codigo_barras.trim()
    return { texto, origen: "lote", escaneable: esCode128Valido(texto) }
  }
  return { texto: p.sku, origen: "sku", escaneable: esCode128Valido(p.sku) }
}

/** Mismo calculo que el Excel historico: stock/6 redondeado al siguiente par. */
export const cantidadPar = (stock: number) => Math.ceil(stock / 6 / 2) * 2

export const mensajeError = (error: unknown): string => {
  const e = error as { response?: { data?: { message?: string }; status?: number }; message?: string } | null
  if (e?.response?.status === 403) return "No tienes permiso para ver los productos."
  return e?.response?.data?.message || e?.message || "No se pudieron cargar los productos."
}
