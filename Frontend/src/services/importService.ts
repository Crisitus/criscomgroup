import api from '../lib/api'

export type ImportRecord = {
  id_importacion: number
  producto_id: number | null
  cantidad: number
  tipo_cambio: string
  inventario_registrado_en?: string | null
  referencia: string
  proveedor: string
  pais_origen: string
  descripcion: string
  tracking?: string | null
  regimen_aduanero?: string | null
  moneda: 'USD' | 'PEN' | 'EUR'
  costo_mercancia: string
  flete: string
  seguro: string
  tributos: string
  otros_costos: string
  estado: 'planificada' | 'en_transito' | 'en_aduanas' | 'liberada' | 'recibida' | 'cancelada'
  fecha_embarque?: string | null
  fecha_llegada_estimada?: string | null
  dam_dua?: string | null
  notas_contables?: string | null
  creado_en?: string
  producto?: { id_producto: number; nombre: string; sku: string; stock: number } | null
}

export const listImports = async (): Promise<ImportRecord[]> => (await api.get('/importaciones')).data
export const createImport = async (data: Record<string, unknown>) => (await api.post('/importaciones', data)).data
export const updateImport = async (id: number, data: Record<string, unknown>) => (await api.put(`/importaciones/${id}`, data)).data
export const deleteImport = async (id: number) => { await api.delete(`/importaciones/${id}`) }
