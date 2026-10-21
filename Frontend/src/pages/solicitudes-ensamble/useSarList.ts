import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { solicitudEnsambleService, type EstadoEnsamble, type ListEnsambleParams, type ListaEnsambles, type ModoEnsamble } from "../../services/solicitudEnsambleService"
import { LIMITE, estadoHttp } from "./sarCommon"

export type ListStatus = "load" | "ok" | "error" | "forbidden" | "unauth"
export interface Filtros { q: string; estado: EstadoEnsamble | ""; modo: ModoEnsamble | "" }
const VACIOS: Filtros = { q: "", estado: "", modo: "" }
const SIN_RESUMEN = { recibida: 0, en_revision: 0, cotizada: 0, aprobada: 0, en_ensamble: 0, entregada: 0, rechazada: 0, total: 0 }

/** Bandeja paginada en servidor: busqueda (con retraso), estado y modo; contadores del resumen. */
export function useSarList() {
  const [f, setF] = useState<Filtros>(VACIOS)
  const [qLive, setQLive] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListaEnsambles | null>(null)
  const [status, setStatus] = useState<ListStatus>("load")
  const [fetching, setFetching] = useState(true)
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setF(p => (p.q === qLive.trim() ? p : { ...p, q: qLive.trim() })); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [qLive])

  const params = useMemo<ListEnsambleParams>(() => ({
    q: f.q || undefined, estado: f.estado || undefined, modo: f.modo || undefined,
  }), [f])

  const load = useCallback(async (quiet = false) => {
    const id = ++seq.current
    if (!quiet) setStatus(s => (s === "ok" ? s : "load"))
    setFetching(true)
    try {
      const res = await solicitudEnsambleService.list({ ...params, page, limit: LIMITE })
      if (id !== seq.current) return
      setData(res); setStatus("ok"); setFetching(false)
    } catch (error) {
      if (id !== seq.current) return
      const code = estadoHttp(error)
      setStatus(code === 403 ? "forbidden" : code === 401 ? "unauth" : "error"); setFetching(false)
    }
  }, [params, page])
  useEffect(() => { void load() }, [load])

  const set = (cambio: Partial<Filtros>) => { setF(p => ({ ...p, ...cambio })); setPage(1) }
  const clear = () => { setQLive(""); setF(VACIOS); setPage(1) }
  const filtrado = !!(f.q || f.estado || f.modo || qLive.trim())

  return {
    rows: data?.rows ?? [], total: data?.total ?? 0, page, setPage, limit: data?.limit ?? LIMITE,
    resumen: data?.resumen ?? SIN_RESUMEN, status, f, qLive, setQLive, set, clear, filtrado, load, fetching,
  }
}
