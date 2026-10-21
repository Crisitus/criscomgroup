import { useCallback, useEffect, useRef, useState } from "react"
import { fetchGrants, parseApiFail, revokeGrant, type AccessGrant } from "../../../services/accessService"
import { areaLabel, byExpiry } from "./maeCommon"

export type Notice = { tone: "ok" | "bad"; title: string; sm?: string } | null

/** Permisos de area vigentes (GET /access/grants) y revocacion definitiva (DELETE). */
export function useMaeGrants(enabled: boolean, onNotice: (n: Notice) => void) {
  const [status, setStatus] = useState<"load" | "ok" | "err" | "403">("load")
  const [rows, setRows] = useState<AccessGrant[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [revokeError, setRevokeError] = useState("")
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(async () => {
    setStatus("load")
    try {
      const data = await fetchGrants("activo")
      if (!alive.current) return
      setRows(byExpiry(Array.isArray(data) ? data : []))
      setStatus("ok")
    } catch (e) {
      if (!alive.current) return
      setStatus(parseApiFail(e, "").status === 403 ? "403" : "err")
    }
  }, [])
  useEffect(() => { if (enabled) void load() }, [enabled, load])

  /** Devuelve true si el cuadro de confirmacion debe cerrarse. */
  const revoke = async (g: AccessGrant): Promise<boolean> => {
    setBusyId(g.id_grant)
    setRevokeError("")
    const label = `${areaLabel(g.area)} de ${g.user?.name ?? `usuario ${g.user_id}`}`
    try {
      await revokeGrant(g.id_grant)
      onNotice({ tone: "ok", title: "Permiso revocado", sm: `${label} ya no está vigente. La lista se volvió a pedir.` })
      await load()
      return true
    } catch (e) {
      const f = parseApiFail(e, "No se pudo revocar el permiso")
      if (f.status === 404) {
        onNotice({ tone: "ok", title: "Ese permiso ya no existe", sm: `${label} ya no estaba vigente. Se actualizó la lista.` })
        await load()
        return true
      }
      setRevokeError(f.message)
      return false
    } finally { if (alive.current) setBusyId(null) }
  }
  return { status, rows, busyId, revokeError, setRevokeError, load, revoke }
}
