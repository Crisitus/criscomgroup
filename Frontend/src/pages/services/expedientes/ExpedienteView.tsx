import { useEffect, useRef, useState } from "react"
import { Ban, ChevronDown, ChevronRight, CircleAlert, CircleX, Lock, MessageCircle, Pencil, Printer, RotateCcw } from "lucide-react"
import type { WorkOrder } from "../../../services/workOrderService"
import type { WorkOrderDocumentKind } from "../../../utils/workOrderDocuments"
import { CotizacionesTab, EvidenciasTab, HistorialTab, PagosTab, RepuestosTab, ResumenTab, type ExData } from "./tabs"
import { FLOW, I, NEXT, PRIM, ST, StateChip, TIPO_LABEL, blockReason, dayNum, fd, money, monto, saldo, tel } from "./shared"

export const TABS: [string, string][] = [["resumen", "Resumen"], ["cotizaciones", "Cotizaciones"], ["repuestos", "Repuestos"], ["pagos", "Pagos"], ["evidencias", "Evidencias"], ["historial", "Historial"]]
const DOCS: [WorkOrderDocumentKind, string][] = [["orden", "Orden de servicio"], ["cotizacion", "Cotización"], ["ticket", "Ticket 80 mm"], ["etiqueta", "Etiqueta 40×30"], ["entrega", "Constancia de entrega"], ["garantia", "Certificado de garantía"]]
const limaToday = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10)

function useOutside(refs: React.RefObject<HTMLElement | null>[], on: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: MouseEvent) => { if (refs.every(r => !r.current || !r.current.contains(e.target as Node))) on() }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") on() }
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [refs, on, active])
}

export type Actions = {
  status: (to: string) => void
  doc: (kind: WorkOrderDocumentKind) => void
  edit: () => void
  whatsapp: () => void
  anular: () => void
  reingreso: () => void
}

