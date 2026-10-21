import { useEffect, useRef } from "react"
import { ArrowLeft } from "lucide-react"
import type { User } from "../../../services/userService"
import { rulesFor, type Actor } from "./usrRules"
import { roleName } from "./usrCommon"
import { useUsrActions } from "./useUsrActions"
import { useUsrAccess } from "./useUsrAccess"
import type { AffBusiness } from "./useUsrAffiliates"
import { Alert, GuardAlert, I, type Banner, type Guard } from "./UsrParts"
import { UserChips } from "./UsrChips"
import { UsrDatos } from "./UsrDatos"
import { UsrRole } from "./UsrRole"
import { UsrGrants } from "./UsrGrants"
import { UsrLifecycle } from "./UsrLifecycle"

interface P {
  u: User; actor: Actor; biz?: AffBusiness; mob: boolean; guard?: Guard | null; notice?: Banner | null; onNotice?: () => void
  onBack: () => void; onChanged: () => void; onDeleted: () => void; onDirty: (d: boolean) => void; goAff: (id: number) => void; goReq: () => void
}

export function UsrDetail({ u, actor, biz, mob, guard, notice, onNotice, onBack, onChanged, onDeleted, onDirty, goAff, goReq }: P) {
  const act = useUsrActions()
  const access = useUsrAccess(u.id_user)
  const r = rulesFor(u, actor)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => { body.current?.scrollTo({ top: 0 }) }, [u.id_user, act.banner])
  const changed = () => { onChanged(); access.reload() }

  return (
    <section className="dp" aria-label={`Cuenta de ${u.name}`}>
      <div className="dh">
        {mob && <button type="button" className="back" onClick={onBack}>{I(ArrowLeft, 18)}Atrás</button>}
        <div className="dh1"><h2>{u.name}</h2><UserChips u={u} lg /></div>
        <p className="dh2">{roleName(u)} · {u.email}</p>
      </div>
      <div className="db" ref={body}>
        {guard && <GuardAlert g={guard} />}
        {notice && !act.banner && <div className="sec" style={{ paddingTop: 0, borderTop: 0 }}><Alert b={notice} onClose={onNotice} /></div>}
        {act.banner && <div className="sec" style={{ paddingTop: 0, borderTop: 0 }}><Alert b={act.banner} onClose={act.clear} /></div>}
        <UsrDatos key={u.id_user} u={u} edit={r.edit} act={act} onSaved={onChanged} onDirty={onDirty} />
        <UsrRole u={u} r={r} maestra={actor.maestra} act={act} onChanged={changed} biz={biz} goAff={goAff} />
        <UsrGrants u={u} access={access} rule={r.resolve} act={act} onChanged={onChanged} goReq={goReq} />
        <UsrLifecycle u={u} rule={r.lifecycle} act={act} onChanged={changed} onDeleted={onDeleted} />
      </div>
    </section>
  )
}
