import type { KeyboardEvent } from "react"
import { ChevronRight } from "lucide-react"
import type { AuditCatalogo, AuditLogRow } from "../../services/auditLogService"
import { MOTIVO, autor, cuando, hist, lMod, reg, rolLabel } from "./audCommon"
import { ActChip, HttpPill, I } from "./audParts"

/** Movil: una tarjeta por log, con los mismos datos de la tabla. */
export function AudCards({ rows, cat, sel, onPick }: { rows: AuditLogRow[]; cat: AuditCatalogo | null; sel: number | null; onPick: (id: number) => void }) {
  const key = (e: KeyboardEvent, id: number) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(id) } }
  return (
    <div className="mlist">
      {rows.map(r => {
        const w = cuando(r.fecha_hora), u = autor(r, cat)
        return (
          <article key={r.id_log} data-id={r.id_log} className={`mc${r.id_log === sel ? " sel" : ""}`} role="button" tabIndex={0} aria-label={`Abrir el log ${r.id_log}`}
            onClick={() => onPick(r.id_log)} onKeyDown={e => key(e, r.id_log)}>
            <div className="m1"><b className="num">{w.t} <span className="sub" style={{ fontWeight: 400 }}>· {w.d}</span></b><HttpPill r={r} /></div>
            <div className="m2"><span className="nm">{u.name}</span><span className="sub">{r.usuario_rol != null ? rolLabel(r.usuario_rol) : "Rol —"}</span></div>
            <div className="m3"><ActChip a={r.accion} /><span className="tag">{lMod(r.tabla)}</span><span>Registro <b className="num" style={{ color: "hsl(var(--foreground))" }}>{reg(r)}</b></span></div>
            {hist(r) && <div className="sub">Estado HTTP y rol: — · {MOTIVO}</div>}
            <div className="go"><span>Ver detalle</span>{I(ChevronRight, 16)}</div>
          </article>
        )
      })}
    </div>
  )
}

export function AudCardsSkeleton() {
  return (
    <div className="mlist" role="status" aria-busy="true">
      <span className="sr">Cargando logs…</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="mc" aria-hidden="true"><span className="skb" style={{ width: 120 }} /><span className="skb" style={{ width: 180 }} /><span className="skb" style={{ width: 150, height: 22 }} /></div>
      ))}
    </div>
  )
}
