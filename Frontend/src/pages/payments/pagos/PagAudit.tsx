import { ChevronDown, ChevronRight, CircleCheck, CircleX, Lock } from "lucide-react"
import type { AuditChange, AuditLogRow } from "../../../services/auditLogService"
import type { Detail, PagAuditCtl } from "./usePagAudit"
import { I } from "./pagCommon"
import { DASH, fdate } from "./pagData"
import { EmptyBlk, ErrCard, SkCard } from "./PagStates"

const ACC: Record<string, string> = { actualizar: "Actualizar", probar: "Probar", activar: "Activar", desactivar: "Desactivar", crear: "Crear" }
const REDACT = "[REDACTADO]"

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return DASH
  if (v === REDACT) return "••• no se guarda"
  if (typeof v === "boolean") return v ? "sí" : "no"
  const t = typeof v === "object" ? JSON.stringify(v) : String(v)
  return t.length > 160 ? `${t.slice(0, 160)}…` : t
}
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v)
/** Un nivel de anidación se muestra como campo.subcampo (p. ej. credentials.public_key). */
const flatten = (rows: AuditChange[]): AuditChange[] => rows.flatMap(c => {
  if (!isObj(c.despues)) return [c]
  const before = isObj(c.antes) ? c.antes : {}
  return Object.entries(c.despues).map(([k, v]) => ({ campo: `${c.campo}.${k}`, antes: before[k] ?? null, despues: v, sensible: v === REDACT }))
})

function DetailPanel({ id, d }: { id: number; d?: Detail }) {
  if (!d || d.status === "load") return <div className="pa-det" aria-busy="true"><span className="pa-sk" style={{ width: "40%" }} /></div>
  if (d.status === "error") return <div className="pa-det" role="alert"><p className="pa-why pa-bad">{I(CircleX)}{d.message}</p></div>
  const rows = flatten(d.cambios)
  return (
    <div className="pa-det">
      <div className="pa-t">Campos cambiados · registro n.º {id}</div>
      {rows.length === 0 ? <p className="pa-nt" style={{ marginTop: 0 }}>Este registro no cambió campos (por ejemplo, una prueba de conexión).</p> : (
        <div className="pa-dg">
          <div className="pa-h">Campo</div><div className="pa-h">Antes</div><div className="pa-h">Después</div>
          {rows.map(r => <FieldRow key={r.campo} r={r} />)}
        </div>
      )}
      <p className="pa-nt">Los valores de las llaves nunca se guardan en la auditoría.</p>
    </div>
  )
}
const FieldRow = ({ r }: { r: AuditChange }) => <><div className="pa-mono">{r.campo}</div><div className={r.antes == null ? "pa-mut" : ""}>{show(r.antes)}</div><div>{show(r.despues)}</div></>

function Line({ row, c, mob }: { row: AuditLogRow; c: PagAuditCtl; mob: boolean }) {
  const ex = c.open === row.id_log
  const ok = (row.estado_http ?? 200) < 400
  const http = <span className={`pa-st pa-${ok ? "ok" : "bad"}`}>{I(ok ? CircleCheck : CircleX, 14)}{row.estado_http ?? DASH}</span>
  const who = row.usuario?.name || row.usuario?.email || "Sistema"
  const bt = row.tiene_detalle
    ? <button type="button" className="pa-lnk" aria-expanded={ex} onClick={() => void c.toggle(row.id_log)}>{I(ex ? ChevronDown : ChevronRight, 14)}{ex ? "Ocultar" : "Ver detalle"}</button>
    : <span className="pa-mut">Sin detalle</span>
  const tag = <span className="pa-tag">{ACC[row.accion] ?? row.accion}</span>
  return <>
    {mob
      ? <div className="pa-ar"><div>{tag} {http}</div>{bt}<div className="pa-mut pa-num" style={{ gridColumn: "1/-1", fontSize: 13 }}>{who} · {fdate(row.fecha_hora)}</div></div>
      : <div className="pa-ar"><span>{tag}</span><span>{who}</span><span className="pa-num">{fdate(row.fecha_hora)}</span>{http}{bt}</div>}
    {ex && <DetailPanel id={row.id_log} d={c.details[row.id_log]} />}
  </>
}

export function PagAudit({ c, mob }: { c: PagAuditCtl; mob: boolean }) {
  const head = <div className="pa-ch"><h2 id="pag-h-aud">Auditoría de cambios</h2><span className="pa-nt">Últimos 10 · solo lectura</span></div>
  if (!c.allowed || c.blk.status === "forbidden") return (
    <section className="pa-card pa-clip" aria-labelledby="pag-h-aud" aria-disabled="true">
      {head}
      <div className="pa-chips"><button type="button" className="pa-chip" aria-disabled="true">Pasarelas</button><button type="button" className="pa-chip" aria-disabled="true">POS</button></div>
      <div className="pa-dis">{I(Lock, 20)}<div><p><b>Auditoría no disponible para tu usuario</b>Ver quién cambió qué exige rol 1, rol 5 o el área «auditoria». Tu usuario no tiene ese permiso.</p></div></div>
    </section>
  )
  if (c.blk.status === "load") return <SkCard title="Auditoría de cambios" rows={3} />
  if (c.blk.status !== "ok") return <ErrCard title="Auditoría de cambios" what="la auditoría de cambios" code={c.blk.code} message={c.blk.message} onRetry={c.blk.retry} />
  return (
    <section className="pa-card pa-clip" aria-labelledby="pag-h-aud">
      {head}
      <div className="pa-chips" role="tablist" aria-label="Filtrar auditoría">
        <button type="button" className="pa-chip" role="tab" aria-selected={c.tab === "pas"} onClick={() => c.setTab("pas")}>Pasarelas <b>({c.totals.pas})</b></button>
        <button type="button" className="pa-chip" role="tab" aria-selected={c.tab === "pos"} onClick={() => c.setTab("pos")}>POS <b>({c.totals.pos})</b></button>
      </div>
      {c.rows.length === 0
        ? <EmptyBlk title="Aún no hay cambios registrados">Los cambios de pasarelas y de adquirentes aparecerán aquí. Esto no es un error.</EmptyBlk>
        : c.rows.map(r => <Line key={r.id_log} row={r} c={c} mob={mob} />)}
    </section>
  )
}
