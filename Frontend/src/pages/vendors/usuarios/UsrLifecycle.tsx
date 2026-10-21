import { useState } from "react"
import { Ban, Lock, RotateCcw, Trash2 } from "lucide-react"
import { deleteUser, setUserStatus, type User } from "../../../services/userService"
import type { Rule } from "./usrRules"
import { httpStatus } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import { Alert, Confirm, I, Why } from "./UsrParts"

interface Deps { dependencias?: Record<string, number> }

export function UsrLifecycle({ u, rule, act, onChanged, onDeleted }: { u: User; rule: Rule; act: Actions; onChanged: () => void; onDeleted: () => void }) {
  const [ask, setAsk] = useState<"off" | "del" | null>(null)
  const [deps, setDeps] = useState<Deps | null>(null)
  const first = u.name.split(" ")[0]
  const off = u.activo === false
  const toggle = async (activo: boolean) => {
    const r = await act.run("estado", () => setUserStatus({ id: u.id_user, activo }), { title: activo ? "Cuenta reactivada" : "Cuenta desactivada", text: activo ? `${first} puede volver a iniciar sesión.` : `${first} ya no puede iniciar sesión. Se cerraron sus sesiones.` })
    if (r.ok) { setAsk(null); setDeps(null); onChanged() }
  }
  const remove = async () => {
    const r = await act.run("del", async () => { await deleteUser(u.id_user) }, { title: "Cuenta eliminada", text: `${u.name} se eliminó de forma definitiva.` })
    if (r.ok) { onDeleted(); return }
    const e = r.error as { response?: { data?: { code?: string } & Deps } }
    if (httpStatus(r.error) === 409 && e.response?.data?.code === "USER_HAS_HISTORY") { setDeps({ dependencias: e.response.data.dependencias ?? {} }); act.clear(); setAsk(null) }
  }
  const dis = !rule.ok
  return (
    <section className="sec" aria-labelledby="usr-est">
      <h3 id="usr-est">Estado de la cuenta</h3>
      <p className="hint">Desactivar bloquea el ingreso y cierra sus sesiones abiertas; puedes reactivarla. Eliminar solo es posible sin historial.</p>
      <div className="acts">
        {off ? (
          <button type="button" className="btn out" aria-disabled={dis || act.busy === "estado"} aria-describedby={dis ? "usr-est-why" : undefined} onClick={() => { if (!dis) void toggle(true) }}>{I(RotateCcw, 16)}Reactivar cuenta</button>
        ) : (
          <button type="button" className="btn out" aria-disabled={dis} aria-describedby={dis ? "usr-est-why" : undefined} onClick={() => { if (!dis) setAsk("off") }}>{I(Ban, 16)}Desactivar cuenta</button>
        )}
        <button type="button" className="btn out" aria-disabled={dis} aria-describedby={dis ? "usr-est-why" : undefined} onClick={() => { if (!dis) { setAsk("del"); setDeps(null) } }}>{I(Trash2, 16)}Eliminar cuenta</button>
      </div>
      {dis && <Why id="usr-est-why" icon={Lock}>{rule.why}</Why>}
      {ask === "off" && <Confirm title={`¿Desactivar la cuenta de ${first}?`} text="Se cerrarán sus sesiones abiertas y no podrá iniciar sesión. Podrás reactivarla después." okLabel="Desactivar cuenta" busy={act.busy === "estado"} onOk={() => void toggle(false)} onCancel={() => setAsk(null)} />}
      {ask === "del" && <Confirm title={`¿Eliminar la cuenta de ${u.name}?`} text={off ? "Es definitivo: no se puede deshacer. Solo se elimina si no tiene historial." : "Es definitivo: no se puede deshacer. Si tiene historial, el servidor lo impedirá y podrás desactivarla."} okLabel="Eliminar definitivamente" busy={act.busy === "del"} onOk={() => void remove()} onCancel={() => setAsk(null)} />}
      {deps && (
        <Alert b={{ tone: "er", title: "No se puede eliminar: la cuenta tiene historial", text: "Desactívala para conservar ventas, caja y auditoría.", items: Object.entries(deps.dependencias ?? {}).map(([k, n]) => `${k[0].toUpperCase()}${k.slice(1)}: ${n}`) }}>
          {!off && <button type="button" className="btn pri" onClick={() => void toggle(false)}>{I(Ban, 16)}Desactivar en su lugar</button>}
          <button type="button" className="btn out" onClick={() => setDeps(null)}>Cerrar</button>
        </Alert>
      )}
    </section>
  )
}
