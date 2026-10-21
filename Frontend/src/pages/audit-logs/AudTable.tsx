import type { KeyboardEvent } from "react"
import type { AuditLogRow, AuditCatalogo } from "../../services/auditLogService"
import { autor, cuando, norm, reg, rolLabel, lMod } from "./audCommon"
import { ActChip, HttpPill } from "./audParts"

const ANCHOS = [88, 146, 146, 112, 56, 72, 96]
const TITULOS = ["Fecha y hora", "Autor", "Acción", "Módulo", "Registro", "Estado HTTP", "IP"]

/** Bandeja densa (filas de 44 px). En laptop se omite la columna IP, que sigue en el detalle. */
export function AudTable({ rows, cat, sel, compact, onPick }: { rows: AuditLogRow[]; cat: AuditCatalogo | null; sel: number | null; compact: boolean; onPick: (id: number) => void }) {
  const n = compact ? ANCHOS.length - 1 : ANCHOS.length
  const anchos = compact ? [88, 126, 136, 100, 56, 72] : ANCHOS
  const key = (e: KeyboardEvent, id: number) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(id) } }
  return (
    <table className="tb" aria-label="Logs de auditoría">
      <colgroup>{anchos.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
      <thead><tr>{TITULOS.slice(0, n).map(t => <th key={t} scope="col">{t}</th>)}</tr></thead>
      <tbody>
        {rows.map(r => {
          const w = cuando(r.fecha_hora), u = autor(r, cat), s = r.id_log === sel
          return (
            <tr key={r.id_log} data-id={r.id_log} className={`rw${s ? " sel" : ""}`} tabIndex={0} aria-selected={s} onClick={() => onPick(r.id_log)} onKeyDown={e => key(e, r.id_log)}>
              <td><div className="stk"><span className="a num">{w.dm}</span><span className="sub num">{w.t}</span></div></td>
              <td><div className="stk"><span className="a" title={u.name}>{u.name}</span><span className="sub">{rolLabel(r.usuario_rol)}</span></div></td>
              <td><ActChip a={r.accion} /></td>
              <td>{lMod(r.tabla)}</td>
              <td className="num">{reg(r)}</td>
              <td><HttpPill r={r} /></td>
              {!compact && <td className="ipc">{norm(r.ip_cliente)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const sp = (h: number, w: number) => <span className="skb" style={{ width: w, height: h }} />

export function AudSkeleton() {
  const w = [44, 90, 100, 80, 30, 40, 70]
  return (
    <div className="tscroll skel" role="status" aria-busy="true">
      <span className="sr">Cargando logs…</span>
      <table className="tb" aria-hidden="true">
        <colgroup>{ANCHOS.map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup>
        <thead><tr>{TITULOS.map(t => <th key={t}>{t}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 12 }, (_, i) => <tr key={i}>{w.map((x, j) => <td key={j}>{sp(14, x)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
