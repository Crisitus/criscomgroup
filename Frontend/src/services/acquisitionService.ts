import api from '../lib/api'

export type Acquisition = {
  id_adquisicion: number
  producto_id?: number | null
  inventario_registrado_en?: string | null
  tipo_operacion: 'compra' | 'donacion_real' | 'cesion_gratuita'
  transferente_tipo_documento: string
  transferente_numero_documento: string
  transferente_nombre: string
  transferente_contacto?: string | null
  declaracion_no_habitual: boolean
  formulario_820?: string | null
  monto_adquisicion: string
  medio_pago?: string | null
  referencia_pago?: string | null
  marca?: string | null
  modelo?: string | null
  numero_serie: string
  tipo_componente: string
  capacidad?: string | null
  estado_recepcion: string
  smart_salud_porcentaje?: string | null
  tbw_escrito?: string | null
  tbw_nominal?: string | null
  horas_encendido?: number | null
  ciclos_encendido?: number | null
  ciclos_bateria?: number | null
  capacidad_bateria_diseno?: number | null
  capacidad_bateria_actual?: number | null
  prueba_funcional: 'pendiente' | 'aprobado' | 'observado' | 'rechazado'
  grado_evaluacion?: 'A' | 'B' | 'C' | 'D' | 'defectuoso' | null
  puntaje_evaluacion?: string | null
  observaciones_tecnicas?: string | null
  evaluacion_detalle?: { grade: string; score: number; alerts: string[] } | null
  accesorios?: string | null
  procedencia_declarada: string
  declaracion_propiedad: boolean
  fecha_adquisicion: string
  producto?: { id_producto: number; nombre: string; sku: string; condicion: string; stock: number } | null
}

export const listAcquisitions = async (): Promise<Acquisition[]> => (await api.get('/adquisiciones-usados')).data
export const createAcquisition = async (data: Record<string, unknown>): Promise<Acquisition> => (await api.post('/adquisiciones-usados', data)).data.adquisicion
/** PUT parcial; con `registrar_inventario: true` ingresa al stock un expediente ya creado. */
export const updateAcquisition = async (id: number, data: Record<string, unknown>): Promise<Acquisition> => (await api.put(`/adquisiciones-usados/${id}`, data)).data.adquisicion
export const evaluateAcquisition = async (data: Record<string, unknown>) => (await api.post('/adquisiciones-usados/evaluar', data)).data.evaluacion
