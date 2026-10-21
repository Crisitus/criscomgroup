import { CircleAlert, Mail, Plus, RotateCw, TriangleAlert } from "lucide-react"
import type { CommunityCampaign } from "../../../services/communityService"
import { CampaignRow } from "./CampaignRow"
import { I } from "./comShared"
import type { Status } from "./useComData"

export function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="tcard" aria-busy="true" role="status"><span className="sr">Cargando…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skr" key={i} style={i ? undefined : { borderTop: 0 }}><span className="sk" style={{ width: `${34 + ((i * 7) % 22)}%` }} /><span className="sk" style={{ width: "10%" }} /><span className="sk" style={{ width: "14%", marginLeft: "auto" }} /></div>
      ))}
    </div>
  )
}
export function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="stack">
      <div className="ban bad" role="alert">{I(CircleAlert, 18)}<div><b>No se pudo cargar la comunidad.</b> {msg || "Revisa la conexión e inténtalo de nuevo."}</div></div>
      <div><button type="button" className="btn out" onClick={onRetry}>{I(RotateCw, 16)}Reintentar</button></div>
    </div>
  )
}

export function Attention({ list, activos, bajas }: { list: CommunityCampaign[]; activos: number; bajas: number }) {
  const bad = list.filter(c => c.estado === "parcial" || c.estado === "fallido")
  const fails = bad.reduce((a, c) => a + c.fallidos, 0)
  return (
    <span className="ctx">
      {bad.length > 0 && <>{I(TriangleAlert, 16)}<b>{bad.length} {bad.length > 1 ? "campañas" : "campaña"} con fallos</b> · {fails} por reintentar · </>}
      <span><b>{activos}</b> activos · <b>{bajas}</b> bajas</span>
    </span>
  )
}

export interface ListProps {
  list: CommunityCampaign[]; status: Status; error: string; mob: boolean; expanded: number | null; why: string | null; tick: string
  onRetry: () => void; onToggle: (id: number) => void; onEdit: (c: CommunityCampaign) => void
  onTest: (c: CommunityCampaign) => void; onSend: (c: CommunityCampaign) => void; onNew: () => void
}
export function CampaignList(p: ListProps) {
  if (p.status === "load") return <Skeleton rows={4} />
  if (p.status === "error") return <ErrorBox msg={p.error} onRetry={p.onRetry} />
  if (!p.list.length) {
    return (
      <div className="tcard em"><span className="dic">{I(Mail, 22)}</span><h2>Todavía no hay campañas</h2>
        <p>Crea la primera: la redactas, la pruebas en tu correo y la envías a los miembros activos.</p>
        <button type="button" className="btn out" onClick={p.onNew}>{I(Plus, 16)}Nueva campaña</button></div>
    )
  }
  const rows = p.list.map(c => (
    <CampaignRow key={c.id_campaign} c={c} mob={p.mob} open={p.expanded === c.id_campaign} why={p.why} tick={p.tick}
      onToggle={() => p.onToggle(c.id_campaign)} onEdit={() => p.onEdit(c)} onTest={() => p.onTest(c)} onSend={() => p.onSend(c)} />
  ))
  if (p.mob) return <div className="stack">{rows}</div>
  return (
    <div className="cl">
      <div className="ch"><span>Campaña</span><span>Estado</span><span>Envío</span><span>Enviada</span><span style={{ textAlign: "right" }}>Acciones</span></div>
      {rows}
    </div>
  )
}
