import api from '../lib/api'

export type GatewayProvider = 'niubiz' | 'vendemas' | 'culqi' | 'openpay' | 'izipay'
export type GatewayStatus = 'not_configured' | 'saved' | 'connected' | 'error' | 'contract_required'
export interface GatewayCatalogItem { provider: GatewayProvider; name: string; fields: string[]; supportsApiTest: boolean; integrated: boolean }
export interface PaymentGateway {
  id_gateway?: number; provider: GatewayProvider; name: string; mode: 'test' | 'production'; enabled: boolean; is_default: boolean
  integrated: boolean; en_uso: boolean; connection_status: GatewayStatus; connection_message?: string; last_checked_at?: string
  configured_fields: Record<string, string>; credentials_error?: boolean; webhook_url: string | null
}
export interface GatewayList { gateways: PaymentGateway[]; advertencias: string[] }

export const getGatewayCatalog = async () => (await api.get('/payment-gateways/catalog')).data.providers as GatewayCatalogItem[]
export const listPaymentGateways = async (): Promise<GatewayList> => {
  const data = (await api.get('/payment-gateways')).data
  return { gateways: data.gateways as PaymentGateway[], advertencias: (data.advertencias || []) as string[] }
}
// `confirmar_produccion` ("PRODUCCIÓN") es obligatorio al pasar una pasarela a producción.
export const savePaymentGateway = async (provider: GatewayProvider, payload: { mode: 'test' | 'production'; credentials: Record<string, string>; confirmar_produccion?: string }): Promise<{ gateway: PaymentGateway; sinCambios: boolean }> => {
  const data = (await api.put(`/payment-gateways/${provider}`, payload)).data
  return { gateway: data.gateway as PaymentGateway, sinCambios: Boolean(data.sin_cambios) }
}
export const testPaymentGateway = async (provider: GatewayProvider) => (await api.post(`/payment-gateways/${provider}/test`)).data.gateway as PaymentGateway
export const setDefaultPaymentGateway = async (provider: GatewayProvider) => (await api.post(`/payment-gateways/${provider}/default`)).data.gateway as PaymentGateway
export const clearDefaultPaymentGateway = async (provider: GatewayProvider) => (await api.delete(`/payment-gateways/${provider}/default`)).data.gateway as PaymentGateway

export interface WebPayment { id_pago: number; proveedor: string; monto_centimos: number; moneda: string; estado: string; creado_en: string; pedido?: { numero_pedido: string } }
// Solo lectura: pagos web recientes (no cobra, no confirma ni anula nada).
export const listWebPayments = async (): Promise<WebPayment[]> => (await api.get('/pedidos/admin/pagos')).data.pagos as WebPayment[]
