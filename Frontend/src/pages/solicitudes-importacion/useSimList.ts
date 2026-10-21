import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { solicitudImportacionService, type EstadoSolicitud, type ListParams, type ListaSolicitudes, type NivelUrgencia, type ResumenSolicitudes } from "../../services/solicitudImportacionService"
import { LIMITE, estadoHttp } from "./simCommon"

export type ListStatus = "load" | "ok" | "error" | "forbidden" | "unauth"
export interface Filtros { q: string; estado: EstadoSolicitud | ""; tipo: string; urgencia: NivelUrgencia | "" }
const VACIOS: Filtros = { q: "", estado: "", tipo: "", urgencia: "" }
const SIN_RESUMEN = { recibida: 0, en_revision: 0, cotizada: 0, aprobada: 0, en_transito: 0, entregada: 0, rechazada: 0, total: 0 } as ResumenSolicitudes

/** Bandeja paginada en servidor: busqueda con retraso de 350 ms, estado, urgencia y tipo. */
export function useSimList() {
  const [f, setF] = useState<Filtros>(VACIOS)
  const [qLive, setQLive] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListaSolicitudes | null>(null)
  const [status, setStatus] = useState<ListStatus>("load")
  const [fetching, setFetching] = useState(true)
  const [errMsg, setErrMsg] = useState("")
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setF(p => (p.q === qLive.trim() ? p : { ...p, q: qLive.trim() })); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [qLive])

  const params = useMemo<ListParams>(() => {
    const p: ListParams = {}
    if (f.q) p.q = f.q
    if (f.estado) p.estado = f.estado
    if (f.tipo) p.tipo = f.tipo
    if (f.urgencia) p.urgencia = f.urgencia
    return p
  }, [f])

  const load = useCallback(async (quiet = false) => {
    const id = ++seq.current
    if (!quiet) setStatus(s => (s === "ok" ? s : "load"))
    setFetching(true)
    try {
      const res = await solicitudImportacionService.list({ ...params, page, limit: LIMITE })
      if (id !== seq.current) return
      setData(res); setStatus("ok"); setFetching(false); setErrMsg("")
    } catch (error) {
      if (id !== seq.current) return
      const code = estadoHttp(error)
      setErrMsg((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "")
      setStatus(code === 403 ? "forbidden" : code === 401 ? "unauth" : "error"); setFetching(false)
    }
  }, [params, page])
  useEffect(() => { void load() }, [load])

  const set = (cambio: Partial<Filtros>) => { setF(p => ({ ...p, ...cambio })); setPage(1) }
  const clear = () => { setQLive(""); setF(VACIOS); setPage(1) }
  const filtrado = !!(f.q || f.estado || f.tipo || f.urgencia || qLive.trim())

  return {
    rows: data?.rows ?? [], total: data?.total ?? 0, page, setPage, limit: data?.limit ?? LIMITE,
    resumen: data?.resumen ?? SIN_RESUMEN, status, errMsg, f, qLive, setQLive, set, clear, filtrado, load, fetching,
  }
}
