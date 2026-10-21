import { CircleAlert, CircleCheck, Loader, TriangleAlert, X } from "lucide-react"
import type { AudBanner as B } from "./useAudExport"
import { I } from "./audParts"

/** Avisos de exportacion y de purga (estado = icono + palabra, nunca solo color). */
export function AudBanner({ b, onClose }: { b: B; onClose: () => void }) {
  const run = b.t === "run"
  const T = b.t === "run" ? ["neu", Loader, <>Exportando los logs con los filtros activos…</>]
    : b.t === "ok" ? ["ok", CircleCheck, <b>{b.n != null ? `Se exportaron ${b.n} filas con los filtros activos.` : "Se exportó el CSV con los filtros activos."}</b>]
    : b.t === "trunc" ? ["warn", TriangleAlert, <><b>Se exportaron las primeras 50 000 filas; acota los filtros.</b></>]
    : b.t === "purga" ? ["ok", CircleCheck, <><b>Se eliminaron {b.n} logs anteriores al {b.fecha} 00:00 (Lima).</b> Quedó registrada la fila “Purgar” en la primera línea de la lista.</>]
    : ["bad", CircleAlert, <b>{b.msg}</b>]
  const [tono, Icon, texto] = T as ["neu" | "ok" | "warn" | "bad", typeof Loader, React.ReactNode]
  return (
    <div className={`nt ${tono}`} role={b.t === "err" ? "alert" : "status"} aria-busy={run || undefined}>
      {I(Icon, 20, run ? "spin" : "")}
      <div className="tx">{texto}</div>
      {!run && <button type="button" className="ib" aria-label="Cerrar aviso" onClick={onClose}>{I(X, 18)}</button>}
    </div>
  )
}
