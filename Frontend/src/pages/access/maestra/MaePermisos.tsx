import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Lock, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react"
import type { AccessGrant } from "../../../services/accessService"
import { I } from "./maeParts"
import { MaeRevokeSheet } from "./MaeRevokeSheet"
import { MaeRow } from "./MaeRow"
import type { useMaeGrants } from "./useMaeGrants"

type Grants = ReturnType<typeof useMaeGrants>
const NOTE = "Los permisos caducan solos (máximo 30 días). Las solicitudes pendientes se aprueban en Solicitudes de acceso. Primero, los que vencen antes."
const ToReq = () => <Link className="btn out" to="/access-center">Solicitudes de acceso {I(ChevronRight, 16)}</Link>

/** Permisos de area concedidos: lista, vacio, error, 403 de bloque y revocacion con confirmacion. */
export function MaePermisos({ gr, mob }: { gr: Grants; mob: boolean }) {
  const [sel, setSel] = useState<AccessGrant | null>(null)
  const close = () => { const id = sel?.id_grant; setSel(null); gr.setRevokeError(""); if (id) window.setTimeout(() => document.getElementById(`mae-rev-${id}`)?.focus(), 0) }
  const ok = async () => { if (sel && await gr.revoke(sel)) setSel(null) }
  const note = gr.status === "load" ? "Cargando permisos de área…" : gr.status === "err" ? "Error al cargar." : gr.status === "403" ? "Sin acceso a este bloque." : NOTE
  const tag = gr.status === "load" ? "Cargando" : gr.status === "ok" ? `${gr.rows.length} vigentes` : ""
  return (
    <section className="card pm" aria-labelledby="mae-pmh" aria-busy={gr.status === "load" || undefined}>
      <div className="pm-h"><div><h2 id="mae-pmh">Permisos de área concedidos</h2><p>{note}</p></div>{tag && <span className="tag">{tag}</span>}</div>
      {gr.status === "load" && [0, 1, 2].map(i => (
        <div className="skr" key={i} aria-hidden="true"><div className="c"><div className="sk" style={{ width: "55%" }} /><div className="sk" style={{ width: "35%" }} /></div><div className="sk" style={{ width: 96 }} /><div className="sk" style={{ width: 84, height: 44, borderRadius: 8 }} /></div>
      ))}
      {gr.status === "err" && (
        <div className="emp" role="alert"><span className="ico bad">{I(TriangleAlert, 22)}</span><h3>No se pudieron cargar los permisos</h3>
          <p>La lista no se pudo leer; no significa que no haya permisos.</p>
          <button type="button" className="btn out" onClick={() => void gr.load()}>{I(RefreshCw, 16)}Reintentar</button></div>
      )}
      {gr.status === "403" && (
        <div className="emp"><span className="ico">{I(Lock, 22)}</span><h3>Solo la cuenta maestra ve y revoca permisos</h3>
          <p>Acceso denegado (403). Los permisos se piden desde Solicitudes de acceso.</p><ToReq /></div>
      )}
      {gr.status === "ok" && !gr.rows.length && (
        <div className="emp"><span className="ico">{I(ShieldCheck, 22)}</span><h3>No hay permisos de área vigentes.</h3>
          <p>Cuando apruebes una solicitud aparecerá aquí.</p><ToReq /></div>
      )}
      {gr.status === "ok" && gr.rows.length > 0 && (
        <div role="list">
          {gr.rows.map(g => (
            <MaeRow key={g.id_grant} g={g} sel={sel?.id_grant === g.id_grant} mob={mob} busy={gr.busyId === g.id_grant} error={gr.revokeError}
              onAsk={() => { gr.setRevokeError(""); setSel(g) }} onCancel={close} onOk={() => void ok()} />
          ))}
        </div>
      )}
      {mob && sel && <MaeRevokeSheet g={sel} busy={gr.busyId === sel.id_grant} error={gr.revokeError} onCancel={close} onOk={() => void ok()} />}
    </section>
  )
}
