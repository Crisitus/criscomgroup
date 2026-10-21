import api from '../lib/api'

export type AdquirentePos = { id_adquirente: number; nombre: string; marca?: string | null; activo: boolean; predeterminado: boolean; canales: ('pos' | 'qr' | 'link')[]; modo_confirmacion: 'manual' | 'api'; link_pago_url?: string | null; requiere_referencia: boolean; orden: number }
export type PagoPos = { id_pago_pos: number; canal: 'pos' | 'qr' | 'link'; numero_operacion: string; monto_centimos: number; moneda: string; estado: string; creado_en: string; adquirente?: AdquirentePos; venta?: { venta_id: number; fecha: string; total_con_igv: string } }

export const listAdquirentesPos = async (todos = false): Promise<AdquirentePos[]> => (await api.get('/pos/adquirentes', { params: todos ? { todos: 1 } : {} })).data.adquirentes
export const createAdquirentePos = async (data: Partial<AdquirentePos>) => (await api.post('/pos/adquirentes', data)).data.adquirente
export const updateAdquirentePos = async (id: number, data: Partial<AdquirentePos>) => (await api.patch(`/pos/adquirentes/${id}`, data)).data.adquirente
export const listPagosPos = async (): Promise<PagoPos[]> => (await api.get('/pos/pagos')).data.pagos
