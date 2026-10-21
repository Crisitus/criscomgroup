import api from "../lib/api"

export interface AuditFilters {
  usuario_id?: string
  tabla?: string
  accion?: string
  desde?: string
  hasta?: string
  q?: string
  page?: number
  limit?: number
}

export interface AuditLogRow {
  id_log: number
  usuario_id: number | null
  usuario: { name: string; email: string } | null
  usuario_nombre?: string | null
  usuario_email?: string | null
  usuario_rol: number | null
  accion: string
  tabla: string
  registro_id: number | null
  registro_ref: string | null
  estado_http: number | null
  ip_cliente: string | null
  user_agent: string | null
  fecha_hora: string
  tiene_detalle: boolean
}

export interface AuditPage {
  rows: AuditLogRow[]
  total: number
  page: number
  limit: number
}

export interface AuditDetail extends AuditLogRow {
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  cambios: AuditChange[]
}

export interface AuditStats {
  totalLogs: number
  retencion_meses: number
  fecha_corte: string
  logsFueraDeRetencion: number
  oldestLog: string | null
}

export interface AuditChange {
  campo: string
  antes: unknown
  despues: unknown
  sensible: boolean
}

export interface AuditPermisos {
  puede_ver: boolean
  puede_exportar: boolean
  puede_purgar: boolean
  retencion_meses: number
  confirmacion_purga: { fecha: string; total: string } | null
}

export interface AuditCatalogo {
  tablas: string[]
  acciones: string[]
  usuarios: { id: number; name: string; email: string | null }[]
}

// Solo envia los filtros con valor.
const clean = (filters: AuditFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ""))

export const getLogs = async (filters: AuditFilters): Promise<AuditPage> => {
  const response = await api.get("/audit-logs", { params: clean(filters) })
  return response.data
}

export const getLogDetail = async (id: number): Promise<AuditDetail> => (await api.get(`/audit-logs/${id}`)).data

export const getStats = async (): Promise<AuditStats> => (await api.get("/audit-logs/stats")).data

export const getCatalogo = async (): Promise<AuditCatalogo> => (await api.get("/audit-logs/catalogo")).data

export const getPermisos = async (): Promise<AuditPermisos> => (await api.get("/audit-logs/permisos")).data

// Descarga el CSV con los mismos filtros del listado (requiere el token, por eso va por axios).
export interface CsvResult { blob: Blob; total: number | null; truncated: boolean }

export const EXPORT_CAP = 50000

// Cuenta registros del CSV (comillas dobles respetadas); sirve cuando CORS no expone X-Total-Count.
const contarFilas = async (blob: Blob) => {
  const text = await blob.text()
  let filas = 0
  let dentro = false
  let vacia = true
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { dentro = !dentro; vacia = false }
    else if (c === "\n" && !dentro) { filas++; vacia = true }
    else if (c !== "\r") vacia = false
  }
  if (!vacia) filas++
  return Math.max(0, filas - 1)
}

export const exportLogsCsv = async (filters: AuditFilters): Promise<CsvResult> => {
  const rest: Partial<AuditFilters> = { ...filters }
  delete rest.page
  delete rest.limit
  const response = await api.get("/audit-logs/export.csv", { params: clean(rest), responseType: "blob" })
  const header = response.headers?.["x-total-count"]
  const flag = response.headers?.["x-truncated"]
  const total = header != null && header !== "" ? Number(header) : await contarFilas(response.data)
  const truncated = flag != null ? String(flag).toLowerCase() === "true" : total >= EXPORT_CAP
  return { blob: response.data, total: truncated && header == null ? EXPORT_CAP : total, truncated }
}

export type PurgeBody = { ids?: number[]; beforeDate?: string; deleteAll?: boolean; confirmacion?: string; dryRun?: boolean }
export interface PurgeResult { message?: string; deletedCount?: number; auditoria_id?: number; dryRun?: boolean; count?: number }

// Cuenta (dryRun) o purga. La purga real exige confirmacion textual; el conteo no.
export const purgeLogs = async (body: PurgeBody): Promise<PurgeResult> => (await api.delete("/audit-logs", { data: body })).data

export const mensajeError = (error: unknown, porDefecto: string): string => {
  const data = (error as { response?: { data?: { message?: string; errores?: Record<string, string> } } })?.response?.data
  const campos = data?.errores ? Object.values(data.errores).join(" ") : ""
  return [data?.message, campos].filter(Boolean).join(" ") || porDefecto
}

export const estadoHttp = (error: unknown): number | undefined => (error as { response?: { status?: number } })?.response?.status
