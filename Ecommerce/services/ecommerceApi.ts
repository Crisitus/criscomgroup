import axios from "axios";
import { ECOMMERCE_API_URL, API_URL } from "../config/constants";

// Cliente axios para rutas públicas de ecommerce (sin autenticación)
const ecommerceApi = axios.create({
  baseURL: ECOMMERCE_API_URL,
});

// Cliente axios para autenticación (usa API_URL base)
const authApi = axios.create({
  baseURL: API_URL,
});

// ==================== TIPOS DEL BACKEND ====================

interface BackendProductImage {
  id_imagen: number;
  image_path: string;
  orden: number;
}

interface BackendProduct {
  id_producto: number;
  nombre: string;
  descripcion: string;
  precio: number;
  es_oferta: boolean;
  precio_oferta: number | null;
  stock: number;
  condicion: "nuevo" | "segunda_mano";
  garantia_meses: number;
  estado_observaciones?: string | null;
  imagen_url: string | null;
  imagenes?: BackendProductImage[];
  id_categoria: number;
  affiliate_business_id?: number | null;
  categoria: {
    nombre: string | null;
  };
}

interface BackendCategory {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
}

interface BackendBanner {
  id_banner?: number;
  titulo?: string | null;
  imagen_url: string;
  activo?: boolean;
  media_type?: "image" | "video";
  creado_en?: string;
}

// ==================== TIPOS DEL FRONTEND ====================

export interface ProductImage {
  id: number;
  image_path: string;
  order: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  precio_de_oferta?: number;
  stock: number;
  condicion: "nuevo" | "segunda_mano";
  garantia_meses: number;
  estado_observaciones?: string;
  imagen?: string;
  images?: ProductImage[];
  category_id: number;
  affiliate_business_id?: number | null;
  category: {
    id: number;
    name: string;
  };
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  imagen?: string;
}

export interface Banner {
  id?: number;
  title?: string;
  image: string;
  active?: boolean;
  mediaType?: "image" | "video";
  createdAt?: string;
}

export interface PublicCommerceStats {
  productos_disponibles: number;
  clientes_atendidos: number;
  actualizado_en: string;
}

// ==================== FUNCIONES DE MAPEO ====================

const mapBackendProductToFrontend = (product: BackendProduct): Product => ({
  id: product.id_producto,
  name: product.nombre,
  description: product.descripcion || "",
  price: product.precio,
  precio_de_oferta:
    product.es_oferta && product.precio_oferta
      ? product.precio_oferta
      : undefined,
  stock: Number(product.stock ?? 0),
  condicion: product.condicion || "nuevo",
  garantia_meses: Number(
    product.garantia_meses ?? (product.condicion === "segunda_mano" ? 3 : 12),
  ),
  estado_observaciones: product.estado_observaciones || undefined,
  imagen: product.imagen_url || undefined,
  images:
    product.imagenes?.map((img) => ({
      id: img.id_imagen,
      image_path: img.image_path,
      order: img.orden,
    })) || [],
  category_id: product.id_categoria,
  affiliate_business_id: product.affiliate_business_id || null,
  category: {
    id: product.id_categoria,
    name: product.categoria?.nombre || "Sin categoría",
  },
});

const mapBackendCategoryToFrontend = (category: BackendCategory): Category => ({
  id: category.id_categoria,
  name: category.nombre,
  description: category.descripcion || undefined,
  imagen: category.imagen_url || undefined,
});

const mapBackendBannerToFrontend = (banner: BackendBanner): Banner => ({
  id: banner.id_banner,
  title: banner.titulo || undefined,
  image: banner.imagen_url,
  active: banner.activo ?? true,
  mediaType: banner.media_type ?? "image",
  createdAt: banner.creado_en,
});

// ==================== SERVICIOS PÚBLICOS DE ECOMMERCE ====================

