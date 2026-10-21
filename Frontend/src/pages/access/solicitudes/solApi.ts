import api from "../../../lib/api"
import { parseApiFail, type ApiFail } from "../../../services/accessService"
import type { SolMy, SolRequest } from "./solCommon"

export { parseApiFail }
export type { ApiFail }

export const fetchSolMy = async (): Promise<SolMy> => (await api.get("/access/my")).data

/** 201 = solicitud nueva; 200 = ya había una pendiente de esa área y se actualizó el motivo. */
export const sendSolRequest = async (area: string, reason: string): Promise<{ created: boolean }> => {
  const res = await api.post("/access/request", { area, reason })
  return { created: res.status === 201 }
}

export const fetchSolRequests = async (status?: string): Promise<SolRequest[]> =>
  (await api.get("/access/requests", { params: { limit: 200, ...(status ? { status } : {}) } })).data

/** Aprobar exige expires_at futura y de máximo 30 días (el servidor valida); rechazar una aprobada revoca el permiso. */
export const resolveSolRequest = async (id: number, status: "approved" | "rejected", expiresAt: string | null): Promise<void> => {
  await api.patch(`/access/requests/${id}`, { status, expires_at: expiresAt })
}
