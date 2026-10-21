import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { exportReclamacionesCsv, getReclamaciones, mensajeError, type EstadoReclamacion, type ReclamacionesPage, type ReclamacionesParams, type TipoReclamacion } from "../../services/libroReclamacionesService"
import { LIMITE, estadoHttp } from "./libroCommon"

export type ListStatus = "load" | "ok" | "error" | "forbidden" | "unauth"
export interface Filtros { q: string; estado: EstadoReclamacion | ""; tipo: TipoReclamacion | ""; vencido: boolean }
const VACIOS: Filtros = { q: "", estado: "", tipo: "", vencido: false }
const SIN_RESUMEN = { total: 0, por_estado: { pendiente: 0, en_proceso: 0, respondido: 0, archivado: 0 }, vencidos: 0, por_vencer: 0 }

/** Listado paginado en servidor: busqueda (con retraso), estado, tipo y vencidas. */
export function useLibroList() {
  const [f, setF] = useState<Filtros>(VACIOS)
  const [qLive, setQLive] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReclamacionesPage | null>(null)
  const [status, setStatus] = useState<ListStatus>("load")
  const [exporting, setExporting] = useState(false)
  const [fetching, setFetching] = useState(true)
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setF(p => (p.q === qLive.trim() ? p : { ...p, q: qLive.trim() })); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [qLive])

  const params = useMemo<ReclamacionesParams>(() => ({ q: f.q, estado: f.estado, tipo: f.tipo, vencido: f.vencido }), [f])

  const load = useCallback(async (quiet = false) => {
    const id = ++seq.current
    if (!quiet) setStatus(s => (s === "ok" ? s : "load"))
    setFetching(true)
    try {
      const res = await getReclamaciones({ ...params, page, limit: LIMITE })
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
  const filtrado = !!(f.q || f.estado || f.tipo || f.vencido || qLive.trim())

  const exportCsv = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const blob = await exportReclamacionesCsv(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `libro-reclamaciones-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success("CSV exportado con los filtros activos")
    } catch (error) { toast.error(mensajeError(error, "No se pudo exportar el CSV")) }
    finally { setExporting(false) }
  }

  const rows = data?.rows ?? []
  return {
    rows, total: data?.total ?? 0, page, setPage, limit: data?.limit ?? LIMITE, resumen: data?.resumen ?? SIN_RESUMEN,
    status, f, qLive, setQLive, set, clear, filtrado, load, exportCsv, exporting, fetching,
  }
}
