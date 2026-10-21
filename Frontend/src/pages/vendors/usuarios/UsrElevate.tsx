import { useState } from "react"
import { Clock, Lock, ShieldAlert, X } from "lucide-react"
import { configureTemporarySuperuser, type User } from "../../../services/userService"
import type { Rule } from "./usrRules"
import { fmtDT, inDays, isFutureLima } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import { Chip, Confirm, I, Spin, Why } from "./UsrParts"
import { UsrExpiry } from "./UsrExpiry"

/** Superusuario temporal de un Administrador: solo la cuenta maestra lo concede o lo quita. */
export function UsrElevate({ u, rule, act, onChanged }: { u: User; rule: Rule; act: Actions; onChanged: () => void }) {
  const vigente = !!u.superusuario_vigente
  const [v, setV] = useState(vigente && u.superusuario_expira_en ? u.superusuario_expira_en : inDays(1))
  const [ask, setAsk] = useState(false)
  const first = u.name.split(" ")[0]
  const go = async (enabled: boolean) => {
    const r = await act.run("elevar", () => configureTemporarySuperuser({ id: u.id_user, enabled, expires_at: enabled ? v : undefined }),
      { title: enabled ? "Guardado" : "Superusuario quitado", text: enabled ? `${first} es superusuario temporal hasta ${fmtDT(v)} (hora de Lima).` : `${first} volvió a ser Administrador sin elevación.` })
    if (r.ok) { setAsk(false); onChanged() }
  }
  const estado = vigente ? <><Chip t="wn" icon={ShieldAlert} x="Vigente" /><span>hasta {fmtDT(u.superusuario_expira_en)}</span></>
    : u.superusuario_temporal ? <Chip t="er" icon={ShieldAlert} x={`Elevación vencida el ${fmtDT(u.superusuario_expira_en)}`} /> : <span>Sin elevación</span>
  return (
    <>
      <dl className="kv"><dt>Superusuario temporal</dt><dd>{estado}</dd></dl>
      {rule.ok && <UsrExpiry value={v} onChange={setV} label="Vencimiento de la elevación" error={act.errs.expires_at} />}
      <div className="acts">
        <button type="button" className="btn out" aria-disabled={!rule.ok || act.busy === "elevar" || !isFutureLima(v)} aria-describedby="usr-el-why" onClick={() => { if (rule.ok && isFutureLima(v)) void go(true) }}>
          {act.busy === "elevar" ? <Spin /> : I(Clock, 16)}{vigente ? "Actualizar vencimiento" : "Conceder superusuario temporal"}
        </button>
        {(vigente || u.superusuario_temporal) && (
          <button type="button" className="btn out" aria-disabled={!rule.ok} aria-describedby="usr-el-why" onClick={() => { if (rule.ok) setAsk(true) }}>{I(X, 16)}Quitar superusuario</button>
        )}
      </div>
      {!rule.ok && <Why id="usr-el-why" icon={Lock}>{rule.why}</Why>}
      {ask && <Confirm title={`¿Quitar el superusuario de ${first}?`} text="Volverá a ser Administrador sin elevación y dejará de ver Usuarios y afiliados de inmediato." okLabel="Quitar superusuario" busy={act.busy === "elevar"} onOk={() => void go(false)} onCancel={() => setAsk(false)} />}
    </>
  )
}
