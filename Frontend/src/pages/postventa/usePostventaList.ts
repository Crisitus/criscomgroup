import { useCallback, useEffect, useRef, useState } from "react"
import { getPostventa, mensajeError, type ListaPostventa } from "../../services/postventaService"
import { LIMIT } from "./pvCommon"

export type FiltroEstado = "todas" | "recibida" | "en_revision" | "esperando_cliente" | "aprobada" | "rechazada" | "resuelta"
export type FiltroTipo = "todos" | "cambio" | "devolucion" | "garantia"
export type FiltroVinculo = "todas" | "vinculadas" | "sin"

/** Bandeja con busqueda, filtros y paginacion en servidor (limit 20). */
export function usePostventaList() {
  const [q, setQ] = useState("")
  const [qs, setQs] = useState("")
  const [fe, setFe] = useState<FiltroEstado>("todas")
  const [ft, setFt] = useState<FiltroTipo>("todos")
  const [fv, setFv] = useState<FiltroVinculo>("todas")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListaPostventa | null>(null)
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [error, setError] = useState("")
  const seq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => setQs(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])
  useEffect(() => { setPage(1) }, [qs, fe, ft, fv])

  const load = useCallback(async (quiet = false) => {
    const mine = ++seq.current
    if (!quiet) setStatus("load")
    try {
      const res = await getPostventa({
        page, limit: LIMIT,
        ...(qs ? { q: qs } : {}),
        ...(fe !== "todas" ? { estado: fe } : {}),
        ...(ft !== "todos" ? { tipo: ft } : {}),
        ...(fv !== "todas" ? { vinculado: fv === "vinculadas" } : {}),
      })
      if (mine !== seq.current) return
      if (res.rows.length === 0 && page > 1 && res.total > 0) { setPage(Math.max(1, Math.ceil(res.total / LIMIT))); return }
      setData(res); setError(""); setStatus("ok")
    } catch (e) {
      if (mine !== seq.current) return
      setError(mensajeError(e, "El servidor no respondió.")); setStatus("error")
    }
  }, [page, qs, fe, ft, fv])
  useEffect(() => { void load() }, [load])

  const filtered = qs !== "" || fe !== "todas" || ft !== "todos" || fv !== "todas"
  const clear = () => { setQ(""); setQs(""); setFe("todas"); setFt("todos"); setFv("todas") }
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / LIMIT))
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to = Math.min(total, (page - 1) * LIMIT + (data?.rows.length ?? 0))

  return {
    q, setQ, qs, fe, setFe, ft, setFt, fv, setFv, page, setPage, pages, from, to, total,
    rows: data?.rows ?? [], resumen: data?.resumen ?? null, status, error, filtered, clear, load,
  }
}

export type PostventaList = ReturnType<typeof usePostventaList>
