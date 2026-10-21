import { Inbox, Lock, LogIn, RefreshCw, ServerCrash } from "lucide-react"
import { canResolve, type Actor } from "./usrRules"
import type { ReqStatus } from "./useUsrAccess"
import { useUsrActions } from "./useUsrActions"
import { useUsrRequests } from "./useUsrRequests"
import { Alert, I, Msg, Skeleton } from "./UsrParts"
import { UsrReqRow } from "./UsrReqRow"

const SEGS: [ReqStatus, string][] = [["pending", "Pendientes"], ["approved", "Aprobadas"], ["rejected", "Rechazadas"]]
const VACIO: Record<ReqStatus, string> = { pending: "No hay solicitudes pendientes", approved: "No hay solicitudes aprobadas", rejected: "No hay solicitudes rechazadas" }

export function UsrRequests({ actor, q, onCount }: { actor: Actor; q: ReturnType<typeof useUsrRequests>; onCount?: () => void }) {
  const act = useUsrActions()
  const can = canResolve(actor)
  const done = () => { void q.load(true); onCount?.() }
  const resuelta = act.banner?.title === "La solicitud ya fue resuelta"

  let body
  if (q.state === "load") body = <div className="sl"><Skeleton rows={5} /></div>
  else if (q.state === "forbidden") body = <Msg icon={Lock} tone="wn" title="Sin permiso para ver las solicitudes">{q.msg}</Msg>
  else if (q.state === "unauth") body = <Msg icon={LogIn} tone="wn" title="Tu sesión terminó">Vuelve a iniciar sesión para continuar.</Msg>
  else if (q.state === "error") body = <Msg icon={ServerCrash} tone="er" title="No se pudieron cargar las solicitudes" action={<button type="button" className="btn out" onClick={() => void q.load()}>{I(RefreshCw, 16)}Reintentar</button>}>{q.msg}</Msg>
  else if (q.rows.length === 0) body = <Msg icon={Inbox} title={VACIO[q.status]}>Las solicitudes llegan desde la pantalla Solicitudes de acceso de cada cuenta.</Msg>
  else body = (
    <div className="sl" role="list">
      <div className="rq rqh" aria-hidden="true"><span>Solicitante</span><span>Área</span><span>Motivo</span><span>Estado</span><span>Acción</span></div>
      {q.rows.map(r => <UsrReqRow key={r.id_request} r={r} can={can} act={act} onDone={done} />)}
    </div>
  )
  return (
    <section className="sp" aria-label="Solicitudes de acceso">
      <div className="sph">
        <div className="seg" role="radiogroup" aria-label="Estado de la solicitud">
          {SEGS.map(([v, x]) => <button key={v} type="button" role="radio" aria-checked={q.status === v} onClick={() => q.pick(v)}>{x}<b>{q.counts[v]}</b></button>)}
        </div>
        <span className="nt">Fechas en hora de Lima</span>
      </div>
      {act.banner && act.banner.tone !== "ok" && (
        <div style={{ padding: "8px 8px 0" }}>
          <Alert b={resuelta ? { ...act.banner, text: "Otra persona la resolvió antes que tú. Actualiza la bandeja para ver su estado actual." } : act.banner} onClose={resuelta ? undefined : act.clear}>
            {resuelta && <button type="button" className="btn out" onClick={() => { act.clear(); void q.load(true) }}>{I(RefreshCw, 16)}Actualizar bandeja</button>}
          </Alert>
        </div>
      )}
      {act.banner?.tone === "ok" && <div style={{ padding: "8px 8px 0" }}><Alert b={act.banner} onClose={act.clear} /></div>}
      {body}
      {q.state === "ok" && q.pages > 1 && (
        <div className="pag"><span>Página {q.page} de {q.pages}</span>
          <div>
            <button type="button" className="btn out" aria-disabled={q.page <= 1} onClick={() => q.page > 1 && q.setPage(q.page - 1)}>Anterior</button>
            <button type="button" className="btn out" aria-disabled={q.page >= q.pages} onClick={() => q.page < q.pages && q.setPage(q.page + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </section>
  )
}
