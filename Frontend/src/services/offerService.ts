import api from "../lib/api"

// Interfaces
export interface Offer {
  id_oferta?: number
  id_producto: number
  descuento: number
}

// Item a enviar: precio_fijo (con IGV) tiene prioridad sobre descuento
export interface OfferInput {
  id_producto: number
  precio_fijo?: number
  descuento?: number
}

export type OfferItemState = "aplicada" | "omitida" | "error"

export interface OfferItemResult {
  id_producto: number
  estado: OfferItemState
  motivo: string | null
  descuento?: number
  precio_oferta_con_igv?: number
}

export interface OfferBatchResponse {
  success: boolean
  message?: string
  resultados: OfferItemResult[]
  procesadas: number[]
  errores: OfferItemResult[]
}

// Mensaje legible desde un error axios (backend responde { message })
export const getApiErrorMessage = (error: any, fallback = "Error inesperado"): string =>
  error?.response?.data?.message || error?.message || fallback

// El backend responde 422/207 con el detalle por item: lo devolvemos en vez de lanzar
const batchResult = (error: any): OfferBatchResponse => {
  const data = error?.response?.data
  if (data && Array.isArray(data.resultados)) return data as OfferBatchResponse
  throw error
}

// Obtener todas las ofertas
export const fetchOffers = async (): Promise<Offer[]> => {
  const response = await api.get("/ofertas-del-dia")
  return response.data
}

// Aplicar ofertas (atomico: si algun item es invalido no se aplica ninguno)
export const createOrUpdateOffer = async (offerData: OfferInput | OfferInput[]): Promise<OfferBatchResponse> => {
  try {
    const response = await api.put("/ofertas-del-dia", offerData)
    return response.data
  } catch (error: any) {
    return batchResult(error)
  }
}

// Eliminar una oferta
export const deleteOffer = async (productId: number): Promise<OfferBatchResponse> => {
  try {
    const response = await api.delete(`/ofertas-del-dia/${productId}`)
    return response.data
  } catch (error: any) {
    return batchResult(error)
  }
}

// Eliminar varias ofertas en una sola llamada (resultado por item)
export const deleteOffersBulk = async (ids: number[]): Promise<OfferBatchResponse> => {
  try {
    const response = await api.post("/ofertas-del-dia/eliminar-lote", { ids })
    return response.data
  } catch (error: any) {
    return batchResult(error)
  }
}
