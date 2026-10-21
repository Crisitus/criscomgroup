import { useEffect, useRef } from "react"
import { Clock, ShieldX, TriangleAlert } from "lucide-react"
import type { AccessGrant } from "../../../services/accessService"
import { ROLES, areaLabel, fmtLima, revokeText, vigencia, whoOf } from "./maeCommon"
import { I, Spin } from "./maeParts"


/** Confirmacion inline (escritorio): el foco entra en el titulo y vuelve al boton al cancelar. */
function Confirm({ g, busy, error, onCancel, onOk }: { g: AccessGrant; busy: boolean; error: string; onCancel: () => void; onOk: () => void }) {
  const h = useRef<HTMLHeadingElement>(null)
  useEffect(() => { h.current?.focus() }, [])
  const area = areaLabel(g.area)
  return (
    <div className="cf" role="alertdialog" aria-labelledby={`mae-cft-${g.id_grant}`}
      onKeyDown={e => { if (e.key === "Escape" && !busy) { e.stopPropagation(); onCancel() } }}>
      <h3 id={`mae-cft-${g.id_grant}`} ref={h} tabIndex={-1}>{I(ShieldX, 20)}Revocar permiso de {area}</h3>
      <p>{revokeText(area, whoOf(g))}</p>
      {error && <p className="em" role="alert">{error}</p>}
      <div className="ft">
        <button type="button" className="btn out" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="button" className="btn dng" onClick={onOk} disabled={busy}>{busy ? <><Spin />Revocando…</> : "Revocar permiso"}</button>
      </div>
    </div>
  )
}

export function MaeRow({ g, sel, mob, busy, error, onAsk, onCancel, onOk }: {
  g: AccessGrant; sel: boolean; mob: boolean; busy: boolean; error: string
  onAsk: () => void; onCancel: () => void; onOk: () => void
}) {
  const v = vigencia(g.expires_at)
  const area = areaLabel(g.area)
  const who = whoOf(g)
  return (
    <div className={`rw${sel ? " sel" : ""}`} role="listitem">
      <div className="pe"><b>{who}</b><span>{g.user ? ROLES[g.user.id_role] ?? "" : ""}</span><span>{g.user?.email ?? ""}</span></div>
      <div className="ar">{area}</div>
      <div className="vg">
        <span className="d">{g.expires_at ? fmtLima(g.expires_at) : "Sin fecha de vencimiento"}</span>
        <span className={`st ${v.c}`}>{I(v.i === "alert" ? TriangleAlert : Clock, 14)}{v.t}</span>
      </div>
      <button type="button" id={`mae-rev-${g.id_grant}`} className="btn out" aria-label={`Revocar permiso de ${area} a ${who}`} onClick={onAsk}>Revocar</button>
      {sel && !mob && <Confirm g={g} busy={busy} error={error} onCancel={onCancel} onOk={onOk} />}
    </div>
  )
}
