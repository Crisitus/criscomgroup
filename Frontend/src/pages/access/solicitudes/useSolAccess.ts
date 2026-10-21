import { useCallback, useEffect, useRef, useState } from "react"
import { fetchSolMy, fetchSolRequests, parseApiFail, resolveSolRequest, sendSolRequest } from "./solApi"
import type { SolMy, SolRequest } from "./solCommon"

export type BlockStatus = "load" | "ok" | "err"
export type SolOutcome = { ok: true; created?: boolean } | { ok: false; status: number; message: string; fields: Record<string, string> }

const EMPTY: SolMy = { areas: [], grants: [], requests: [] }

/** Solicitudes de acceso: mis permisos/solicitudes, pedir un área y (maestra) resolver con vigencia. */
export function useSolAccess(isMaster: boolean) {
  const [myStatus, setMyStatus] = useState<BlockStatus>("load")
  const [my, setMy] = useState<SolMy>(EMPTY)
  const [trayStatus, setTrayStatus] = useState<BlockStatus>(isMaster ? "load" : "ok")
  const [rows, setRows] = useState<SolRequest[]>([])
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const loadMy = useCallback(async () => {
    setMyStatus("load")
    try {
      const data = await fetchSolMy()
      if (!alive.current) return
      setMy({ areas: data.areas ?? [], grants: data.grants ?? [], requests: data.requests ?? [] })
      setMyStatus("ok")
    } catch { if (alive.current) setMyStatus("err") }
  }, [])

  const loadTray = useCallback(async () => {
    setTrayStatus("load")
    try {
      const data = await fetchSolRequests()
      if (!alive.current) return
      setRows(Array.isArray(data) ? data : [])
      setTrayStatus("ok")
    } catch { if (alive.current) setTrayStatus("err") }
  }, [])

  useEffect(() => { void loadMy() }, [loadMy])
  useEffect(() => { if (isMaster) void loadTray() }, [isMaster, loadTray])

  const request = async (area: string, reason: string): Promise<SolOutcome> => {
    try {
      const r = await sendSolRequest(area, reason.trim())
      await loadMy()
      return { ok: true, created: r.created }
    } catch (e) {
      const f = parseApiFail(e, "No se pudo enviar la solicitud")
      return { ok: false, status: f.status, message: f.message, fields: f.fields }
    }
  }

  /** Resolver; 409 = ya resuelta por otro puesto (el componente ofrece Recargar). */
  const resolve = async (id: number, status: "approved" | "rejected", days: number): Promise<SolOutcome> => {
    const expires = status === "approved" ? new Date(Date.now() + days * 86400000).toISOString() : null
    try {
      await resolveSolRequest(id, status, expires)
      await Promise.all([loadTray(), loadMy()])
      return { ok: true }
    } catch (e) {
      const f = parseApiFail(e, "No se pudo resolver la solicitud")
      return { ok: false, status: f.status, message: f.message, fields: f.fields }
    }
  }

  return { myStatus, my, loadMy, trayStatus, rows, loadTray, request, resolve }
}
