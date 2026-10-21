import api from "../lib/api"
import type { HistorialSolicitud, ResumenSolicitudes } from "./solicitudImportacionService"
export { mensajeDeError } from "./solicitudImportacionService"

/**
 * Admin UI para solicitudes de armado / ensamble de PC.
 * Endpoints del ERP:
 *   GET  /api/solicitudes-ensamble?estado&q&modo&page&limit — {rows,total,page,limit,resumen}
 *   GET  /api/solicitudes-ensamble/:id           — detalle con historial y transiciones
 *   PUT  /api/solicitudes-ensamble/:id/estado    — cambiar estado / cotización
 *   POST /api/solicitudes-ensamble/:id/convertir — cotización profesional en borrador (solo marketplace)
 */

export type EstadoEnsamble =
  | "recibida"
  | "en_revision"
  | "cotizada"
  | "aprobada"
  | "en_ensamble"
  | "entregada"
  | "rechazada"

export type ModoEnsamble = "marketplace" | "presupuesto" | "ensamble_propio"

export type TierPresupuesto =
  | "oficina"
  | "gamer"
  | "alto_rendimiento"
  | "workstation"
  | "otro"

export type PrioridadArmado =
  | "grafica"
  | "procesador"
  | "placa"
  | "estetica"
  | "refrigeracion"
  | "almacenamiento"
  | "silencio"
  | "portabilidad"

export interface ProductoElegido {
  id_producto: number
  nombre: string
  // Precio con IGV recalculado por el servidor contra el catálogo al recibir la solicitud
  precio: number
  cantidad: number
  stock_momento?: number
  // Solo si el navegador envió un precio distinto al del catálogo
  precio_declarado?: number
  // Vigentes hoy en el catálogo (solo en admin)
  precio_actual?: number | null
  stock_actual?: number | null
  disponible?: boolean
  precio_cambio?: boolean
}

export interface ResumenCatalogo {
  subtotal_sin_igv: number
  igv: number
  total_catalogo: number
}

export interface SolicitudEnsamble {
  id_solicitud: number
  codigo_seguimiento: string
  nombre_solicitante: string
  telefono_solicitante: string
  email_solicitante: string | null
  ciudad: string
  id_usuario: number | null
  modo: ModoEnsamble
  productos: ProductoElegido[] | null
  resumen_catalogo: ResumenCatalogo | null
  tier_presupuesto: TierPresupuesto | null
  presupuesto_personalizado: number | null
  uso_descripcion: string | null
  incluye_perifericos: "solo_pc" | "con_perifericos" | null
  marcas_preferencia: string | null
  prioridades: PrioridadArmado[] | null
  mensaje: string | null
  estado: EstadoEnsamble
  moneda: "PEN"
  igv_incluido: boolean
  cotizacion_monto: number | null
  cotizacion_nota: string | null
  cotizacion_fecha: string | null
  valida_hasta: string | null
  vencida: boolean
  // Fecha civil AAAA-MM-DD, sin zona horaria
  fecha_entrega_estimada: string | null
  notas_admin: string | null
  cotizacion_id: number | null
  convertida_en: string | null
  whatsapp_url: string | null
  created_at: string | null
  updated_at: string | null
  // Solo en el detalle (GET /:id y respuesta del PUT)
  historial?: HistorialSolicitud[]
  transiciones?: EstadoEnsamble[]
}

export interface UpdateEstadoEnsamblePayload {
  estado?: EstadoEnsamble
  notas_admin?: string | null
  cotizacion_monto?: number | null
  cotizacion_nota?: string | null
  fecha_entrega_estimada?: string | null
  vigencia_dias?: number
}

export interface ListaEnsambles {
  rows: SolicitudEnsamble[]
  total: number
  page: number
  limit: number
  resumen: ResumenSolicitudes
}

export interface ListEnsambleParams {
  estado?: EstadoEnsamble
  q?: string
  modo?: ModoEnsamble
  page?: number
  limit?: number
}

export const solicitudEnsambleService = {
  list: async (params?: ListEnsambleParams): Promise<ListaEnsambles> => {
    const res = await api.get<ListaEnsambles>("/solicitudes-ensamble", { params })
    return res.data
  },

  getOne: async (id: number): Promise<SolicitudEnsamble> => {
    const res = await api.get<{ success: boolean; data: SolicitudEnsamble }>(`/solicitudes-ensamble/${id}`)
    return res.data.data
  },

  updateEstado: async (
    id: number,
    payload: UpdateEstadoEnsamblePayload
  ): Promise<SolicitudEnsamble> => {
    const res = await api.put<{ success: boolean; data: SolicitudEnsamble }>(
      `/solicitudes-ensamble/${id}/estado`,
      payload
    )
    return res.data.data
  },

  // Crea una cotizacion profesional en borrador (idempotente). Solo modo marketplace.
  convertir: async (
    id: number
  ): Promise<{ ya_convertida: boolean; cotizacion_id: number; numero?: string; message: string }> => {
    const res = await api.post(`/solicitudes-ensamble/${id}/convertir`)
    return res.data
  },
}

export const ESTADO_ENSAMBLE_LABELS: Record<EstadoEnsamble, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  cotizada: "Cotizada",
  aprobada: "Aprobada",
  en_ensamble: "En ensamble",
  entregada: "Entregada",
  rechazada: "Rechazada",
}

export const ESTADO_ENSAMBLE_COLORES: Record<EstadoEnsamble, string> = {
  recibida: "bg-blue-100 text-blue-800 border-blue-300",
  en_revision: "bg-yellow-100 text-yellow-800 border-yellow-300",
  cotizada: "bg-purple-100 text-purple-800 border-purple-300",
  aprobada: "bg-green-100 text-green-800 border-green-300",
  en_ensamble: "bg-indigo-100 text-indigo-800 border-indigo-300",
  entregada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rechazada: "bg-red-100 text-red-800 border-red-300",
}

export const TIER_LABELS: Record<TierPresupuesto, string> = {
  oficina: "Oficina (S/ 1,500 – 2,500)",
  gamer: "Gamer/Trabajo (S/ 2,500 – 4,500)",
  alto_rendimiento: "Alto Rendimiento (S/ 4,500 – 7,500)",
  workstation: "Workstation/Pro (S/ 7,500+)",
  otro: "Otro presupuesto (monto libre)",
}

export const MODO_ENSAMBLE_LABELS: Record<ModoEnsamble, string> = {
  marketplace: "Marketplace",
  presupuesto: "Por presupuesto",
  ensamble_propio: "Solo ensamblaje",
}

export const PRIORIDAD_LABELS: Record<PrioridadArmado, string> = {
  grafica: "Mejor gráfica",
  procesador: "Mejor procesador",
  placa: "Mejor placa",
  estetica: "Mejor estética",
  refrigeracion: "Mejor refrigeración",
  almacenamiento: "Más almacenamiento",
  silencio: "Más silencioso",
  portabilidad: "Portabilidad",
}
