import { useCallback, useEffect, useRef, useState } from "react"
import { estadoHttp, getLogDetail, type AuditDetail } from "../../services/auditLogService"

export type DetailStatus = "idle" | "load" | "ok" | "error" | "notfound"

/** Detalle de un log (diff campo a campo). Ignora respuestas viejas si se cambia de fila. */
export function useAudDetail(id: number | null) {
  const [det, setDet] = useState<AuditDetail | null>(null)
  const [status, setStatus] = useState<DetailStatus>("idle")
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (id == null) { setDet(null); setStatus("idle"); return }
    const n = ++seq.current
    setStatus("load"); setDet(null)
    try {
      const d = await getLogDetail(id)
      if (n !== seq.current) return
      setDet(d); setStatus("ok")
    } catch (error) {
      if (n !== seq.current) return
      setStatus(estadoHttp(error) === 404 ? "notfound" : "error")
    }
  }, [id])
  useEffect(() => { void load() }, [load])

  return { det, status, retry: () => void load() }
}
