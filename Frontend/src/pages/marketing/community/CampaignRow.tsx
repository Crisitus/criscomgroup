import { ChevronDown, ChevronUp, FlaskConical, Pencil, RotateCw, Send } from "lucide-react"
import type { CommunityCampaign } from "../../../services/communityService"
import { Btn } from "./Btn"
import { CampaignDetail } from "./CampaignDetail"
import { I, StateChip, fd, fdt, ft } from "./comShared"

export interface RowProps {
  c: CommunityCampaign; mob: boolean; open: boolean; why: string | null; tick: string
  onToggle: () => void; onEdit: () => void; onTest: () => void; onSend: () => void
}

function Progress({ c }: { c: CommunityCampaign }) {
  if (c.estado === "borrador") return <span className="sub">Sin enviar</span>
  const pct = c.destinatarios ? (c.enviados / c.destinatarios) * 100 : 0
  return (
    <>
      <div className="bar" role="progressbar" aria-label="Enviados" aria-valuemin={0} aria-valuemax={c.destinatarios} aria-valuenow={c.enviados}><i style={{ width: `${pct.toFixed(1)}%` }} /></div>
      <span className="num" aria-live="polite">
        <b>{c.enviados}</b> de {c.destinatarios} enviados
        {c.estado === "enviando" ? `, ${c.fallidos} fallidos` : c.fallidos > 0 && <> · <b style={{ color: "hsl(var(--warning-text))" }}>{c.fallidos} fallidos</b></>}
      </span>
    </>
  )
}

function Actions({ c, open, why, onToggle, onEdit, onTest, onSend }: RowProps) {
  const wid = `why-${c.id_campaign}`
  const w = why ? wid : undefined
  const note = why ? <span className="sub" id={wid}>{why}</span> : null
  if (c.estado === "borrador") {
    return (
      <div className="ac"><div className="row">
        <Btn cls="out sm" icon={Pencil} onClick={onEdit}>Editar</Btn>
        <Btn cls="out sm" icon={FlaskConical} onClick={onTest} why={w}>Enviar prueba</Btn>
        <Btn cls="rp sm" icon={Send} onClick={onSend} why={w}>Enviar…</Btn>
      </div>{note}</div>
    )
  }
  if (c.estado === "enviando") return <div className="ac"><span className="sub">Sin acciones mientras se envía.</span></div>
  return (
    <div className="ac"><div className="row">
      <button type="button" className="btn out sm" aria-expanded={open} onClick={onToggle}>{I(open ? ChevronUp : ChevronDown, 16)}{c.estado === "enviado" ? "Ver detalle" : "Ver fallos"}</button>
      {c.estado === "parcial" && <Btn cls="rp sm" icon={RotateCw} onClick={onSend} why={w}>Reintentar solo los fallidos</Btn>}
      {c.estado === "fallido" && <Btn cls="rp sm" icon={RotateCw} onClick={onSend} why={w}>Reintentar</Btn>}
    </div><span className="sub">No se edita ni se elimina: ya se envió.</span>{note}</div>
  )
}

export function CampaignRow(p: RowProps) {
  const { c, mob, open } = p
  const sent = c.enviado_en
  const detail = open && c.estado !== "borrador" && c.estado !== "enviando" ? <CampaignDetail c={c} tick={p.tick} /> : null
  const stk = <div className="stk"><span className="nm">{c.asunto}</span><span className="sub">Creada {fdt(c.creado_en)}</span></div>
  if (mob) {
    return (
      <div className="cc">
        <div className="top">{stk}<StateChip estado={c.estado} /></div>
        <div className="pr"><Progress c={c} /></div>
        {sent && <span className="sub">Enviada {fdt(sent)}{c.modo_envio ? ` · modo ${c.modo_envio}` : ""}</span>}
        <Actions {...p} />
        {detail && <div className="dtm">{detail}</div>}
      </div>
    )
  }
  return (
    <div className="cw">
      <div className="cr">
        <div className="c1">{stk}</div>
        <div><StateChip estado={c.estado} /></div>
        <div className="pr"><Progress c={c} /></div>
        <div className="stk">{sent ? <><span className="num">{fd(sent)}</span><span className="sub">{ft(sent)}{c.modo_envio && <> · <span className="tag" style={{ height: 18, padding: "0 5px" }}>{c.modo_envio}</span></>}</span></> : <span className="mut">—</span>}</div>
        <Actions {...p} />
      </div>
      {detail}
    </div>
  )
}
