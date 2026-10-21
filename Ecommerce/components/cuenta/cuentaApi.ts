// Acceso a datos de cuenta/seguimiento. Reusa los servicios existentes para
// importación/ensamble/pedidos; aquí solo van los endpoints que aún no tienen
// servicio en services/ (mis-solicitudes autenticado y seguimiento de servicio).
import axios from "axios"
import { API_URL, ECOMMERCE_API_URL } from "@/config/constants"
import { ecommerceAuthService } from "@/services/ecommerceApi"
import type { Order, OrderDetail } from "@/services/orderService"

const authHeaders = () => {
  const t = ecommerceAuthService.getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// GET /api/ecommerce/mis-solicitudes (auth): importación + ensamble + servicio.
export type MisSolicitudesItem = {
  tipo: "importacion" | "ensamble" | "servicio"
  codigo: string
  estado: string
  fecha: string
}
export type MisSolicitudesResp = {
  success: boolean
  data: MisSolicitudesItem[]
  paginacion: { pagina: number; limite: number; total: number; paginas: number }
}
export const getMisSolicitudes = async (page = 1, limit = 10): Promise<MisSolicitudesResp> =>
  (await axios.get(`${ECOMMERCE_API_URL}/mis-solicitudes`, {
    headers: authHeaders(),
    params: { page, limit },
  })).data

// GET /api/ecommerce/servicio-tecnico/seguimiento/:token (público, por token de orden).
export type ServicioTrack = {
  codigo: string
  equipo: string
  estado: string
  fecha_ingreso: string | null
  fecha_entrega_estimada: string | null
  garantia_fin: string | null
  avances: { estado: string; fecha: string }[]
  evidencias: {
    id_evidencia_servicio: number
    etapa: string
    tipo: string
    descripcion: string | null
    archivo_url: string
  }[]
}
export const trackServicioToken = async (token: string): Promise<ServicioTrack> =>
  (await axios.get(
    `${ECOMMERCE_API_URL}/servicio-tecnico/seguimiento/${encodeURIComponent(token)}`,
  )).data

// El Order de orderService es un subconjunto: la API de mis-pedidos devuelve más
// campos (contrato cuenta-data.json). Se amplían aquí sin tocar el servicio.
export type PedidoDetalle = OrderDetail & {
  condicion?: string | null
  garantia_meses?: number | null
}
export type PedidoCuenta = Omit<Order, "detalles"> & {
  tipo_comprobante?: string | null
  subtotal?: string | number | null
  costo_envio?: string | number | null
  recargo_tarjeta?: string | number | null
  detalles: PedidoDetalle[]
}
export const getMisPedidos = async (): Promise<PedidoCuenta[]> =>
  (await axios.get(`${API_URL}/pedidos/mis-pedidos`, { headers: authHeaders() })).data.pedidos ?? []

export const es401 = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 401
