import { CircleAlert, CircleCheck, CircleX } from "lucide-react"
import { REQS } from "./maeCommon"
import { Fld, I, Spin } from "./maeParts"
import type { useMaeForm } from "./useMaeForm"

type Form = ReturnType<typeof useMaeForm>

/** Confirmar con la contrasena actual + nueva opcional con requisitos en vivo. */
export function MaePassword({ f }: { f: Form }) {
  const dis = f.locked
  const badReq = !!f.errors.new_password
  const mismatch = !!f.cf && f.cf !== f.nw
  const lab = f.mode === "pw" ? "Cambiar contraseña y cerrar sesión" : "Guardar nombre"
  const matchTag = f.cf ? (
    <span className={`st ${mismatch ? "bad" : "ok"}`} role="status">{I(mismatch ? CircleX : CircleCheck, 14)}{mismatch ? "No coincide" : "Coincide"}</span>
  ) : null
  return (
    <section className="card pw" aria-labelledby="mae-pwh">
      <h2 id="mae-pwh">Contraseña</h2>
      {f.alert && <p className="em" role="alert">{I(CircleAlert, 16)}<span>{f.alert}</span></p>}
      <p className="sec">Confirma con tu contraseña actual</p>
      <Fld id="mae-actual" label="Contraseña actual" type="password" value={f.cur} onChange={f.onCur} ac="current-password"
        err={f.errors.current_password} dis={dis} lr={<span className="hint">Obligatoria, también si solo cambias el nombre</span>} />
      <p className="sec">Nueva contraseña <span>· opcional, déjala vacía si solo cambias el nombre</span></p>
      <div className="two">
        <Fld id="mae-nueva" label="Nueva contraseña" type="password" value={f.nw} onChange={f.setNw} ac="new-password" err={f.errors.new_password} dis={dis} />
        <Fld id="mae-conf" label="Confirmar nueva" type="password" value={f.cf} onChange={f.setCf} ac="new-password" dis={dis} lr={matchTag} />
      </div>
      <ul className="rq" aria-label="Requisitos de la nueva contraseña">
        {REQS.map((t, i) => {
          const c = f.flags[i] ? "ok" : badReq ? "bad" : "no"
          return <li key={t} className={c}>{I(f.flags[i] ? CircleCheck : CircleX, 16)}<span className="t">{t}</span><span className="w">{f.flags[i] ? "Cumple" : "Falta"}</span></li>
        })}
      </ul>
      <div className="act">
        {f.why && <p className={`why${f.why.bad ? " bad" : ""}`} id="mae-why">{I(CircleAlert, 14)}<span>{f.why.text}</span></p>}
        <button type="button" className="btn" aria-disabled={f.why ? true : undefined} aria-describedby={f.why ? "mae-why" : undefined} onClick={f.submit}>
          {f.busy ? <><Spin />Guardando…</> : lab}
        </button>
      </div>
    </section>
  )
}
