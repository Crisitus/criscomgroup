import api from "../../../lib/api"
import type { AccessReq, ReqStatus } from "./useUsrAccess"

export const revokeGrant = async (id: number) => (await api.delete(`/access/grants/${id}`)).data
export const resolveRequest = async (id: number, body: { status: "approved" | "rejected"; expires_at?: string; review_note?: string }) =>
  (await api.patch(`/access/requests/${id}`, body)).data
export const fetchRequests = async (status: ReqStatus, page: number, limit: number) => {
  const r = await api.get<AccessReq[]>("/access/requests", { params: { status, page, limit } })
  const total = Number(r.headers["x-total-count"])
  return { rows: r.data ?? [], total: Number.isFinite(total) ? total : (r.data ?? []).length }
}
