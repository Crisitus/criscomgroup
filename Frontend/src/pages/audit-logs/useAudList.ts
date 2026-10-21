import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { estadoHttp, getLogs, mensajeError, type AuditLogRow, type AuditPage } from "../../services/auditLogService"
import { VACIOS, aParams, hayFiltros, type Filtros } from "./audCommon"

export type ListStatus = "load" | "ok" | "error" | "forbidden" | "unauth"

/** Listado paginado en servidor: filtros combinables, busqueda con retraso, pagina y limite. */
export function useAudList(enabled: boolean) {
  const [f, setF] = useState<Filtros>(VACIOS)
  const [qLive, setQLive] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [data, setData] = useState<AuditPage | null>(null)
  const [status, setStatus] = useState<ListStatus>("load")
  const [errMsg, setErrMsg] = useState("")
  const [fetching, setFetching] = useState(true)
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setF(p => (p.q === qLive.trim() ? p : { ...p, q: qLive.trim() })); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [qLive])

  const params = useMemo(() => aParams(f), [f])

  const load = useCallback(async (quiet = false) => {
    if (!enabled) return
    const id = ++seq.current
    if (!quiet) setStatus(s => (s === "ok" ? s : "load"))
    setFetching(true)
    try {
      const res = await getLogs({ ...params, page, limit })
      if (id !== seq.current) return
      setData(res); setStatus("ok"); setErrMsg(""); setFetching(false)
    } catch (error) {
      if (id !== seq.current) return
      const code = estadoHttp(error)
      setErrMsg(code === 500 || !code ? "" : mensajeError(error, ""))
      setStatus(code === 403 ? "forbidden" : code === 401 ? "unauth" : "error"); setFetching(false)
    }
  }, [enabled, params, page, limit])
  useEffect(() => { void load() }, [load])

  const set = (c: Partial<Filtros>) => { setF(p => ({ ...p, ...c })); setPage(1) }
  const clear = () => { setQLive(""); setF(VACIOS); setPage(1) }
  const setQ = (v: string) => setQLive(v)
  const pageLimit = (n: number) => { setLimit(n); setPage(1) }
  const first = () => { setPage(1); void load(true) }

  const rows: AuditLogRow[] = data?.rows ?? []
  return {
    rows, total: data?.total ?? 0, page, setPage, limit, setLimit: pageLimit, status, errMsg, fetching, f, qLive, setQ, set, clear, load, first, params,
    filtrado: hayFiltros(f) || !!qLive.trim(),
  }
}
