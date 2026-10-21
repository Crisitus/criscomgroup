import api from "../../../lib/api"
import { commercialApi } from "../../../services/commercialService"
import { fetchCategories } from "../../../services/categoryService"
import { fetchProductById } from "../../../services/productService"
import { obtenerCodigosBarras } from "../../../services/codigoBarrasService"
import type { Category, Code, Ficha, Metrics, Movement } from "./types"

export const loadFicha = async (id: number): Promise<Ficha> => (await fetchProductById(id)) as unknown as Ficha

export const loadCategories = async (): Promise<Category[]> => (await fetchCategories()) as unknown as Category[]

export const loadCodes = async (id: number): Promise<Code[]> => {
  const data = await obtenerCodigosBarras(id)
  return (data?.codigos_barras ?? []) as Code[]
}

/** Metricas de inventario (ubicaciones, reservado, valor). Si el rol no las puede leer, la ficha funciona sin ellas. */
export const loadMetrics = async (id: number): Promise<Metrics | null> => {
  try {
    const data = await commercialApi.dashboard()
    const row = (data?.products ?? []).find((p: { id_producto: number }) => p.id_producto === id)
    if (!row) return null
    return {
      quants: row.quants ?? [],
      stock_reservado: Number(row.stock_reservado) || 0,
      stock_sin_ubicar: Number(row.stock_sin_ubicar) || 0,
      valor_stock: Number(row.valor_stock) || 0,
    }
  } catch {
    return null
  }
}

export const loadMovements = async (id: number): Promise<Movement[]> =>
  (await commercialApi.movements({ producto_id: id, limit: 200 })) as Movement[]

export const adjustStock = (id: number, tipo: "ajuste_entrada" | "ajuste_salida", cantidad: number, motivo: string) =>
  commercialApi.adjust(id, { tipo, cantidad, motivo })

/** Cuerpo JSON de la ficha. `stock` solo viaja si el producto se controla por codigos de barras. */
export interface SavePayload {
  sku: string
  nombre: string
  descripcion: string
  id_categoria: number
  precio_unitario: number
  precio_unitario_con_igv: number
  precio_mayoritario: number | null
  precio_mayoritario_con_igv: number | null
  condicion: string
  origen: string
  garantia_meses: number
  estado_observaciones: string
  stock_minimo: number
  stock?: number
}

export const saveFicha = async (id: number, body: SavePayload): Promise<Ficha> =>
  (await api.put(`/productos/${id}`, body)).data.producto as Ficha

/** La imagen viaja aparte (multipart con solo el archivo): el resto de campos queda como se guardo. */
export const uploadImage = async (id: number, file: File): Promise<Ficha> => {
  const form = new FormData()
  form.append("imagen", file)
  return (await api.put(`/productos/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } })).data.producto as Ficha
}
