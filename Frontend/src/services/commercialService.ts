import api from '../lib/api'
export const commercialApi = {
  dashboard: async () => (await api.get('/commercial/inventory/dashboard')).data,
  movements: async (params?: { producto_id?: number; limit?: number }) => (await api.get('/commercial/inventory/movements', { params })).data,
  adjust: async (id:number, data:any) => (await api.post(`/commercial/inventory/${id}/adjust`, data)).data,
  locations: async () => (await api.get('/commercial/inventory/locations')).data,
  createLocation: async (data:any) => (await api.post('/commercial/inventory/locations', data)).data,
  setQuant: async (id:number, data:any) => (await api.put(`/commercial/inventory/${id}/quant`, data)).data,
  suppliers: async () => (await api.get('/commercial/suppliers')).data,
  createSupplier: async (data:any) => (await api.post('/commercial/suppliers', data)).data,
  updateSupplier: async (id:number, data:any) => (await api.put(`/commercial/suppliers/${id}`, data)).data,
  purchases: async () => (await api.get('/commercial/purchases')).data,
  createPurchase: async (data:any) => (await api.post('/commercial/purchases', data)).data,
  voidPurchase: async (id:number, motivo:string) => (await api.post(`/commercial/purchases/${id}/void`, { motivo })).data,
  quotes: async () => (await api.get('/commercial/quotes')).data,
  createQuote: async (data:any) => (await api.post('/commercial/quotes', data)).data,
  quoteStatus: async (id:number, estado:string) => (await api.patch(`/commercial/quotes/${id}/status`, { estado })).data,
  convertQuote: async (id:number, metodo_pago='efectivo') => (await api.post(`/commercial/quotes/${id}/convert`, { metodo_pago })).data,
}