// Servicios para productos (rutas públicas sin autenticación)
export const ecommerceProductService = {
  // Obtener todos los productos
  getAll: async (): Promise<{ data: Product[] }> => {
    const response = await ecommerceApi.get<BackendProduct[]>("/productos");
    const products = response.data.map(mapBackendProductToFrontend);
    return { data: products };
  },

  // Obtener producto por ID
  getById: async (id: number): Promise<{ data: Product }> => {
    const response = await ecommerceApi.get<BackendProduct>(`/productos/${id}`);
    const product = mapBackendProductToFrontend(response.data);
    return { data: product };
  },

  // Obtener productos en oferta
  getOffers: async (): Promise<{ data: Product[] }> => {
    const response = await ecommerceApi.get<BackendProduct[]>("/ofertas");
    const products = response.data.map(mapBackendProductToFrontend);
    return { data: products };
  },

  // Obtener productos destacados (usa ofertas como destacados)
  getFeaturedProducts: async (): Promise<{ data: Product[] }> => {
    const response = await ecommerceApi.get<BackendProduct[]>("/ofertas");
    const products = response.data.map(mapBackendProductToFrontend);
    return { data: products };
  },

  // Obtener productos por categoría
  getByCategory: async (categoryId: number): Promise<{ data: Product[] }> => {
    const response = await ecommerceApi.get<BackendProduct[]>(
      `/categorias/${categoryId}/productos`,
    );
    const products = response.data.map(mapBackendProductToFrontend);
    return { data: products };
  },
};

export const publicStatsService = {
  get: async (): Promise<PublicCommerceStats> => {
    const response = await ecommerceApi.get<PublicCommerceStats>("/estadisticas-publicas");
    return response.data;
  },
};

// Servicios para categorías (rutas públicas sin autenticación)
export const ecommerceCategoryService = {
  // Obtener todas las categorías
  getAll: async (): Promise<{ data: Category[] }> => {
    const response = await ecommerceApi.get<BackendCategory[]>("/categorias");
    const categories = response.data.map(mapBackendCategoryToFrontend);
    return { data: categories };
  },
};

// Servicios para banners (rutas públicas sin autenticación)
export const ecommerceBannerService = {
  // Obtener todos los banners
  getAll: async (): Promise<{ data: Banner[] }> => {
    const response = await ecommerceApi.get<BackendBanner[]>("/banners");
    const banners = response.data.map(mapBackendBannerToFrontend);
    return { data: banners };
  },

  // Obtener banner principal
  getMain: async (): Promise<{ data: Banner }> => {
    const response = await ecommerceApi.get<BackendBanner>("/banner");
    const banner = mapBackendBannerToFrontend(response.data);
    return { data: banner };
  },
};

// Servicios para libro de reclamaciones
export const ecommerceClaimService = {
  create: async (data: {
    nombre: string;
    email: string;
    telefono?: string;
    documento: string;
    domicilio: string;
    es_menor: boolean;
    apoderado?: string;
    tipo_bien: "producto" | "servicio";
    bien: string;
    monto?: number;
    tipo: "reclamo" | "queja";
    detalle: string;
    pedido: string;
    acepta_declaracion: true;
  }): Promise<{
    data: { success: boolean; codigo: string; fecha: string; message: string };
  }> => {
    return ecommerceApi.post("/libro-reclamaciones", data);
  },
};

export type CrearPostventaPayload = {
  nombre: string;
  email: string;
  telefono?: string;
  numero_pedido: string;
  tipo: "cambio" | "devolucion" | "garantia";
  producto_servicio: string;
  motivo: string;
  detalle: string;
  solucion_solicitada: string;
  acepta_declaracion: true;
  cantidad?: number;
  website?: string;
};

export type PostventaPublica = {
  codigo_seguimiento: string;
  tipo: CrearPostventaPayload["tipo"];
  producto_servicio: string;
  estado: string;
  respuesta_cliente?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  linea_tiempo?: { estado: string; fecha: string }[];
};

export const ecommercePostventaService = {
  crear: async (
    data: CrearPostventaPayload,
  ): Promise<{ success: boolean; message: string; data: PostventaPublica }> =>
    (await ecommerceApi.post("/postventa", data)).data,
  // Segundo factor obligatorio: correo o 4 ultimos digitos del telefono.
  seguimiento: async (
    codigo: string,
    factor: { email?: string; telefono4?: string },
  ): Promise<{ success: boolean; data: PostventaPublica }> =>
    (await ecommerceApi.post("/postventa/seguimiento", { codigo, ...factor })).data,
};

export type CrearSolicitudServicioPayload = {
  cliente: string;
  telefono: string;
  email?: string;
  tipo_equipo: string;
  marca_modelo?: string;
  falla: string;
  disponibilidad?: string;
  consentimiento_contacto: boolean;
};
export const ecommerceServiceRequestService = {
  crear: async (
    data: CrearSolicitudServicioPayload,
  ): Promise<{ success: boolean; codigo: string; message: string }> =>
    (await ecommerceApi.post("/solicitudes-servicio", data)).data,
};

