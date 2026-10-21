import api from "../lib/api"

// Actualizar la interfaz SaleItem para incluir el flag es_mayorista
export interface SaleItem {
  codigo_barras: string
  cantidad?: number // Añadir campo de cantidad opcional
  es_mayorista?: boolean // Añadir flag para indicar si se usa precio mayorista
  precio_unitario_con_igv?: string // Añadir campo para precio variable
}

// Actualizar la interfaz SaleFormData para incluir los campos de descuento
export interface SaleFormData {
  id_cajero: number
  metodo_pago: string
  idempotency_key?: string // M5: reintentos de red no duplican la venta
  observaciones?: string | null
  fecha?: string // Campo de fecha en formato YYYY-MM-DD HH:mm:ss con timezone Perú
  items: SaleItem[]
  comprobante?: {
    tipo_documento: string // '1' para Factura, '3' para Boleta
    cliente_tipo_documento: string // '1' para DNI, '6' para RUC
    cliente_numero_documento: string
    cliente_nombre: string
    cliente_direccion?: string
    cliente_email?: string
  }
  yape_celular?: string
  yape_codigo?: string
  plin_celular?: string
  plin_codigo?: string
  // SOLO ESTOS DOS CAMPOS DE DESCUENTO
  es_descuento?: boolean
  descuento?: number
  pos_pago?: { id_adquirente: number; canal?: 'pos' | 'qr' | 'link'; numero_operacion: string; ultimos_cuatro?: string; marca_tarjeta?: string }
}

// Actualizar la interfaz Sale para incluir los campos de descuento
export interface Sale {
  venta_id: number
  fecha: string
  total: string
  total_con_igv: string
  id_cajero: number
  metodo_pago: string
  observaciones: string | null
  detalles?: SaleDetail[]
  tipo_documento?: string
  serie?: string
  correlativo?: number
  cliente_tipo_documento?: string
  cliente_numero_documento?: string
  cliente_nombre?: string
  comprobante_emitido?: boolean
  estado_comprobante?: 'sin_emitir' | 'pendiente' | 'aceptado' | 'rechazado' | 'error'
  // SOLO ESTOS DOS CAMPOS DE DESCUENTO
  es_descuento?: boolean
  descuento?: number
  pago_pos?: { id_pago_pos: number; canal: 'pos' | 'qr' | 'link'; numero_operacion: string; monto_centimos: number; estado: 'pendiente_confirmacion' | 'confirmado' | 'anulado'; confirmado_en?: string | null; adquirente?: { id_adquirente: number; nombre: string; marca?: string | null } }
  cliente?: {
    tipoDoc?: string
    numDoc?: string
    nombre?: string
    direccion?: string
    email?: string
  }
}

// Actualizar la interfaz SaleDetail para incluir el flag es_venta_mayorista
export interface SaleDetail {
  detalle_id: number
  venta_id: number
  producto_id: number
  cantidad: number
  precio_unitario: string
  precio_unitario_con_igv: string
  subtotal: string
  subtotal_con_igv: string
  es_venta_mayorista?: boolean // Añadir flag para indicar si se usó precio mayorista
  es_oferta?: boolean // Añadir flag para indicar si se usó precio de oferta
  precio_oferta?: string // Precio de oferta sin IGV
  precio_oferta_con_igv?: string // Precio de oferta con IGV
  producto?: {
    id_producto: number
    nombre: string
    sku: string
    id_categoria?: number
    precio_unitario?: string
    precio_unitario_con_igv?: string
    es_oferta?: boolean
    precio_oferta?: string
    precio_oferta_con_igv?: string
  }
}

// Modificar la función fetchSales para manejar silenciosamente los errores 403
export const fetchSales = async (): Promise<Sale[]> => {
  try {
    const response = await api.get(`/ventas`)
    return response.data
  } catch (error: any) {
    throw error
  }
}

