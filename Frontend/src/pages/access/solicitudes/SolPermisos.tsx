import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { fmtAccess, solArea, solByExpiry, solVigencia, type SolGrant } from "./solCommon"
import { SolEmpty, SolRetry, SolSkeleton } from "./SolEstados"
import type { BlockStatus } from "./useSolAccess"

function VigChip({ expires }: { expires: string | null }) {
  const v = solVigencia(expires)
  const Icon = v.i
  return <span className={`vg ${v.c}`}><Icon className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />{v.t}</span>
}

/** Mis permisos vigentes (GET /access/my): área, chip de vigencia y fecha exacta; los revoca Cuenta maestra. */
export function SolPermisos({ status, grants, onRetry }: { status: BlockStatus; grants: SolGrant[]; onRetry: () => void }) {
  let body: React.ReactNode
  if (status === "load") body = <SolSkeleton shapes={["h", "h"]} />
  else if (status === "err") body = <SolRetry title="No pudimos cargar tus permisos" detail="El servidor respondió con un error. Tus permisos siguen vigentes aunque no se vean." onRetry={onRetry} />
  else if (!grants.length) body = <SolEmpty title="Aún no tienes permisos adicionales">Cuando la cuenta maestra apruebe una solicitud, el permiso aparece aquí con su vigencia.</SolEmpty>
  else body = (
    <ul className="ls">
      {solByExpiry(grants).map(g => (
        <li key={g.id_grant}>
          <div className="t"><b>{solArea(g.area)}</b><VigChip expires={g.expires_at} /></div>
          <span className="sm num">{g.expires_at ? `Hasta el ${fmtAccess(g.expires_at)}` : "Sin vencimiento"}</span>
        </li>
      ))}
    </ul>
  )
  return (
    <section className="card" aria-labelledby="h-perm">
      <div className="cp">
        <div className="ch1"><h2 id="h-perm">Mis permisos vigentes</h2>{status === "ok" && grants.length > 0 && <span className="n num">{grants.length}</span>}</div>
        {body}
      </div>
      <div className="cardfoot">
        <span>Los permisos concedidos se ven y se revocan en</span>
        <Link className="lnk" to="/master-account">Cuenta maestra <ChevronRight className="ic" size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}
