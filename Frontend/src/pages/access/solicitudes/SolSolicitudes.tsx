import { fmtAccess, solArea, SOL_STATUS, type SolMine } from "./solCommon"
import { SolEmpty, SolRetry, SolSkeleton } from "./SolEstados"
import type { BlockStatus } from "./useSolAccess"

function StatChip({ status }: { status: string }) {
  const s = SOL_STATUS[status] ?? { t: status, c: "warn" as const, i: SOL_STATUS.pending.i }
  const Icon = s.i
  return <span className={`st ${s.c}`}><Icon className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />{s.t}</span>
}

/** Mis últimas 5 solicitudes: área, estado icono + palabra, motivo, fecha y vigencia concedida. */
export function SolSolicitudes({ status, requests, onRetry }: { status: BlockStatus; requests: SolMine[]; onRetry: () => void }) {
  const last = requests.slice(0, 5)
  let body: React.ReactNode
  if (status === "load") body = <SolSkeleton shapes={["h", "h", "h"]} />
  else if (status === "err") body = <SolRetry title="No pudimos cargar tus solicitudes" detail="Es la misma carga que «Mis permisos vigentes»; al reintentar vuelven los dos bloques." onRetry={onRetry} />
  else if (!last.length) body = <SolEmpty title="Todavía no has enviado solicitudes">Las últimas 5 aparecerán aquí con su estado.</SolEmpty>
  else body = (
    <ul className="ls">
      {last.map(r => (
        <li key={r.id_request}>
          <div className="t"><b>{solArea(r.area)}</b><StatChip status={r.status} /></div>
          <p>{r.reason}</p>
          <span className="sm num">Enviada el {fmtAccess(r.created_at)}</span>
          {r.status === "approved" && r.expires_at && <span className="sm num">Vigencia concedida hasta el {fmtAccess(r.expires_at)}</span>}
        </li>
      ))}
    </ul>
  )
  return (
    <section className="card" aria-labelledby="h-mis">
      <div className="cp">
        <div className="ch1"><h2 id="h-mis">Mis solicitudes</h2>{status === "ok" && last.length > 0 && <span className="n">Últimas {last.length} de {requests.length}</span>}</div>
        {body}
      </div>
    </section>
  )
}