// Modificar la función fetchSaleById para manejar silenciosamente los errores 403
export const fetchSaleById = async (id: number): Promise<Sale> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de venta no válido")
    }

    const response = await api.get(`/ventas/${id}`)
    return response.data
  } catch (error: any) {
    throw error
  }
}

export const fetchSalesByCajero = async (cajeroId: number): Promise<Sale[]> => {
  // Validar que el ID sea un número válido
  if (cajeroId === undefined || cajeroId === null || isNaN(Number(cajeroId))) {
    throw new Error("ID de cajero no válido")
    return []
  }

  const response = await api.get(`/ventas/cajero/${cajeroId}`)
  return response.data
}

export const fetchSalesByDate = async (date: string): Promise<Sale[]> => {
  // Validar que la fecha no esté vacía
  if (!date || date.trim() === "") {
    throw new Error("Fecha no válida")
    return []
  }

  const response = await api.get(`/ventas/fecha/${date}`)
  return response.data
}

export const fetchSalesByDateRange = async (fechaInicio: string, fechaFin: string): Promise<Sale[]> => {
  // Validar que las fechas no estén vacías
  if (!fechaInicio || fechaInicio.trim() === "" || !fechaFin || fechaFin.trim() === "") {
    throw new Error("Fechas no válidas")
    return []
  }

  const response = await api.get(`/ventas/rango-fechas`, {
    params: { fechaInicio, fechaFin },
  })
  return response.data
}

export const createSale = async (data: SaleFormData): Promise<any> => {
  const response = await api.post(`/ventas`, data)
  return response.data
}

export const confirmPosPayment = async (saleId: number) => (await api.post(`/pos/ventas/${saleId}/confirmar`)).data

export const emitElectronicDocument = async (saleId: number) => {
  const response = await api.post(`/facturacion/emitir/${saleId}`)
  return response.data
}

// Función para obtener los detalles de una venta específica
export const fetchSaleDetail = async (saleId: number) => {
  try {
    // Validar que el ID sea un número válido
    if (saleId === undefined || saleId === null || isNaN(Number(saleId))) {
      throw new Error("ID de venta no válido")
    }

    const response = await api.get(`/ventas/${saleId}`)
    return response.data
  } catch (error) {
    console.error("Error fetching sale detail:", error)
    throw error
  }
}

// Función para generar ticket de venta (no comprobante fiscal)
export const generateSaleTicket = async (saleId: number): Promise<{
  message: string
  html: string
  data: {
    venta_id: number
    fecha: string
    empresa: {
      razon_social: string
      ruc: string
      direccion: string
    }
    totales: {
      subtotal: string
      igv: string
      total: string
      descuento: number
    }
  }
}> => {
  try {
    // Validar que el ID sea un número válido
    if (saleId === undefined || saleId === null || isNaN(Number(saleId))) {
      throw new Error("ID de venta no válido")
    }

    const response = await api.get(`/ventas/ticket/${saleId}`)
    return response.data
  } catch (error) {
    console.error("Error generating sale ticket:", error)
    throw error
  }
}

// Eliminar una venta (solo para gerentes y solo ventas simples)
export const deleteSale = async (saleId: number): Promise<{ 
  message: string
  venta_eliminada: {
    id: number
    fecha: string
    total: string
    metodo_pago: string
  }
}> => {
  try {
    // Validar que el ID sea un número válido
    if (saleId === undefined || saleId === null || isNaN(Number(saleId))) {
      throw new Error("ID de venta no válido")
    }

    const response = await api.delete(`/ventas/${saleId}`)
    return response.data
  } catch (error: any) {
    // Si es un error 403, lanzar un error más específico
    if (error.response?.status === 403) {
      throw new Error("No tienes permisos para eliminar ventas")
    }
    // Si es un error 400, podría ser porque la venta no se puede eliminar
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || "Esta venta no se puede eliminar")
    }
    console.error("Error deleting sale:", error)
    throw error
  }
}
