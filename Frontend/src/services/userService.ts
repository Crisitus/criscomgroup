import api from "../lib/api"

export interface User {
  id_user: number
  name: string
  email: string
  id_role: number
  tipo_vendedor?: 'fisico' | 'virtual' | 'afiliado' | null
  comision_servicio_porcentaje?: number
  acceso_expira_en?: string | null
  affiliate_business_id?: number | null
  superusuario_temporal?: boolean
  superusuario_expira_en?: string | null
  telefono?: string | null
  activo?: boolean
  es_maestra?: boolean
  acceso_vencido?: boolean
  superusuario_vigente?: boolean
}

export interface UserFormData {
  name: string
  email: string
  password: string
  id_role: number
  // Perfil de acceso opcional: el alta es una sola petición transaccional (Vendedor, Auditor, Técnico).
  tipo_vendedor?: 'fisico' | 'virtual' | 'afiliado'
  nombre_comercial?: string
  comision_servicio_porcentaje?: number
  acceso_expira_en?: string
  telefono?: string
}

export interface UsersQuery {
  search?: string
  rol?: string
  estado?: string
  grupo?: 'personal' | 'clientes' | 'todos'
  page?: number
  limit?: number
}

export interface UsersPageResult {
  data: User[]
  total: number
  page: number
  limit: number
  pages: number
  conteos: { personal: number; clientes: number }
}

// Mensaje legible de un error de la API ({message, error, errores}); nunca vacío.
export const apiErrorMessage = (error: any, fallback = 'No se pudo completar la operación'): string => {
  const data = error?.response?.data
  const firstField = data?.errores ? Object.values(data.errores)[0] : undefined
  return (typeof firstField === 'string' && firstField) || data?.message || data?.error || data?.msg || error?.message || fallback
}

export interface VendorWithStats extends User {
  stats: {
    sales_count: number
    sales_total: number
    last_sale_at: string | null
    service_fee: number
    vendor_net: number
    products_count: number
    stock_total: number
  }
}

export const fetchVendorsWithStats = async (): Promise<VendorWithStats[]> => {
  const response = await api.get('/users/vendors/stats')
  return response.data
}

// Listado paginado, con búsqueda y filtros resueltos en el servidor.
export const fetchUsersPage = async (query: UsersQuery = {}): Promise<UsersPageResult> => {
  const response = await api.get("/users", { params: query })
  return response.data
}

// Compatibilidad (UsersPage): recorre todas las páginas y devuelve la lista completa.
export const fetchUsers = async (): Promise<User[]> => {
  const all: User[] = []
  for (let page = 1; page <= 50; page += 1) {
    const result = await fetchUsersPage({ page, limit: 100 })
    all.push(...result.data)
    if (page >= result.pages) break
  }
  return all
}

export const setUserStatus = async ({ id, activo }: { id: number; activo: boolean }): Promise<User> =>
  (await api.patch(`/users/${id}/status`, { activo })).data

export const changeUserRole = async ({ id, id_role }: { id: number; id_role: 2 | 4 }): Promise<User> => {
  const response = await api.patch(`/users/${id}/role`, { id_role })
  return response.data
}

export interface AccessProfileInput {
  id_role: 3 | 5 | 6
  tipo_vendedor?: 'fisico' | 'virtual' | 'afiliado'
  comision_servicio_porcentaje?: number
  nombre_comercial?: string
  acceso_expira_en?: string
  telefono?: string
}

export const configureAccessProfile = async ({ id, data }: { id: number; data: AccessProfileInput }): Promise<User> =>
  (await api.patch(`/users/${id}/access-profile`, data)).data

export const configureTemporarySuperuser = async ({ id, enabled, expires_at }: { id: number; enabled: boolean; expires_at?: string }): Promise<User> =>
  (await api.patch(`/users/${id}/temporary-superuser`, { enabled, expires_at })).data

export const fetchUserById = async (id: number): Promise<User> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de usuario no válido")
  }

  const response = await api.get(`/users/${id}`)
  return response.data
}

export const fetchUserBasicInfo = async (id: number): Promise<{id_user: number, name: string}> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de usuario no válido")
  }

  const response = await api.get(`/users/${id}/basic`)
  return response.data
}

export const createUser = async (userData: UserFormData): Promise<User> => {
  const response = await api.post("/users", userData)
  return response.data
}

export const updateUser = async (id: number, userData: Partial<UserFormData>): Promise<User> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de usuario no válido")
  }

  // Si la contraseña está vacía o undefined, la eliminamos para no enviarla
  const updateData = { ...userData }
  if (updateData.password === "" || updateData.password === undefined) {
    delete updateData.password
  }

  const response = await api.put(`/users/${id}`, updateData)
  return response.data
}

export const updateUserWithPayload = async ({ id, data }: { id: number; data: Partial<UserFormData> }): Promise<User> => {
  return updateUser(id, data)
}

export const deleteUser = async (id: number): Promise<void> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de usuario no válido")
  }

  await api.delete(`/users/${id}`)
}
