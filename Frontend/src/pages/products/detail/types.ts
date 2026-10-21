export interface Ficha {
  id_producto: number
  sku: string
  nombre: string
  descripcion: string | null
  precio_unitario: string
  precio_unitario_con_igv: string
  precio_mayoritario: string | null
  precio_mayoritario_con_igv: string | null
  es_oferta: boolean
  stock: number
  stock_minimo: number
  costo_promedio: string
  ultimo_costo: string
  condicion: "nuevo" | "segunda_mano"
  origen: "local" | "importado"
  garantia_meses: number
  estado_observaciones: string | null
  id_categoria: number
  imagen_url: string | null
  categoria?: { nombre: string }
}

export interface Quant {
  id_quant_inventario: number
  lote: string | null
  numero_serie: string | null
  disponible: number
  reservado: number
  ubicacion?: { codigo: string; nombre: string; tipo: string }
}

/** Metricas que calcula el backend en /commercial/inventory/dashboard. */
export interface Metrics {
  quants: Quant[]
  stock_reservado: number
  stock_sin_ubicar: number
  valor_stock: number
}

export interface Code {
  id: number
  codigo: string
  cantidad: number
  fecha_ingreso: string
}

export interface TempCode {
  codigo: string
  cantidad: number
}

export type MovType = "compra" | "venta" | "ajuste_entrada" | "ajuste_salida" | "reserva" | "liberacion"

export interface Movement {
  id_movimiento: number
  tipo: MovType
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  costo_unitario: string | null
  motivo: string | null
  creado_en: string
}

export interface Draft {
  sku: string
  nombre: string
  descripcion: string
  categoria: string
  precio: string
  mayorista: string
  condicion: "nuevo" | "segunda_mano"
  origen: "local" | "importado"
  garantia: string
  minimo: string
  obs: string
}

export type Category = { id_categoria: number; nombre: string }
