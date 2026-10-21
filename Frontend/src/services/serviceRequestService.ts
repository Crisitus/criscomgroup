import api from '../lib/api'
export type ServiceRequest = { id_solicitud_servicio:number; codigo:string; cliente:string; telefono:string; email?:string; tipo_equipo:string; marca_modelo?:string; falla:string; disponibilidad?:string; estado:'pendiente'|'contactado'|'recibido'|'descartado'; id_orden_servicio?:number; notas_admin?:string; consentimiento_contacto?:boolean|number|string; creado_en:string }
export const listServiceRequests = async (): Promise<ServiceRequest[]> => (await api.get('/solicitudes-servicio')).data
export const updateServiceRequest = async (id:number, data:Partial<ServiceRequest>) => (await api.put(`/solicitudes-servicio/${id}`,data)).data
export const convertServiceRequest = async (id:number) => (await api.post(`/solicitudes-servicio/${id}/convertir`)).data
