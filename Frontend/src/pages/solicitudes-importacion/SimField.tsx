import type { ReactNode } from "react"
import { CircleAlert, CircleHelp, Lock } from "lucide-react"
import { I } from "./simParts"

/** Campo del panel de gestion: etiqueta, control, ayuda (o motivo del bloqueo) y error del campo. */
export function Fld({ k, name, label, req, err, hint, lock, children }: {
  k: string; name: string; label: string; req?: boolean; err?: string; hint?: string; lock?: boolean; children: ReactNode
}) {
  return (
    <div className={`fld${err ? " err" : ""}`}>
      <div className="fl"><label htmlFor={`${k}-${name}`}>{label}{req && <> <span className="rq">· obligatorio</span></>}</label></div>
      {children}
      {hint && <div className="hn" id={`${k}-${name}-h`}>{I(lock ? Lock : CircleHelp, 14)}<span>{hint}</span></div>}
      {err && <div className="em" id={`${k}-${name}-e`}>{I(CircleAlert, 14)}<span>{err}</span></div>}
    </div>
  )
}
