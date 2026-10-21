import { useState } from "react"
import { exportLogsCsv, mensajeError, type AuditFilters } from "../../services/auditLogService"

export type AudBanner =
  | { t: "run" }
  | { t: "ok"; n: number | null }
  | { t: "trunc" }
  | { t: "purga"; n: number; fecha: string }
  | { t: "err"; msg: string }

/** Exporta el CSV con los mismos filtros del listado; avisa del truncado (X-Truncated). */
export function useAudExport(params: AuditFilters, setBanner: (b: AudBanner | null) => void) {
  const [exporting, setExporting] = useState(false)
  const run = async () => {
    if (exporting) return
    setExporting(true); setBanner({ t: "run" })
    try {
      const { blob, total, truncated } = await exportLogsCsv(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      setBanner(truncated ? { t: "trunc" } : { t: "ok", n: total })
    } catch (error) {
      setBanner({ t: "err", msg: mensajeError(error, "No se pudo exportar el CSV.") })
    } finally { setExporting(false) }
  }
  return { exporting, run }
}
