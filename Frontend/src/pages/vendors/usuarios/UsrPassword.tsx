import { useState } from "react"
import { Check, Eye, EyeOff, Minus, X } from "lucide-react"
import { pwChecks } from "./usrCommon"
import { I } from "./UsrParts"

/** Contraseña nueva: se escribe enmascarada (mostrar/ocultar solo lo que se teclea) y nunca se vuelve a mostrar. */
export function UsrPassword({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [show, setShow] = useState(false)
  const checks = pwChecks(value)
  return (
    <div>
      <label className="lab2" htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} className={`inp${error ? " bad" : ""}`} type={show ? "text" : "password"} autoComplete="new-password" spellCheck={false}
          value={value} aria-invalid={!!error} aria-describedby={`${id}-r${error ? ` ${id}-e` : ""}`} onChange={e => onChange(e.target.value)} />
        <button type="button" className="ib" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} onClick={() => setShow(s => !s)}>{I(show ? EyeOff : Eye, 18)}</button>
      </div>
      <ul className="rq2" id={`${id}-r`}>
        {checks.map(c => {
          const t = !value ? "z" : c.ok ? "y" : "n"
          return <li key={c.x} className={t}>{I(!value ? Minus : c.ok ? Check : X, 14)}<span>{c.x}</span></li>
        })}
      </ul>
      {error && <p className="fe" id={`${id}-e`}><span>{error}</span></p>}
    </div>
  )
}
