import api from "../lib/api"

export type EmisorSunat = {
  id_company: number | null
  razon_social: string
  ruc: string
  tipo_ruc: "10" | "20"
  direccion?: string
  facturacion_habilitada: boolean
  emisor_predeterminado: boolean
  serie_factura: string
  serie_boleta: string
  certificado_configurado?: boolean
  credenciales_sol_configuradas?: boolean
  configuracion_completa: boolean
  origen_credenciales?: "servidor" | "empresa" | "ninguna"
  origen_certificado?: "servidor" | "empresa" | "ninguna"
  modo_sunat?: "pruebas" | "produccion"
  modo_valido?: boolean
}

export type EmisoresRespuesta = {
  emisores: EmisorSunat[]
  permisos: { puede_editar: boolean; motivo: string | null }
  sunat: { mode: string; mode_valid: boolean; warning: string | null }
  ruc20_habilitados_pendientes: number
}

export type EstadoDocumento = "pendiente" | "firmado" | "enviado" | "aceptado" | "rechazado" | "error"

export type DocumentoSunat = {
  id_documento: number
  venta_id?: number | null
  tipo: string
  serie: string
  correlativo: number
  estado: EstadoDocumento
  codigo_respuesta: string | null
  mensaje_respuesta: string | null
  intentos: number
  creado_en: string
  emisor?: { id_company: number; ruc: string; razon_social: string }
}

export type DocumentosPagina = { items: DocumentoSunat[]; total: number }

export type CambioEmisor = { razon_social: string; direccion: string; serie_factura: string; serie_boleta: string; confirmar_cambio_series?: boolean }

export const fetchEmisores = async (): Promise<EmisoresRespuesta> => (await api.get("/facturacion/emisores")).data

export const fetchDocumentos = async (limit: number, offset: number, estado?: EstadoDocumento): Promise<DocumentosPagina> => {
  const response = await api.get<DocumentoSunat[]>("/facturacion/documentos", { params: { limit, offset, ...(estado ? { estado } : {}) } })
  const header = Number(response.headers["x-total-count"])
  const items = Array.isArray(response.data) ? response.data : []
  return { items, total: Number.isFinite(header) ? header : items.length }
}

export const updateEmisor = async (id: number, body: CambioEmisor): Promise<void> => { await api.patch(`/facturacion/emisores/${id}`, body) }
export const setEmisorPredeterminado = async (id: number): Promise<void> => { await api.patch(`/facturacion/emisores/${id}/predeterminado`) }
export const bloquearRuc20 = async (): Promise<{ afectados: number }> => {
  const data = (await api.post("/facturacion/emisores/bloquear-ruc20")).data
  return { afectados: Number(data?.afectados) || 0 }
}
