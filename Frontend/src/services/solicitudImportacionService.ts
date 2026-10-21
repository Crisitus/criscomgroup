import api from "../lib/api"

/**
 * Admin UI para solicitudes de importación (hot-patch B).
 * Endpoints del ERP:
 *   GET  /api/solicitudes-importacion?estado&q&page&limit — {rows,total,page,limit,resumen}
 *   GET  /api/solicitudes-importacion/:id        — detalle con historial y transiciones
 *   PUT  /api/solicitudes-importacion/:id/estado — cambiar estado / cotización
 *   POST /api/solicitudes-importacion/:id/convertir — crear Importación planificada
 */

export type EstadoSolicitud =
  | "recibida"
  | "en_revision"
  | "cotizada"
  | "aprobada"
  | "en_transito"
  | "entregada"
  | "rechazada"

export type NivelUrgencia = "baja" | "media" | "alta" | "urgente"

export interface HistorialSolicitud {
  id_historial: number
  usuario_id: number | null
  accion: "estado" | "cotizacion" | "datos" | "convertir"
  de: string | null
  a: string | null
  monto_anterior: number | null
  monto_nuevo: number | null
  nota: string | null
  creado: string | null
}

export interface SolicitudImportacion {
  id_solicitud: number
  codigo_seguimiento: string
  nombre_solicitante: string
  email_solicitante: string
  telefono_solicitante: string | null
  id_usuario: number | null
  nombre_producto: string
  tipo_producto: string
  marca: string | null
  modelo: string | null
  especificaciones: string | null
  pais_origen: string | null
  cantidad: number
  presupuesto_min: number | null
  presupuesto_max: number | null
  nivel_urgencia: NivelUrgencia
  mensaje: string | null
  estado: EstadoSolicitud
  moneda: "USD"
  cotizacion_monto: number | null
  cotizacion_nota: string | null
  cotizacion_fecha: string | null
  valida_hasta: string | null
  vencida: boolean
  // Fecha civil AAAA-MM-DD, sin zona horaria
  fecha_entrega_estimada: string | null
  notas_admin: string | null
  importacion_id: number | null
  convertida_en: string | null
  whatsapp_url: string | null
  created_at: string | null
  updated_at: string | null
  // Solo en el detalle (GET /:id y respuesta del PUT)
  historial?: HistorialSolicitud[]
  transiciones?: EstadoSolicitud[]
}

export interface UpdateEstadoPayload {
  estado?: EstadoSolicitud
  notas_admin?: string | null
  cotizacion_monto?: number | null
  cotizacion_nota?: string | null
  fecha_entrega_estimada?: string | null
  vigencia_dias?: number
}

export type ResumenSolicitudes = Record<string, number> & { total: number }

export interface ListaSolicitudes {
  rows: SolicitudImportacion[]
  total: number
  page: number
  limit: number
  resumen: ResumenSolicitudes
}

export interface ListParams {
  estado?: EstadoSolicitud
  q?: string
  tipo?: string
  urgencia?: NivelUrgencia
  page?: number
  limit?: number
}

// Mensaje legible del backend ({message, errores}) para toasts y formularios.
export const mensajeDeError = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { message?: string; errores?: Record<string, string> } } })?.response?.data
  const campos = data?.errores ? Object.values(data.errores).join(" ") : ""
  return [data?.message, campos].filter(Boolean).join(" ") || fallback
}

export const solicitudImportacionService = {
  list: async (params?: ListParams): Promise<ListaSolicitudes> => {
    const res = await api.get<ListaSolicitudes>("/solicitudes-importacion", { params })
    return res.data
  },

  getOne: async (id: number): Promise<SolicitudImportacion> => {
    const res = await api.get<{ success: boolean; data: SolicitudImportacion }>(`/solicitudes-importacion/${id}`)
    return res.data.data
  },

  updateEstado: async (
    id: number,
    payload: UpdateEstadoPayload
  ): Promise<SolicitudImportacion> => {
    const res = await api.put<{ success: boolean; data: SolicitudImportacion }>(
      `/solicitudes-importacion/${id}/estado`,
      payload
    )
    return res.data.data
  },

  // Crea una Importacion planificada (idempotente). No mueve dinero ni stock.
  convertir: async (
    id: number
  ): Promise<{ ya_convertida: boolean; importacion_id: number; message: string }> => {
    const res = await api.post(`/solicitudes-importacion/${id}/convertir`)
    return res.data
  },
}

// Etiquetas legibles reutilizables en la UI
export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  cotizada: "Cotizada",
  aprobada: "Aprobada",
  en_transito: "En tránsito",
  entregada: "Entregada",
  rechazada: "Rechazada",
}

export const ESTADO_COLORES: Record<EstadoSolicitud, string> = {
  recibida: "bg-blue-100 text-blue-800 border-blue-300",
  en_revision: "bg-yellow-100 text-yellow-800 border-yellow-300",
  cotizada: "bg-purple-100 text-purple-800 border-purple-300",
  aprobada: "bg-green-100 text-green-800 border-green-300",
  en_transito: "bg-indigo-100 text-indigo-800 border-indigo-300",
  entregada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rechazada: "bg-red-100 text-red-800 border-red-300",
}

export const URGENCIA_COLORES: Record<NivelUrgencia, string> = {
  baja: "bg-green-50 text-green-700",
  media: "bg-yellow-50 text-yellow-700",
  alta: "bg-orange-50 text-orange-700",
  urgente: "bg-red-50 text-red-700",
}
