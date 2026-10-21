import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CircleAlert, Eye, EyeOff, RefreshCw } from "lucide-react"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
export const Spin = () => I(RefreshCw, 16, "spin")

/** Campo con etiqueta visible, error por campo y (si es contrasena) boton Mostrar/Ocultar. */
export function Fld({ id, label, value, onChange, type = "text", ac, err, dis, readOnly, lr, hint, icon }: {
  id: string; label: string; value: string; onChange?: (v: string) => void; type?: "text" | "password"
  ac?: string; err?: string; dis?: boolean; readOnly?: boolean; lr?: ReactNode; hint?: ReactNode; icon?: ReactNode
}) {
  const [show, setShow] = useState(false)
  const pw = type === "password"
  const describe = [err ? `${id}-e` : "", hint ? `${id}-h` : ""].filter(Boolean).join(" ") || undefined
  return (
    <div className="fld">
      <div className="lr"><label htmlFor={id}>{label}</label>{lr}</div>
      <div className={`iw${readOnly ? " ro" : ""}`}>
        {icon}
        <input className="in" id={id} name={id} type={pw && show ? "text" : type} value={value} autoComplete={ac}
          disabled={dis} readOnly={readOnly} aria-invalid={err ? true : undefined} aria-describedby={describe}
          onChange={e => onChange?.(e.target.value)} />
        {pw && (
          <button type="button" className="eye" aria-pressed={show} disabled={dis}
            aria-label={`${show ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`} onClick={() => setShow(s => !s)}>
            {show ? I(EyeOff, 20) : I(Eye, 20)}
          </button>
        )}
      </div>
      {hint && <p className="hint" id={`${id}-h`}>{hint}</p>}
      {err && <p className="em" id={`${id}-e`}>{I(CircleAlert, 14)}<span>{err}</span></p>}
    </div>
  )
}

/** Aviso de pagina: icono + titulo + detalle opcional (estado, nunca solo color). */
export function Banner({ tone, icon, title, sm, extra }: { tone: "ok" | "bad" | "warn"; icon: ReactNode; title: string; sm?: string; extra?: ReactNode }) {
  return (
    <div className={`bn ${tone}`} role={tone === "bad" ? "alert" : "status"}>
      {icon}<div><b>{title}</b>{sm && <span className="sm">{sm}</span>}</div>{extra}
    </div>
  )
}
