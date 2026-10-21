import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchUsersPage, type User, type UsersPageResult } from "../../../services/userService"
import { LIMITE, httpStatus, serverMsg } from "./usrCommon"

export type ListStatus = "load" | "ok" | "error" | "forbidden" | "unauth"
export type Grupo = "personal" | "clientes"
export interface Filtros { q: string; rol: string; estado: string }
const VACIOS: Filtros = { q: "", rol: "", estado: "" }

/** Bandeja de cuentas: paginación, búsqueda y filtros en el servidor. */
export function useUsrList(grupo: Grupo) {
  const [f, setF] = useState<Filtros>(VACIOS)
  const [qLive, setQLive] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersPageResult | null>(null)
  const [status, setStatus] = useState<ListStatus>("load")
  const [msg, setMsg] = useState("")
  const [fetching, setFetching] = useState(true)
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setF(p => (p.q === qLive.trim() ? p : { ...p, q: qLive.trim() })); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [qLive])
  useEffect(() => { setF(VACIOS); setQLive(""); setPage(1) }, [grupo])

  const params = useMemo(() => ({ search: f.q || undefined, rol: f.rol || undefined, estado: f.estado || undefined, grupo }), [f, grupo])

  const load = useCallback(async (quiet = false) => {
    const id = ++seq.current
    if (!quiet) setStatus(s => (s === "ok" ? s : "load"))
    setFetching(true)
    try {
      const res = await fetchUsersPage({ ...params, page, limit: LIMITE })
      if (id !== seq.current) return
      setData(res); setStatus("ok"); setMsg(""); setFetching(false)
    } catch (e) {
      if (id !== seq.current) return
      const code = httpStatus(e)
      setMsg(serverMsg(e, "No se pudo cargar la lista de cuentas")); setFetching(false)
      setStatus(code === 403 ? "forbidden" : code === 401 ? "unauth" : "error")
    }
  }, [params, page])
  useEffect(() => { void load() }, [load])

  const set = (c: Partial<Filtros>) => { setF(p => ({ ...p, ...c })); setPage(1) }
  const clear = () => { setQLive(""); setF(VACIOS); setPage(1) }
  const filtrado = !!(f.q || f.rol || f.estado || qLive.trim())
  const rows: User[] = data?.data ?? []
  return { rows, total: data?.total ?? 0, pages: data?.pages ?? 1, page, setPage, conteos: data?.conteos ?? { personal: 0, clientes: 0 }, status, msg, f, qLive, setQLive, set, clear, filtrado, load, fetching }
}
