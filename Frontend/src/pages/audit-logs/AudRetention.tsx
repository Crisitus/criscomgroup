import { CircleCheck, Lock, Trash2, TriangleAlert } from "lucide-react"
import type { AuditPermisos, AuditStats } from "../../services/auditLogService"
import { ddmm } from "./audCommon"
import { I } from "./audParts"

/** Franja de retencion (informativa) + acceso a "Purgar historial..." (deshabilitado con motivo si no se puede). */
export function AudRetention({ stats, permisos, motivo, onPurge }: { stats: AuditStats | null; permisos: AuditPermisos | null; motivo: string; onPurge: () => void }) {
  const meses = stats?.retencion_meses ?? permisos?.retencion_meses ?? 24
  const n = stats?.logsFueraDeRetencion ?? 0
  const corte = stats?.fecha_corte ? ddmm(stats.fecha_corte) : ""
  const puede = !!permisos?.puede_purgar
  const l = !stats ? (
    <span>Retención {meses} meses · el conteo de logs fuera de plazo no está disponible ahora.</span>
  ) : n > 0 ? (
    <>
      <span className="st warn">{I(TriangleAlert, 14)}{n} logs fuera de plazo</span>
      <span>Se conservan {meses} meses (desde {corte}). {n} logs superan la retención. Solo informativo: no hay purga automática.</span>
    </>
  ) : (
    <>
      <span className="st ok">{I(CircleCheck, 14)}Al día</span>
      <span>Retención {meses} meses · corte {corte} · 0 logs fuera de plazo</span>
    </>
  )
  return (
    <div className="ret">
      <div className="l">{l}</div>
      {puede
        ? <button type="button" className="btn out sm" onClick={onPurge}>{I(Trash2, 16)}Purgar historial…</button>
        : <button type="button" className="btn out sm" aria-disabled="true" aria-describedby="aud-why" onClick={e => e.preventDefault()}>{I(Lock, 16)}Purgar historial…</button>}
      {!puede && <p className="why" id="aud-why">{I(Lock, 14)}<span><b>Solo la cuenta maestra puede purgar el historial.</b> {motivo}</span></p>}
    </div>
  )
}
