import api from "../lib/api"

export type EstadoPostventa = "recibida" | "en_revision" | "esperando_cliente" | "aprobada" | "rechazada" | "resuelta"
export type AccionPosterior = "ninguna" | "reingreso_stock" | "nota_credito" | "reembolso" | "otra"

export type HistorialPostventa = {
  id_historial: number
  solicitud_id: number
  usuario_id: number | null
  de: EstadoPostventa | null
  a: EstadoPostventa
  nota?: string | null
  creado: string
}

export type SolicitudPostventa = {
  id_solicitud: number
  codigo_seguimiento: string
  nombre: string
  email: string
  telefono?: string | null
  numero_pedido: string
  tipo: "cambio" | "devolucion" | "garantia"
  producto_servicio: string
  motivo: string
  detalle: string
  solucion_solicitada: string
  estado: EstadoPostventa
  notas_admin?: string | null
  respuesta_cliente?: string | null
  pedido_id?: number | null
  venta_id?: number | null
  cantidad: number
  vinculado: boolean
  fuera_de_plazo: boolean | null
  accion_posterior?: AccionPosterior | null
  accion_posterior_nota?: string | null
  fecha_creacion: string
  fecha_actualizacion: string
  historial?: HistorialPostventa[]
}

export type ResumenPostventa = Record<EstadoPostventa | "total", number>
export type ListaPostventa = { rows: SolicitudPostventa[]; total: number; page: number; limit: number; resumen: ResumenPostventa }
export type FiltrosPostventa = { estado?: string; tipo?: string; q?: string; page?: number; limit?: number; vinculado?: boolean }
export type ActualizarPostventa = {
  estado?: EstadoPostventa
  notas_admin?: string
  respuesta_cliente?: string
  accion_posterior?: AccionPosterior | null
  accion_posterior_nota?: string
}

// Mensaje del backend ({message, errores}) para mostrarlo tal cual.
export const mensajeError = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { message?: string; errores?: Record<string, string> } } })?.response?.data
  const detalle = data?.errores ? Object.values(data.errores).join(" ") : ""
  return data?.message ? (detalle && !data.message.includes(detalle) ? `${data.message} ${detalle}` : data.message) : fallback
}

export const getPostventa = async (filtros: FiltrosPostventa = {}): Promise<ListaPostventa> =>
  (await api.get("/postventa", { params: filtros })).data
export const getPostventaDetalle = async (id: number): Promise<SolicitudPostventa> =>
  (await api.get(`/postventa/${id}`)).data.data
export const updatePostventa = async (id: number, data: ActualizarPostventa): Promise<SolicitudPostventa> =>
  (await api.put(`/postventa/${id}`, data)).data.data
