import { useCallback, useEffect, useRef, useState } from "react"
import { LIMITE, httpStatus, serverMsg } from "./usrCommon"
import { fetchRequests } from "./usrApi"
import type { AccessReq, ReqStatus } from "./useUsrAccess"

export type ReqState = "load" | "ok" | "error" | "forbidden" | "unauth"
const CERO = { pending: 0, approved: 0, rejected: 0 }

/** Bandeja de solicitudes por estado, con el contador de cada segmento (X-Total-Count si el navegador lo expone; si no, el tamaño de la página, hasta 100). */
export function useUsrRequests() {
  const [status, setStatus] = useState<ReqStatus>("pending")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AccessReq[]>([])
  const [counts, setCounts] = useState(CERO)
  const [state, setState] = useState<ReqState>("load")
  const [msg, setMsg] = useState("")
  const seq = useRef(0)

  const load = useCallback(async (quiet = false) => {
    const id = ++seq.current
    if (!quiet) setState(s => (s === "ok" ? s : "load"))
    try {
      const [cur, p, a, r] = await Promise.all([
        fetchRequests(status, page, LIMITE), fetchRequests("pending", 1, 100), fetchRequests("approved", 1, 100), fetchRequests("rejected", 1, 100),
      ])
      if (id !== seq.current) return
      setRows(cur.rows); setCounts({ pending: p.total, approved: a.total, rejected: r.total }); setState("ok"); setMsg("")
    } catch (e) {
      if (id !== seq.current) return
      const c = httpStatus(e)
      setMsg(serverMsg(e, "No se pudieron cargar las solicitudes")); setState(c === 403 ? "forbidden" : c === 401 ? "unauth" : "error")
    }
  }, [status, page])
  useEffect(() => { void load() }, [load])

  const pick = (s: ReqStatus) => { setStatus(s); setPage(1) }
  const total = counts[status]
  return { status, pick, page, setPage, rows, counts, total, pages: Math.max(1, Math.ceil(total / LIMITE)), state, msg, load }
}
