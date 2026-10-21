import api from '../lib/api'
export interface AffiliatePayment { id_affiliate_payment: number; monto: string; metodo: string; referencia: string; estado: 'pendiente'|'validado'|'rechazado'; creado_en: string }
export interface AffiliateSettlement { id_settlement: number; periodo: string; facturacion_valida: string; monto_comision: string; vence_en: string; estado: 'pendiente'|'pagado'|'vencido'|'anulado'; payments: AffiliatePayment[] }
export interface AffiliateAccount { business: { id_affiliate_business: number; nombre_comercial: string; logo_url?: string|null; identidad_configurada?: boolean; estado: string; comision_porcentaje: string; prueba_inicia_en?: string|null; prueba_finaliza_en?: string|null }; settlements: AffiliateSettlement[]; culqi_public_key?: string|null }
export const getAffiliateAccount = async (): Promise<AffiliateAccount> => (await api.get('/affiliates/me')).data
export const getAffiliates = async (): Promise<any[]> => (await api.get('/affiliates')).data
export const generateSettlement = async (businessId: number, periodo: string): Promise<Omit<AffiliateSettlement, 'payments'> & { periodo_cerrado: boolean }> => (await api.post(`/affiliates/${businessId}/settlements`, { periodo })).data
export const submitAffiliatePayment = async (settlementId: number, data: { monto: number; metodo: string; referencia: string; observaciones?: string }) => (await api.post(`/affiliates/settlements/${settlementId}/payments`, data)).data
export const validateAffiliatePayment = async (paymentId: number, aprobado: boolean, observaciones?: string) => (await api.patch(`/affiliates/payments/${paymentId}/validate`, { aprobado, observaciones })).data
export const payAffiliateByCard = async (settlementId: number, token: string) => (await api.post(`/affiliates/settlements/${settlementId}/pay-card`, { token })).data
export const updateAffiliateIdentity = async (nombre_comercial: string, logo?: File) => {
  const form = new FormData(); form.append('nombre_comercial', nombre_comercial); if (logo) form.append('affiliate_logo', logo)
  return (await api.put('/affiliates/me/identity', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
}
