// Servicios de datos del home público (port criscom-ecom-home).
// Endpoints reales del contrato (odd/tasks/ecom-logica-auditoria.md + home-data.json).
// Errores: el caller lee error.response.data.message del backend.
import axios from "axios"
import { ECOMMERCE_API_URL, API_URL } from "@/config/constants"

export interface HomeBanner {
  id_banner: number
  imagen_url: string
  media_type: "image" | "video"
  titulo: string | null
  activo: boolean
  orden: number
  whatsapp: string | null
}

export interface HomeCategoria {
  id_categoria: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
}

export interface HomeOferta {
  id_producto: number
  nombre: string
  precio: string
  precio_oferta: string
  stock: number
  imagen_url: string | null
  affiliate_business_id?: number | null
  categoria?: { nombre: string | null } | null
}

export interface HomeTarjeta {
  id_tarjeta: number
  titulo: string
  descripcion: string
  imagen_url: string | null
}

export interface HomePost {
  id_post: number
  titulo: string
  slug: string
  resumen: string
  imagen_url: string | null
  categoria: string | null
  publicado_en: string
}

export interface HomeStats {
  productos_disponibles: number
  clientes_atendidos: number
}

const getJson = async <T>(base: string, path: string): Promise<T> =>
  (await axios.get<T>(`${base}${path}`)).data

export const homeService = {
  banners: () => getJson<HomeBanner[]>(ECOMMERCE_API_URL, "/banners"),
  categorias: () => getJson<HomeCategoria[]>(ECOMMERCE_API_URL, "/categorias"),
  ofertas: () => getJson<HomeOferta[]>(ECOMMERCE_API_URL, "/ofertas"),
  tarjetas: () => getJson<HomeTarjeta[]>(ECOMMERCE_API_URL, "/tarjetas"),
  estadisticas: () => getJson<HomeStats>(ECOMMERCE_API_URL, "/estadisticas-publicas"),
  blog: () => getJson<HomePost[]>(API_URL, "/blog/public"),
  suscribirComunidad: async (email: string): Promise<{ success: boolean; message: string }> =>
    (await axios.post(`${API_URL}/community/subscribe`, { email, consentimiento: true, fuente: "home" })).data,
}

// Mensaje de error del backend (400 con message) o genérico honesto.
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || fallback
}
