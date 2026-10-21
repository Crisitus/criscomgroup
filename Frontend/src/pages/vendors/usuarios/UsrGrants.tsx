import { useState } from "react"
import { Ban, CheckCircle2, Clock, Lock, XCircle } from "lucide-react"
import type { User } from "../../../services/userService"
import { AREAS, fmtDT } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import type { Grant, useUsrAccess } from "./useUsrAccess"
import { revokeGrant } from "./usrApi"
import type { Rule } from "./usrRules"
import { Chip, Confirm, I, Msg, Why } from "./UsrParts"

const CH = { activo: ["ok", CheckCircle2, "Activo"], vencido: ["wn", Clock, "Vencido"], revocado: ["nu", XCircle, "Revocado"] } as const

export function UsrGrants({ u, access, rule, act, onChanged, goReq }: { u: User; access: ReturnType<typeof useUsrAccess>; rule: Rule; act: Actions; onChanged: () => void; goReq: () => void }) {
  const [ask, setAsk] = useState<Grant | null>(null)
  const first = u.name.split(" ")[0]
  const revoke = async (g: Grant) => {
    const r = await act.run("grant", () => revokeGrant(g.id_grant), { title: "Permiso revocado", text: `${first} ya no tiene acceso a ${AREAS[g.area] ?? g.area}.` })
    if (r.ok) { setAsk(null); access.reload(); onChanged() }
  }
  const { grants, pending, state } = access
  return (
    <section className="sec" aria-labelledby="usr-perm">
      <h3 id="usr-perm">Permisos de área</h3>
      {state === "error" && <Msg icon={XCircle} tone="er" title="No se pudieron cargar los permisos" action={<button type="button" className="btn out" onClick={access.reload}>Reintentar</button>}>{access.msg}</Msg>}
      {state === "load" && <p className="hint" aria-busy="true">Cargando permisos…</p>}
      {state === "ok" && grants.length === 0 && pending.length === 0 && <p className="hint">Sin permisos de área. Se conceden solo desde solicitudes aprobadas.</p>}
      {state === "ok" && (
        <ul className="gl">
          {grants.map(g => {
            const [t, ic, x] = CH[g.estado]
            return (
              <li className="gr" key={g.id_grant}>
                <div><b>{AREAS[g.area] ?? g.area}</b><p className="gv">{g.estado === "revocado" ? "Revocado" : g.estado === "vencido" ? `Venció el ${fmtDT(g.expires_at)}` : `Vence el ${fmtDT(g.expires_at)} (hora de Lima)`}</p></div>
                <div className="acts">
                  <Chip t={t} icon={ic} x={x} />
                  {g.estado === "activo" && <button type="button" className="btn out" aria-disabled={!rule.ok} aria-label={`Revocar ${AREAS[g.area] ?? g.area}`} onClick={() => { if (rule.ok) setAsk(g) }}>{I(Ban, 16)}Revocar</button>}
                </div>
              </li>
            )
          })}
          {pending.map(p => (
            <li className="gr" key={`p${p.id_request}`}>
              <div><b>{AREAS[p.area] ?? p.area}</b><p className="gv">Solicitada el {fmtDT(p.created_at)}</p></div>
              <div className="acts"><Chip t="wn" icon={Clock} x="Solicitud pendiente" /><button type="button" className="btn txt" onClick={goReq}>Ver en Solicitudes</button></div>
            </li>
          ))}
        </ul>
      )}
      {!rule.ok && grants.some(g => g.estado === "activo") && <Why icon={Lock}>{rule.why}</Why>}
      {ask && <Confirm title={`¿Revocar el permiso de ${AREAS[ask.area] ?? ask.area} de ${first}?`} text="Perderá el acceso ahora mismo. La solicitud seguirá como Aprobada." okLabel="Revocar permiso" busy={act.busy === "grant"} onOk={() => void revoke(ask)} onCancel={() => setAsk(null)} />}
    </section>
  )
}
