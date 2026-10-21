import { useEffect, useState } from "react"
import { KeyRound, Lock } from "lucide-react"
import { updateUser, type User } from "../../../services/userService"
import type { Rule } from "./usrRules"
import { emailOk, pwValid } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import { Confirm, Field, I, Spin, Why } from "./UsrParts"
import { UsrPassword } from "./UsrPassword"

export function UsrDatos({ u, edit, act, onSaved, onDirty }: { u: User; edit: Rule; act: Actions; onSaved: () => void; onDirty: (d: boolean) => void }) {
  const [name, setName] = useState(u.name)
  const [email, setEmail] = useState(u.email)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState("")
  const dirty = name !== u.name || email !== u.email
  const first = u.name.split(" ")[0]
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => () => onDirty(false), [onDirty])
  const local = !name.trim() || name.trim().length < 3 ? "El nombre debe tener entre 3 y 120 caracteres" : !emailOk(email) ? "Ingresa un correo válido" : ""

  const save = async () => {
    if (local) { act.setBanner({ tone: "er", title: local }); return }
    const r = await act.run("datos", () => updateUser(u.id_user, { name: name.trim(), email: email.trim().toLowerCase() }), { title: "Guardado", text: `Los datos de ${first} se actualizaron.` })
    if (r.ok) onSaved()
  }
  const changePw = async () => {
    const r = await act.run("pw", () => updateUser(u.id_user, { password: pw }), { title: "Contraseña cambiada", text: `Se cerraron las sesiones abiertas de ${first}.` })
    setPw("")
    if (r.ok) setPwOpen(false)
  }
  const off = !edit.ok

  return (
    <section className="sec" aria-labelledby="usr-datos">
      <h3 id="usr-datos">Datos</h3>
      <div className="fg">
        <Field id="usr-name" label="Nombre" error={act.errs.name}>
          <input id="usr-name" className={`inp${act.errs.name ? " bad" : ""}`} value={name} disabled={off} maxLength={120} onChange={e => setName(e.target.value)} />
        </Field>
        <Field id="usr-email" label="Correo" error={act.errs.email}>
          <input id="usr-email" className={`inp${act.errs.email ? " bad" : ""}`} type="email" value={email} disabled={off} onChange={e => setEmail(e.target.value)} />
        </Field>
      </div>
      {off && <Why icon={Lock}>{edit.why}</Why>}
      {dirty && !off && (
        <div className="acts">
          <button type="button" className="btn pri" aria-disabled={act.busy === "datos"} onClick={() => void save()}>{act.busy === "datos" && <Spin />}Guardar cambios</button>
          <button type="button" className="btn out" onClick={() => { setName(u.name); setEmail(u.email); act.clear() }}>Descartar</button>
          <Why>Cambiar el correo no cierra las sesiones.</Why>
        </div>
      )}
      {!pwOpen ? (
        <div className="act">
          <button type="button" className="btn out" aria-disabled={off} aria-describedby={off ? "usr-pw-why" : undefined} onClick={() => { if (!off) setPwOpen(true) }}>{I(KeyRound, 16)}Restablecer contraseña</button>
          <Why id="usr-pw-why">{off ? edit.why : "Al cambiarla se cierran las sesiones abiertas de esta cuenta."}</Why>
        </div>
      ) : (
        <div className="ap">
          <UsrPassword id="usr-newpw" label="Nueva contraseña" value={pw} onChange={setPw} error={act.errs.password} />
          <Confirm danger={false} title={`Se cerrarán las sesiones abiertas de ${first}`} text="Tendrá que iniciar sesión de nuevo con la contraseña nueva."
            okLabel="Cambiar contraseña" ok={pwValid(pw)} busy={act.busy === "pw"} onOk={() => void changePw()} onCancel={() => { setPwOpen(false); setPw("") }} />
          {!pwValid(pw) && <Why>Falta cumplir los requisitos para poder cambiarla.</Why>}
        </div>
      )}
    </section>
  )
}
