import { useState } from "react"
import { Link } from "react-router-dom"
import { Lock, ShieldCheck, User as UserIcon } from "lucide-react"
import { changeUserRole, type User } from "../../../services/userService"
import type { Rule } from "./usrRules"
import { roleName } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import type { AffBusiness } from "./useUsrAffiliates"
import { Confirm, I, Why } from "./UsrParts"
import { UsrProfile } from "./UsrProfile"
import { UsrElevate } from "./UsrElevate"

interface Rules { prot: boolean; edit: Rule; elevate: Rule; toAdmin: Rule; toClient: Rule }
interface P { u: User; r: Rules; maestra: boolean; act: Actions; onChanged: () => void; biz?: AffBusiness; goAff: (id: number) => void }

export function UsrRole({ u, r, maestra, act, onChanged, biz, goAff }: P) {
  const [ask, setAsk] = useState<2 | 4 | null>(null)
  const first = u.name.split(" ")[0]
  const apply = async (role: 2 | 4) => {
    const res = await act.run("rol", () => changeUserRole({ id: u.id_user, id_role: role }), { title: "Rol cambiado", text: `${first} ahora es ${role === 2 ? "Administrador" : "Cliente"}. Se cerraron sus sesiones abiertas.` })
    if (res.ok) { setAsk(null); onChanged() }
  }
  const blocked = [r.toAdmin, r.toClient].filter(x => !x.ok && x.why !== "Ya es Administrador." && x.why !== "Ya es Cliente.")
  const why = blocked[0]?.why

  return (
    <section className="sec" aria-labelledby="usr-rol">
      <h3 id="usr-rol">Rol y acceso</h3>
      <dl className="kv"><dt>Rol</dt><dd>{roleName(u)}</dd></dl>
      {r.prot ? (
        <div className="act">
          {maestra && u.es_maestra ? <Link className="btn out" to="/erp/master-account">{I(ShieldCheck, 16)}Ir a Cuenta maestra</Link>
            : <button type="button" className="btn out" aria-disabled="true" aria-describedby="usr-prot-why">{I(ShieldCheck, 16)}Ir a Cuenta maestra</button>}
          <Why id="usr-prot-why">Su nombre, correo y contraseña se cambian solo desde esa pantalla.</Why>
        </div>
      ) : (
        <>
          <UsrProfile u={u} edit={r.edit} act={act} onChanged={onChanged} biz={biz} goAff={goAff} />
          {u.id_role === 2 && <UsrElevate u={u} rule={r.elevate} act={act} onChanged={onChanged} />}
          <div className="act">
            <span className="lab2" style={{ margin: 0 }}>Cambiar rol</span>
            {u.id_role !== 2 && <button type="button" className="btn out" aria-disabled={!r.toAdmin.ok} aria-describedby={why ? "usr-rol-why" : undefined} onClick={() => { if (r.toAdmin.ok) setAsk(2) }}>{I(ShieldCheck, 16)}Hacer Administrador</button>}
            {u.id_role !== 4 && <button type="button" className="btn out" aria-disabled={!r.toClient.ok} aria-describedby={why ? "usr-rol-why" : undefined} onClick={() => { if (r.toClient.ok) setAsk(4) }}>{I(UserIcon, 16)}Pasar a Cliente</button>}
          </div>
          {why ? <Why id="usr-rol-why" icon={Lock}>{why}</Why> : <Why>Cambiar el rol borra su perfil anterior (tipo, negocio, vencimientos) y cierra sus sesiones.</Why>}
          {ask && <Confirm title={`¿Pasar a ${first} a ${ask === 2 ? "Administrador" : "Cliente"}?`} text="Se borra su perfil anterior (tipo de vendedor, negocio afiliado, vencimientos) y se cierran sus sesiones abiertas."
            okLabel={ask === 2 ? "Hacer Administrador" : "Pasar a Cliente"} danger={ask === 4} busy={act.busy === "rol"} onOk={() => void apply(ask)} onCancel={() => setAsk(null)} />}
        </>
      )}
    </section>
  )
}
