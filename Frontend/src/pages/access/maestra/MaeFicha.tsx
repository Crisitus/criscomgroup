import { Lock, ShieldCheck, User } from "lucide-react"
import { Fld, I } from "./maeParts"
import type { useMaeForm } from "./useMaeForm"

type Form = ReturnType<typeof useMaeForm>

/** Tu cuenta: nombre editable, correo fijo y etiqueta de rol. */
export function MaeFicha({ f }: { f: Form }) {
  const ok = f.status === "ok"
  const dis = !ok || f.busy || f.closing
  return (
    <section className="card fi" aria-label="Tu cuenta">
      <div className="avt" aria-hidden="true">{ok && f.account ? (f.name.trim().charAt(0) || f.account.name.charAt(0)).toUpperCase() : I(User, 22)}</div>
      <Fld id="mae-nombre" label="Nombre" value={ok ? f.name : "—"} onChange={f.setName} ac="name" err={f.errors.name} dis={dis} />
      <Fld id="mae-correo" label="Correo" value={ok && f.account ? f.account.email : "—"} readOnly dis={!ok} icon={I(Lock, 16, "lock")}
        hint="El correo no se puede cambiar para evitar un bloqueo accidental del sistema" />
      <div className="ct"><span className="tag">{I(ShieldCheck, 16)}Cuenta maestra</span></div>
    </section>
  )
}