// ==================== SOLICITUD DE ARMADO / ENSAMBLE DE PC ====================
// Público (sin auth). Tres modos:
//   - "marketplace": cliente elige productos del catálogo
//   - "presupuesto": cliente elige un tier de presupuesto y responde preferencias
//   - "ensamble_propio": cliente ya tiene las piezas y solo necesita el servicio de ensamblaje
// Devuelve codigo_seguimiento (ARM-AAAAMMDD-XXXXXX).

export type TierPresupuesto =
  "oficina" | "gamer" | "alto_rendimiento" | "workstation" | "otro";

export type PrioridadArmado =
  | "grafica"
  | "procesador"
  | "placa"
  | "estetica"
  | "refrigeracion"
  | "almacenamiento"
  | "silencio"
  | "portabilidad";

export type ProductoElegido = {
  id_producto: number;
  nombre: string;
  precio?: number | null;
  cantidad: number;
};

export type CrearSolicitudEnsamblePayload = {
  nombre_solicitante: string;
  telefono_solicitante: string;
  email_solicitante?: string;
  ciudad: string;
  modo: "marketplace" | "presupuesto" | "ensamble_propio";
  // modo marketplace
  productos?: ProductoElegido[];
  // modo presupuesto
  tier_presupuesto?: TierPresupuesto;
  presupuesto_personalizado?: number; // en soles, solo cuando tier_presupuesto = 'otro'
  uso_descripcion?: string;
  incluye_perifericos?: "solo_pc" | "con_perifericos";
  marcas_preferencia?: string;
  prioridades?: PrioridadArmado[];
  mensaje?: string;
};

// Vista pública del seguimiento: sin nombre, ciudad ni teléfono. Precios con IGV incluido.
export type SolicitudEnsamblePublica = {
  id_solicitud: number;
  codigo_seguimiento: string | null;
  modo: "marketplace" | "presupuesto" | "ensamble_propio";
  productos?: { nombre: string; cantidad: number; precio: number }[] | null;
  total_referencial?: number | null;
  tier_presupuesto?: TierPresupuesto | null;
  presupuesto_personalizado?: number | null;
  uso_descripcion?: string | null;
  incluye_perifericos?: "solo_pc" | "con_perifericos" | null;
  marcas_preferencia?: string | null;
  prioridades?: PrioridadArmado[] | null;
  estado: string;
  moneda?: "PEN";
  cotizacion_monto?: number | null;
  cotizacion_nota?: string | null;
  cotizacion_fecha?: string | null;
  valida_hasta?: string | null;
  vencida?: boolean;
  // Fecha civil AAAA-MM-DD
  fecha_entrega_estimada?: string | null;
  created_at?: string;
  updated_at?: string;
  linea_tiempo?: { estado: string; fecha: string }[];
};

// Segundo factor obligatorio del seguimiento: correo o 4 últimos dígitos del teléfono.
export type FactorSeguimiento = { email?: string; telefono4?: string };

export const ecommerceEnsambleService = {
  crear: async (
    data: CrearSolicitudEnsamblePayload,
  ): Promise<{
    success: boolean;
    msg: string;
    data?: SolicitudEnsamblePublica;
  }> => {
    const response = await ecommerceApi.post("/solicitudes-ensamble", data);
    return response.data;
  },
  seguimiento: async (
    codigo: string,
    factor: FactorSeguimiento,
  ): Promise<{
    success: boolean;
    data?: SolicitudEnsamblePublica;
    msg?: string;
  }> => {
    const response = await ecommerceApi.post("/seguimiento-ensamble", {
      codigo,
      ...factor,
    });
    return response.data;
  },
};

// ==================== TIPOS DE AUTENTICACIÓN ====================

export interface User {
  id: number;
  id_user: number;
  name: string;
  email: string;
  celular?: string | null;
  id_role: number;
}

export interface AuthResponse {
  success: boolean;
  msg?: string;
  token?: string;
  user?: User;
  errors?: Array<{ msg: string; param: string }>;
}

// ==================== SERVICIOS DE AUTENTICACIÓN ====================

const TOKEN_KEY = "ecommerce_token";
const USER_KEY = "ecommerce_user";

// ==================== TIPOS DE SOLICITUD DE IMPORTACIÓN ====================

