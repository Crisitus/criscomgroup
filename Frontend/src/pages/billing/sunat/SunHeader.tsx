import { CircleCheck, RefreshCw, TriangleAlert, X } from "lucide-react"
import { Link } from "react-router-dom"
import { I } from "./sunShared"
import { LINK_RUC } from "./sunCommon"
import type { Notice } from "./useSunEmitters"

export function SunHeader({ rol1, mob, busy, onRefresh }: { rol1: boolean; mob: boolean; busy: boolean; onRefresh: () => void }) {
  return (
    <div className="suhd">
      <h1>SUNAT y facturación</h1>
      <div className="rt">
        {!mob && (rol1 ? <Link className="sulnk" to="/company">{LINK_RUC}</Link> : <span className="nolnk">{LINK_RUC}: solo para el rol Gerencia</span>)}
        <button type="button" className="btn out" onClick={onRefresh} disabled={busy}>{I(RefreshCw, 16, busy ? "spin" : "")}Actualizar</button>
      </div>
    </div>
  )
}

export const MobileRucLink = ({ rol1 }: { rol1: boolean }) =>
  rol1 ? <Link className="sulnk" to="/company">{LINK_RUC}</Link> : <p className="note">{LINK_RUC}: solo para el rol Gerencia</p>

export const ModeBanner = ({ text }: { text: string }) => (
  <div className="ban warn" role="alert">{I(TriangleAlert, 18)}<p>{text}</p></div>
)

export const NoticeBanner = ({ notice, onClose }: { notice: Notice; onClose: () => void }) => (
  <div className="ban ok" role="status">
    {I(CircleCheck, 18)}
    <p>{notice.text}{notice.afectados !== undefined && <b className="num">{notice.afectados}</b>}{notice.afectados !== undefined && "."}</p>
    <button type="button" className="ib" aria-label="Cerrar aviso" onClick={onClose}>{I(X)}</button>
  </div>
)
