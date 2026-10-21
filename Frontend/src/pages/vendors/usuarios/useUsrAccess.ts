import { useCallback, useEffect, useRef, useState } from "react"
import api from "../../../lib/api"
import { httpStatus, serverMsg } from "./usrCommon"

export interface Grant { id_grant: number; user_id: number; area: string; expires_at: string | null; active: boolean; estado: "activo" | "vencido" | "revocado"; user?: { id_user: number; name: string } }
export interface AccessReq {
  id_request: number; user_id: number; area: string; reason: string; status: "pending" | "approved" | "rejected"
  reviewed_at: string | null; expires_at: string | null; review_note: string | null; created_at: string
  requester?: { id_user: number; name: string; email: string; id_role: number }
  permiso: { id_grant: number; estado: "activo" | "vencido" | "revocado"; expires_at: string | null } | null
}
export type ReqStatus = AccessReq["status"]

/** Permisos de área y solicitudes pendientes de UNA cuenta (el servidor no tiene endpoint por usuario: se filtra en cliente). */
export function useUsrAccess(userId: number | null) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [pending, setPending] = useState<AccessReq[]>([])
  const [state, setState] = useState<"load" | "ok" | "error">("load")
  const [msg, setMsg] = useState("")
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (userId == null) return
    const id = ++seq.current
    setState("load")
    try {
      const [g, p] = await Promise.all([
        api.get<Grant[]>("/access/grants", { params: { estado: "todos" } }),
        api.get<AccessReq[]>("/access/requests", { params: { status: "pending", limit: 100 } }),
      ])
      if (id !== seq.current) return
      setGrants((g.data ?? []).filter(x => x.user_id === userId))
      setPending((p.data ?? []).filter(x => x.user_id === userId))
      setState("ok")
    } catch (e) {
      if (id !== seq.current) return
      setMsg(httpStatus(e) === 403 ? serverMsg(e) : serverMsg(e, "No se pudieron cargar los permisos de área")); setState("error")
    }
  }, [userId])
  useEffect(() => { void load() }, [load])
  return { grants, pending, state, msg, reload: load }
}
