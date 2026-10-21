import { ArrowLeft, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react"
import { PendingBox } from "./PvAlerts"
import { PvHead, PvInfo } from "./PvInfo"
import { PanelBody, PanelFoot } from "./PvPanel"
import { panelFlags } from "./pvDraft"
import { I } from "./pvParts"
import type { PostventaList } from "./usePostventaList"
import type { PostventaDetail } from "./usePostventaDetail"

type Props = { det: PostventaDetail; list: PostventaList; role: number; canWrite: boolean; mob: boolean }

const Empty = ({ title, text, bad, onRetry }: { title: string; text: string; bad?: boolean; onRetry?: () => void }) => (
  <div className="ctr" role={bad ? "alert" : "status"}>
    <span className={`bi${bad ? " bad" : ""}`}>{I(bad ? CircleAlert : ShieldCheck, 22)}</span>
    <h3>{title}</h3>
    <p>{text}</p>
    {onRetry && <button type="button" className="btn" onClick={onRetry}>{I(RefreshCw, 16)}Reintentar</button>}
  </div>
)

function pendTarget(det: PostventaDetail, list: PostventaList): string {
  if (det.pend === "list") return "la bandeja"
  return list.rows.find(r => r.id_solicitud === det.pend)?.codigo_seguimiento ?? "otra solicitud"
}

/** Detalle de escritorio: tarjeta a la derecha de la bandeja (sin modal). */
export function PvDetailCard(p: Props) {
  const { det, list } = p
  if (!det.selId) {
    const ok = list.status === "ok" && list.total > 0
    return <section className="card ex"><Empty title={ok ? "Elige una solicitud" : "Sin solicitud abierta"} text={ok ? "Selecciona un caso de la bandeja para ver su ficha y responder." : "Cuando haya solicitudes podrás abrirlas aquí."} /></section>
  }
  if (det.loadErr) return <section className="card ex"><Empty bad title="No se pudo abrir la solicitud" text={det.loadErr} onRetry={det.reload} /></section>
  const c = det.c
  if (!c || !det.d) return <section className="card ex"><Empty title="Cargando…" text="Se está abriendo la solicitud elegida." /></section>
  const f = panelFlags(c, det.d, { canWrite: p.canWrite, stale: det.ban?.k === "409", hasAccErr: !!det.errs.acc })
  return (
    <section className="card ex" aria-label={`Detalle ${c.codigo_seguimiento}`}>
      <div className="exh"><PvHead c={c} mob={false} /></div>
      <div className="exb"><PvInfo c={c} /></div>
      {det.pend != null && <PendingBox c={c} pend={det.pend} target={pendTarget(det, list)} onKeep={det.keep} onDrop={det.drop} />}
      <form className="pn" onSubmit={e => e.preventDefault()}>
        <div className="pnb"><PanelBody det={det} c={c} f={f} /></div>
        <div className="pnf"><PanelFoot det={det} c={c} f={f} role={p.role} /></div>
      </form>
    </section>
  )
}

/** Detalle de movil: pantalla completa, barra superior y pie fijo. */
export function PvDetailMobile(p: Props) {
  const { det, list } = p
  const top = (title: string) => (
    <div className="mtop">
      <button type="button" className="ib" aria-label="Volver a la bandeja" onClick={det.back}>{I(ArrowLeft, 20)}</button>
      <h1 className="mono" style={{ fontSize: 15, fontWeight: 650 }}>{title}</h1>
    </div>
  )
  const c = det.c
  if (det.loadErr) return <div className="mdet">{top("Solicitud")}<div className="mbody"><Empty bad title="No se pudo abrir la solicitud" text={det.loadErr} onRetry={det.reload} /></div></div>
  if (!c || !det.d) return <div className="mdet">{top("Solicitud")}<div className="mbody"><Empty title="Cargando…" text="Se está abriendo la solicitud elegida." /></div></div>
  const f = panelFlags(c, det.d, { canWrite: p.canWrite, stale: det.ban?.k === "409", hasAccErr: !!det.errs.acc })
  return (
    <div className="mdet">
      {top(c.codigo_seguimiento)}
      <div className="mbody">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><PvHead c={c} mob /></div>
        <PvInfo c={c} />
        <form className="pn" onSubmit={e => e.preventDefault()}><div className="pnb"><PanelBody det={det} c={c} f={f} /></div></form>
      </div>
      <div className="mfoot">
        {det.pend != null && <PendingBox c={c} pend={det.pend} target={pendTarget(det, list)} onKeep={det.keep} onDrop={det.drop} />}
        <div className="rowb"><PanelFoot det={det} c={c} f={f} role={p.role} /></div>
      </div>
    </div>
  )
}
