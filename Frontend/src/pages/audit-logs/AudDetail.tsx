import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ChevronDown, Check, FileText, Info, RefreshCw, ShieldCheck, X } from "lucide-react"
import type { AuditCatalogo, AuditDetail as Det, AuditLogRow } from "../../services/auditLogService"
import { DASH, MOTIVO, PANTALLA, autor, cuando, hist, lAcc, lMod, limpiarJson, navegador, norm, reg, rolLabel } from "./audCommon"
import { ActChip, I } from "./audParts"
import { AudDiff } from "./AudDiff"
import type { DetailStatus } from "./useAudDetail"

const Kv = ({ k, children }: { k: string; children: ReactNode }) => <div className="kv"><dt>{k}</dt><dd>{children}</dd></div>
const Mot = () => <>{DASH} <span className="sub">{MOTIVO}</span></>
const Note = ({ children }: { children: ReactNode }) => <div className="note">{I(Info, 16)}<span>{children}</span></div>

export function AudDetailEmpty() {
  return <aside className="dp" role="region" aria-label="Detalle del log"><div className="empty-dp">{I(FileText, 24)}<b>Selecciona un log</b><span className="sub">Verás quién, cuándo, desde dónde y el diff antes → después.</span></div></aside>
}

function Cambios({ r, det, status, onRetry }: { r: AuditLogRow; det: Det | null; status: DetailStatus; onRetry: () => void }) {
  if (!r.tiene_detalle) return <Note>Este log no tiene detalle de campos registrado.</Note>
  if (status === "load" || status === "idle") return <div role="status" aria-busy="true"><span className="sr">Cargando el detalle…</span><span className="skb" style={{ width: "70%" }} /><span className="skb" style={{ width: "50%", marginTop: 8 }} /></div>
  if (status === "notfound") return <Note>Este log ya no existe; pudo ser eliminado por una purga. Actualiza la lista.</Note>
  if (status === "error" || !det) {
    return <div role="alert"><Note>No se pudo cargar el detalle de este log.</Note><button type="button" className="btn out sm" style={{ marginTop: 8 }} onClick={onRetry}>{I(RefreshCw, 16)}Reintentar</button></div>
  }
  const prev = det.datos_anteriores ? Object.keys(det.datos_anteriores).length : 0
  if (!det.cambios.length) return <Note>{prev > 0 ? `Sin cambios de campos registrados; hay JSON anterior (${prev} campos).` : "Sin cambios de campos registrados."}</Note>
  return (
    <>
      <p className="sub" style={{ marginBottom: 8 }}>{prev > 0 ? `Se compararon ${prev} campos; solo se muestran los que cambian.` : "Registro nuevo: se muestran los campos recibidos."}</p>
      <AudDiff cambios={det.cambios} />
    </>
  )
}

/** Panel de detalle: quien, cuando, desde donde, que y el diff campo a campo. */
export function AudDetail({ r, det, status, cat, mob, onClose, onRetry }: {
  r: AuditLogRow; det: Det | null; status: DetailStatus; cat: AuditCatalogo | null; mob?: boolean; onClose?: () => void; onRetry: () => void
}) {
  const w = cuando(r.fecha_hora), u = autor(r, cat), pan = PANTALLA[r.tabla]
  const ruta = typeof det?.datos_nuevos?._ruta === "string" ? (det.datos_nuevos._ruta as string) : null
  const pii = r.tabla === "libro_reclamaciones" || r.tabla === "solicitudes_postventa"
  const json = det ? JSON.stringify({ datos_anteriores: limpiarJson(det.datos_anteriores), datos_nuevos: limpiarJson(det.datos_nuevos) }, null, 2) : ""
  const n = det?.cambios.length ?? 0
  return (
    <aside className="dp" role={mob ? "document" : "region"} aria-label={`Detalle del log ${r.id_log}`}>
      {!mob && (
        <div className="dph">
          <div><h2>Log #{r.id_log}</h2><span className="sub">{w.d} · {w.ts}</span></div>
          <button type="button" className="ib" aria-label="Cerrar detalle" onClick={onClose}>{I(X, 20)}</button>
        </div>
      )}
      <div className="dpc"><ActChip a={r.accion} /><span className="tag">{lMod(r.tabla)}</span></div>
      <div className="ds"><h3>Quién y cuándo</h3>
        <Kv k="Autor"><b>{u.name}</b><span className="sub">{u.email}</span></Kv>
        <Kv k="Rol">{r.usuario_rol != null ? rolLabel(r.usuario_rol) : <Mot />}</Kv>
        <Kv k="Fecha y hora">{w.d} {w.ts}<span className="sub">Hora de Lima</span></Kv>
      </div>
      <div className="ds"><h3>Cambios{n ? ` (${n})` : ""}</h3>
        <Cambios r={r} det={det} status={status} onRetry={onRetry} />
        {pii && <div className="note" style={{ marginTop: 8 }}>{I(ShieldCheck, 16)}<span><b>Dato enmascarado en origen.</b> Nombre, correo y teléfono ya vienen enmascarados del backend; esta pantalla no los descubre.</span></div>}
      </div>
      <div className="ds"><h3>Desde dónde</h3>
        <Kv k="IP"><span className="num">{norm(r.ip_cliente)}</span></Kv>
        <Kv k="Navegador">{navegador(det?.user_agent ?? r.user_agent)}</Kv>
      </div>
      <div className="ds"><h3>Qué</h3>
        <Kv k="Acción">{lAcc(r.accion)}<span className="sub">Valor técnico: {r.accion}</span></Kv>
        <Kv k="Módulo">{lMod(r.tabla)}<span className="sub">Valor técnico: {r.tabla}</span></Kv>
        <Kv k="Registro">{r.registro_id == null && !r.registro_ref ? DASH : <>{reg(r)}{pan && r.registro_id != null && <Link to={pan[1]}>Abrir en {pan[0]}{I(ArrowRight, 14)}</Link>}</>}</Kv>
        <Kv k="Ruta">{ruta ? <code>{ruta}</code> : DASH}</Kv>
        <Kv k="Estado HTTP">{hist(r) ? <Mot /> : <span className="st ok">{I(Check, 12)}{r.estado_http}</span>}</Kv>
      </div>
      {json && <div className="ds"><details className="js"><summary>Ver JSON completo{I(ChevronDown, 16, "chev")}</summary><pre>{json}</pre></details></div>}
    </aside>
  )
}
