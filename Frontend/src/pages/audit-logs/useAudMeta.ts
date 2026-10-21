import { useCallback, useEffect, useState } from "react"
import { estadoHttp, getCatalogo, getPermisos, getStats, type AuditCatalogo, type AuditPermisos, type AuditStats } from "../../services/auditLogService"

export type MetaStatus = "load" | "ok" | "forbidden" | "unauth" | "error"

/** Permisos, catalogo de filtros y estadistica de retencion (los tres son independientes del listado). */
export function useAudMeta() {
  const [permisos, setPermisos] = useState<AuditPermisos | null>(null)
  const [cat, setCat] = useState<AuditCatalogo | null>(null)
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [status, setStatus] = useState<MetaStatus>("load")

  const loadStats = useCallback(async () => {
    try { setStats(await getStats()) } catch { setStats(null) }
  }, [])

  const load = useCallback(async () => {
    setStatus("load")
    try {
      const p = await getPermisos()
      setPermisos(p)
      if (!p.puede_ver) { setStatus("forbidden"); return }
      const [c] = await Promise.all([getCatalogo().catch(() => null), loadStats()])
      setCat(c)
      setStatus("ok")
    } catch (error) {
      const code = estadoHttp(error)
      setStatus(code === 403 ? "forbidden" : code === 401 ? "unauth" : "error")
    }
  }, [loadStats])
  useEffect(() => { void load() }, [load])

  return { permisos, cat, stats, status, reload: load, reloadStats: loadStats }
}