export function ExpedienteView({ o, data, refresh, tab, setTab, act }: {
  o: WorkOrder; data: ExData; refresh: () => Promise<void>; tab: string; setTab: (t: string) => void; act: Actions
}) {
  const [menu, setMenu] = useState<"" | "mas" | "docs">("")
  const mnRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLSpanElement>(null)
  const [refs] = useState(() => [mnRef, docRef])
  useOutside(refs, () => setMenu(""), !!menu)
  const e = o.estado
  const idx = FLOW.indexOf(e)
  const prim = PRIM[e]
  const s = saldo(o)
  const block = e === "listo" ? blockReason(o) : ""
  const vig = e === "entregado" && !!o.garantia_fin && String(o.garantia_fin).slice(0, 10) >= limaToday()
  const noWa = !o.whatsapp_consentimiento
  const noEdit = e === "cancelado"
  const reasons = [noEdit && "«Editar» no está disponible: una orden cancelada no puede modificarse.", noWa && "«WhatsApp» no está disponible: el cliente no dio su consentimiento."].filter(Boolean) as string[]
  const others = (NEXT[e] || []).filter(t => t !== prim?.[1] && t !== "cancelado")
  const count = (k: string) => (k === "cotizaciones" ? data.quotes.length : k === "repuestos" ? data.parts.length : k === "pagos" ? data.payments.length : k === "evidencias" ? data.evidence.length : data.history.length)
  const props = { o, data, refresh }
  const segs = FLOW.map((_, i) => <i key={i} className={e !== "cancelado" && i <= idx ? "on" : ""} />)

  return (
    <section className="ex card" aria-label={`Expediente ${o.codigo}`}>
      <div className="exh">
        <div className="r1">
          <h2>{o.codigo}</h2>
          <StateChip estado={e} size={18} />
          <div className="nx">
            {prim ? (
              <div className="row" ref={mnRef}>
                {block ? <button type="button" className="btn" aria-disabled="true" aria-describedby={`why-${o.id_orden_servicio}`}>{prim[0]}</button>
                  : <button type="button" className="btn" onClick={() => act.status(prim[1])}>{prim[0]}{I(ChevronRight, 16)}</button>}
                <button type="button" className="btn out" aria-haspopup="menu" aria-expanded={menu === "mas"} onClick={() => setMenu(m => (m === "mas" ? "" : "mas"))}>Más {I(ChevronDown, 16)}</button>
                {menu === "mas" && (
                  <div className="menu" role="menu" style={{ right: 0, top: 48 }}>
                    <div className="g">Cambiar estado</div>
                    {others.map(t => { const Icon = ST[t][1]; return <button type="button" role="menuitem" key={t} onClick={() => { setMenu(""); act.status(t) }}>{I(Icon, 16)}{FLOW.indexOf(t) < idx ? "Volver a" : "Pasar a"} {ST[t][0]}</button> })}
                    {others.length > 0 && <hr />}
                    <button type="button" className="dz" role="menuitem" onClick={() => { setMenu(""); act.status("cancelado") }}>{I(CircleX, 16)}Cancelar orden...</button>
                  </div>
                )}
              </div>
            ) : e === "entregado" ? (
              <div className="row">
                <button type="button" className="btn" aria-disabled={!vig} aria-describedby={vig ? undefined : `why-${o.id_orden_servicio}`} onClick={() => { if (vig) act.reingreso() }}>{I(RotateCcw, 16)}Reingreso por garantía</button>
              </div>
            ) : <span className="st bad">{I(Lock, 16)}Orden cancelada . solo lectura</span>}
            {block && <div className="why bad" id={`why-${o.id_orden_servicio}`}>{I(CircleAlert, 16)}<span>«Entregar» está bloqueado: {block}.</span></div>}
            {e === "entregado" && (vig
              ? <span className="hint">Garantía vigente hasta {fd(o.garantia_fin)} . quedan {Math.max(0, dayNum(String(o.garantia_fin).slice(0, 10)) - dayNum(limaToday()))} días</span>
              : <div className="why bad" id={`why-${o.id_orden_servicio}`}>{I(CircleAlert, 16)}<span>La garantía no está vigente.</span></div>)}
          </div>
        </div>
        <div className="r2">
          {TIPO_LABEL[o.tipo]}{o.tipo === "mantenimiento" && o.subtipo_trabajo ? ` . ${o.subtipo_trabajo}` : ""} . {o.cliente}{o.documento ? ` . ${o.documento.length === 11 ? "RUC" : "DNI"} ${o.documento}` : ""} . {tel(o.telefono)}<br />
          {o.equipo}{o.numero_serie ? ` . S/N ${o.numero_serie}` : ""}
        </div>
        <div>
          <div className="fl" role="img" aria-label={`Avance: paso ${idx + 1} de 8`}>{segs}</div>
          <div className="fc">
            {e === "cancelado" ? <><span><b>Cancelado</b> . flujo cerrado</span><span>Solo lectura</span></> : <><span>Paso {idx + 1} de 8 . <b>{ST[e][0]}</b></span><span>{prim ? <>Siguiente: <b>{ST[prim[1]][0]}</b></> : "Estado final"}</span></>}
          </div>
        </div>
        <div className="r3">
          <div className="mny">
            <div><div className="l">Monto</div><div className="v num">{money(monto(o))}</div></div>
            <div><div className="l">Pagado</div><div className="v num">{money(o.adelanto)}</div></div>
            <div><div className="l">Saldo</div><div className="v big num">{money(s)}</div></div>
          </div>
        </div>
        <div className="ra">
          <button type="button" className="btn out" aria-disabled={noEdit} onClick={() => { if (!noEdit) act.edit() }}>{I(Pencil, 16)}Editar</button>
          <span className="hw" style={{ position: "relative" }} ref={docRef}>
            <button type="button" className="btn out" aria-haspopup="menu" aria-expanded={menu === "docs"} onClick={() => setMenu(m => (m === "docs" ? "" : "docs"))}>{I(Printer, 16)}Documentos {I(ChevronDown, 16)}</button>
            {menu === "docs" && (
              <div className="menu" role="menu" style={{ left: 0, top: 48 }}>
                <div className="g">Documentos</div>
                {DOCS.map(([k, l]) => <button type="button" role="menuitem" key={k} onClick={() => { setMenu(""); act.doc(k) }}>{I(Printer, 16)}{l}</button>)}
              </div>
            )}
          </span>
          <button type="button" className="btn out" aria-disabled={noWa} onClick={() => { if (!noWa) act.whatsapp() }}>{I(MessageCircle, 16)}WhatsApp</button>
          <span className="sp" />
          <button type="button" className="btn out" onClick={act.anular}>{I(Ban, 16)}Anular orden</button>
        </div>
        {reasons.length > 0 && <div className="hint">{reasons.join(" ")}</div>}
      </div>
      <div className="tabs" role="tablist" aria-label="Secciones del expediente">
        {TABS.map(([k, l]) => (
          <button type="button" className="tab" role="tab" key={k} aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}{k !== "resumen" && <> <span className="n">{count(k)}</span></>}
          </button>
        ))}
      </div>
      <div className="exb" role="tabpanel">
        {tab === "resumen" && <ResumenTab {...props} goTab={setTab} />}
        {tab === "cotizaciones" && <CotizacionesTab {...props} />}
        {tab === "repuestos" && <RepuestosTab {...props} />}
        {tab === "pagos" && <PagosTab {...props} />}
        {tab === "evidencias" && <EvidenciasTab {...props} />}
        {tab === "historial" && <HistorialTab {...props} />}
      </div>
    </section>
  )
}