export interface SolicitudImportacion {
  id_solicitud: number;
  id_usuario: number;
  nombre_producto: string;
  tipo_producto:
    | "laptop"
    | "componente"
    | "periferico"
    | "monitor"
    | "almacenamiento"
    | "red"
    | "otro";
  marca?: string;
  modelo?: string;
  especificaciones?: string;
  pais_origen?: string;
  cantidad: number;
  presupuesto_min?: number;
  presupuesto_max?: number;
  nivel_urgencia: "baja" | "media" | "alta" | "urgente";
  mensaje?: string;
  imagenes?: string[];
  estado: string;
  moneda?: "USD";
  cotizacion_monto?: number;
  cotizacion_nota?: string;
  cotizacion_fecha?: string;
  valida_hasta?: string | null;
  vencida?: boolean;
  codigo_seguimiento?: string;
  // Fecha civil AAAA-MM-DD
  fecha_entrega_estimada?: string;
  created_at?: string;
  updated_at?: string;
  // Legado: solo lo leen las pantallas muertas (mis-solicitudes/admin); la API real devuelve created_at/updated_at.
  fecha_creacion: string;
  fecha_actualizacion: string;
  linea_tiempo?: { estado: string; fecha: string }[];
}

// ==================== SERVICIO DE SOLICITUDES DE IMPORTACIÓN ====================
// MVP hot-patch: endpoints públicos (sin auth). Cliente identifica su solicitud
// con el codigo_seguimiento que devuelve el POST.
// La versión con auth de cliente (misSolicitudes real) queda pendiente para el
// ciclo ecommerce-features cuando exista un sistema de auth de clientes.

export type CrearSolicitudPayload = {
  nombre_solicitante: string;
  email_solicitante: string;
  telefono_solicitante?: string;
  nombre_producto: string;
  tipo_producto:
    | "laptop"
    | "componente"
    | "periferico"
    | "monitor"
    | "almacenamiento"
    | "red"
    | "otro";
  marca?: string;
  modelo?: string;
  especificaciones?: string;
  pais_origen?: string;
  cantidad: number;
  presupuesto_min?: number | string;
  presupuesto_max?: number | string;
  nivel_urgencia?: "baja" | "media" | "alta" | "urgente";
  mensaje?: string;
};

export const ecommerceImportService = {
  // Crear solicitud (público — sin auth).
  crear: async (
    data: CrearSolicitudPayload,
  ): Promise<{
    success: boolean;
    msg: string;
    data?: SolicitudImportacion;
  }> => {
    const response = await ecommerceApi.post("/solicitudes-importacion", data);
    return response.data;
  },

  // Seguimiento público por código de seguimiento.
  // Segundo factor obligatorio: correo o 4 últimos dígitos del teléfono.
  seguimiento: async (
    codigo: string,
    factor: FactorSeguimiento,
  ): Promise<{
    success: boolean;
    data?: SolicitudImportacion;
    msg?: string;
  }> => {
    const response = await ecommerceApi.post("/seguimiento", {
      codigo,
      ...factor,
    });
    return response.data;
  },

  // Legacy: mantenido como stub para no romper imports en `/mis-solicitudes`
  // hasta que se implemente auth de clientes en ecommerce-features.
  misSolicitudes: async (): Promise<{
    success: boolean;
    data: SolicitudImportacion[];
  }> => {
    return { success: true, data: [] };
  },
};

export const ecommerceAuthService = {
  // Registro de clientes (público)
  register: async (data: {
    name: string;
    email: string;
    password: string;
    celular?: string;
    comunidad?: boolean;
  }): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>(
      "/auth/register-customer",
      data,
    );

    if (response.data.success && response.data.token && response.data.user) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  },

  // Login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>("/auth/login", {
      email,
      password,
    });

    if (response.data.success && response.data.token && response.data.user) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));

      // El ERP comparte el dominio pero usa estas claves históricas.
      const isMaster =
        response.data.user.email.trim().toLowerCase() ===
        "cristophercalioro@gmail.com";
      if (response.data.user.id_role === 3 || isMaster) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    return response.data;
  },

  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>("/auth/google", {
      credential,
    });
    if (response.data.success && response.data.token && response.data.user) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));

      const isMaster =
        response.data.user.email.trim().toLowerCase() ===
        "cristophercalioro@gmail.com";
      if (response.data.user.id_role === 3 || isMaster) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Obtener usuario actual
  getCurrentUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  // Verificar si está autenticado
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Obtener token
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
};

export const communityService = {
  subscribe: async (email: string, nombre?: string) => {
    const response = await authApi.post("/community/subscribe", {
      email,
      nombre,
      consentimiento: true,
      fuente: "footer",
    });
    return response.data as { success: boolean; message: string };
  },
};

export default ecommerceApi;
