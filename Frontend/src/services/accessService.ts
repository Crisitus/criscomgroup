import api from '../lib/api'

export interface MasterAccount { id_user: number; name: string; email: string; id_role: number; es_maestra: boolean }
export interface MasterAccountPatch { name: string; current_password: string; new_password?: string }
export interface MasterAccountSaved extends MasterAccount { sesiones_cerradas: boolean }

export interface AccessGrant {
  id_grant: number
  user_id: number
  area: string
  expires_at: string | null
  estado: 'activo' | 'vencido' | 'revocado'
  user: { id_user: number; name: string; email: string; id_role: number } | null
}

/** Errores 422: { message, errores: { campo: mensaje } }. */
export interface ApiFail { status: number; message: string; fields: Record<string, string> }

export const parseApiFail = (error: unknown, fallback: string): ApiFail => {
  const res = (error as { response?: { status?: number; data?: Record<string, unknown> } } | undefined)?.response
  const data = res?.data as { errores?: unknown; message?: string; error?: string; msg?: string } | undefined
  const fields = data?.errores && typeof data.errores === 'object' ? (data.errores as Record<string, string>) : {}
  return { status: res?.status ?? 0, message: data?.message || data?.error || data?.msg || fallback, fields }
}

export const fetchMasterAccount = async (): Promise<MasterAccount> => (await api.get('/users/master-account')).data
export const patchMasterAccount = async (body: MasterAccountPatch): Promise<MasterAccountSaved> => (await api.patch('/users/master-account', body)).data

export const fetchGrants = async (estado = 'activo'): Promise<AccessGrant[]> => (await api.get('/access/grants', { params: { estado } })).data
export const revokeGrant = async (id: number): Promise<void> => { await api.delete(`/access/grants/${id}`) }

export interface MyAccess {
  areas: string[]
  grants: { id_grant: number; area: string; expires_at: string | null }[]
  requests: { id_request: number; area: string; status: string }[]
}
export interface AccessRequest { id_request: number; area: string; reason: string; status: string; requester?: { name: string; email: string } }

export const fetchMyAccess = async (): Promise<MyAccess> => (await api.get('/access/my')).data
export const fetchAccessRequests = async (): Promise<AccessRequest[]> => (await api.get('/access/requests')).data
export const sendAccessRequest = async (area: string, reason: string) => (await api.post('/access/request', { area, reason })).data
export const resolveAccessRequest = async (id: number, status: 'approved' | 'rejected', expires_at: string | null) =>
  (await api.patch(`/access/requests/${id}`, { status, expires_at })).data
