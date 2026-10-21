import { useEffect } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import type { User } from "../../../services/userService"
import { canCreateAdmin, type Actor } from "./usrRules"
import { Alert, Field, GuardAlert, I, Spin, Why, type Guard } from "./UsrParts"
import { UsrPassword } from "./UsrPassword"
import { UsrRoleFields } from "./UsrRoleFields"
import { CAMPOS, FOCO, useUsrForm, type FormState } from "./useUsrForm"

const ROLES: { r: FormState["role"]; x: string; d: string }[] = [
  { r: 3, x: "Vendedor", d: "Vende en tienda física, virtual o como afiliado." },
  { r: 5, x: "Auditor temporal", d: "Revisa información hasta un vencimiento." },
  { r: 6, x: "Técnico", d: "Atiende el taller de servicio técnico." },
  { r: 2, x: "Administrador", d: "Gestiona el ERP. El superusuario temporal se concede después." },
  { r: 4, x: "Cliente", d: "Cuenta de cliente de la tienda, sin herramientas internas." },
]

export function UsrForm({ actor, mob, guard, onCancel, onCreated, onDirty }: { actor: Actor; mob: boolean; guard?: Guard | null; onCancel: () => void; onCreated: (u: User) => void; onDirty: (d: boolean) => void }) {
  const { f, set, errs, submit, reset, dirty, act } = useUsrForm(onCreated)
  const admin = canCreateAdmin(actor)
  const keys = Object.keys(errs).filter(k => errs[k])
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => () => onDirty(false), [onDirty])
  const focus = (k: string) => { const el = document.getElementById(FOCO[k] ?? "") as HTMLElement | null; el?.focus() }

  return (
    <section className="dp" aria-label="Nueva cuenta">
      <div className="dh">
        {mob && <button type="button" className="back" onClick={onCancel}>{I(ArrowLeft, 18)}Atrás</button>}
        <div className="dh1"><h2>Nueva cuenta</h2></div>
      </div>
      <div className="db">
        {guard && <GuardAlert g={guard} />}
        {keys.length > 0 && (
          <div className="sec" style={{ paddingTop: 0, borderTop: 0 }}>
            <div className="al er" role="alert">
              <div>
                <b>{keys.length === 1 ? "Revisa 1 campo antes de crear la cuenta" : `Revisa ${keys.length} campos antes de crear la cuenta`}</b>
                <ul>{keys.map(k => <li key={k}>{FOCO[k] ? <a href={`#${FOCO[k]}`} onClick={e => { e.preventDefault(); focus(k) }}>{CAMPOS[k] ?? k}: {errs[k]}</a> : `${CAMPOS[k] ?? k}: ${errs[k]}`}</li>)}</ul>
              </div>
            </div>
          </div>
        )}
        {act.banner && keys.length === 0 && <div className="sec" style={{ paddingTop: 0, borderTop: 0 }}><Alert b={act.banner} onClose={act.clear} /></div>}
        <div className="sec">
          <div className="fg">
            <Field id="f-name" label="Nombre" error={errs.name}><input id="f-name" className={`inp${errs.name ? " bad" : ""}`} value={f.name} maxLength={120} onChange={e => set({ name: e.target.value })} /></Field>
            <Field id="f-email" label="Correo" error={errs.email}><input id="f-email" className={`inp${errs.email ? " bad" : ""}`} type="email" value={f.email} onChange={e => set({ email: e.target.value })} /></Field>
          </div>
          <UsrPassword id="f-pw" label="Contraseña" value={f.password} onChange={v => set({ password: v })} error={errs.password} />
        </div>
        <div className="sec">
          <h3 id="f-rol">Rol</h3>
          <div className="rg" role="radiogroup" aria-labelledby="f-rol">
            {ROLES.map(o => {
              const off = o.r === 2 && !admin.ok
              return (
                <div key={o.r}>
                  <button type="button" role="radio" className="rr" aria-checked={f.role === o.r} aria-disabled={off} aria-describedby={off ? "f-adm-why" : undefined} onClick={() => { if (!off) set({ role: o.r }) }}>
                    <span className="rd" /><span><b>{o.x}</b><small>{o.d}</small></span>
                  </button>
                  {off && <Why id="f-adm-why">{admin.why}</Why>}
                </div>
              )
            })}
          </div>
          {errs.id_role && <p className="fe">{errs.id_role}</p>}
          <UsrRoleFields f={f} set={set} errs={errs} />
        </div>
      </div>
      <div className="df">
        <button type="button" className="btn out" onClick={() => { reset(); onCancel() }}>Cancelar</button>
        <button type="button" className="btn pri" aria-disabled={act.busy === "crear"} onClick={() => { if (act.busy !== "crear") void submit() }}>{act.busy === "crear" ? <Spin /> : I(Plus, 16)}Crear cuenta</button>
      </div>
    </section>
  )
}
