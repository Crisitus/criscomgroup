import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Activity, Ban, ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleX, ExternalLink, Eye, FileText, Image as ImageIcon, Inbox, Info, Lock,
  MessageCircle, Package, RefreshCw, Search, Send, ShieldCheck, Truck, Wrench, X, Clock, type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  listWorkOrderChannelTimeline, listWorkOrderMessages, listWorkOrders, markWorkOrderMessageOpened, openWorkOrderEvidence, prepareWorkOrderMessage,
  setWorkOrderEvidenceVisibility, updateWorkOrder, type WorkOrder, type WorkOrderChannelEvent, type WorkOrderMessage,
} from "../../services/workOrderService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { dateTimeLima, limaDate, norm, todayLima, addDays, longDate } from "../../components/erp/format"
import "../../styles/taller-whatsapp.css"

const Q = (s: string) => `"${s}"`
const I = (Icon: LucideIcon, size = 18, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const PLT: [string, string][] = [["estado", "Estado actual"], ["recibido", "Equipo recibido"], ["cotizacion", "Cotización lista"], ["listo", "Listo para entrega"], ["entregado", "Entrega registrada"]]
const ST: Record<string, [string, LucideIcon, string]> = {
  recibido: ["Recibido", Inbox, "neu"], diagnostico: ["En diagnóstico", Search, "neu"], cotizado: ["Cotizado", FileText, "neu"], aprobado: ["Aprobado", CircleCheck, "neu"],
  en_proceso: ["En reparación", Wrench, "warn"], pruebas: ["En pruebas", Activity, "warn"], listo: ["Listo para entregar", Package, "ok"], entregado: ["Entregado", Truck, "ok"], cancelado: ["Cancelado", CircleX, "bad"],
}
const REGLA = "Abierto no equivale a enviado, entregado o leído."
const fmtTel = (t?: string) => (t && t.length >= 11 ? `+${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}` : t || "")
const timeOf = (iso: string) => dateTimeLima(iso).split(" ").slice(1).join(" ")
const pLbl = (p: string) => PLT.find(x => x[0] === p)?.[1] || p
const estChip = (o: WorkOrder) => { const [l, Icon, k] = ST[o.estado] || [o.estado, Info, "neu"]; return <span className={`st ${k}`}>{I(Icon)}{l}</span> }
const conChip = (o: WorkOrder) => o.whatsapp_consentimiento
  ? <span className="st ok">{I(ShieldCheck)}Autorizado . {o.whatsapp_consentimiento_fuente || "orden"}</span>
  : <span className="st bad">{I(CircleX)}No autorizado</span>
const conShort = (o: WorkOrder) => o.whatsapp_consentimiento ? <span className="st ok">{I(ShieldCheck)}Autorizado</span> : <span className="st bad">{I(CircleX)}No autorizado</span>
const dayLbl = (iso: string) => { const d = limaDate(iso); const h = todayLima(); return d === h ? `Hoy . ${longDate(d)}` : d === addDays(h, -1) ? `Ayer . ${longDate(d)}` : longDate(d) }

type Item = { k: "ev"; at: string; e: WorkOrderChannelEvent } | { k: "man"; at: string; m: WorkOrderMessage & { abierto_en?: string } }

export default function WhatsAppStatusPage() {
  useDocumentTitle("Comunicación al cliente")
  const [params] = useSearchParams()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [orderId, setOrderId] = useState(params.get("order") || params.get("orden") || "")
  const [template, setTemplate] = useState("estado")
  const [preview, setPreview] = useState<{ id_mensaje_servicio: number; contenido: string; url: string } | null>(null)
  const [history, setHistory] = useState<WorkOrderMessage[]>([])
  const [timeline, setTimeline] = useState<WorkOrderChannelEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState("")
  const [dlg, setDlg] = useState<{ kind: "pub"; ev: WorkOrderChannelEvent } | { kind: "rev" } | null>(null)
  const [sheet, setSheet] = useState(false)
  const [updated, setUpdated] = useState(Date.now())
  const [, setTick] = useState(0)
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)
  const pickRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const selected = orders.find(o => String(o.id_orden_servicio) === orderId)

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 900

  const loadOrders = useCallback(async () => setOrders(await listWorkOrders("servicio_tecnico")), [])
  const loadComm = useCallback(async (id: number) => {
    const [manual, channel] = await Promise.all([listWorkOrderMessages(id), listWorkOrderChannelTimeline(id)])
    setHistory(manual); setTimeline(channel); setUpdated(Date.now())
  }, [])
  useEffect(() => { loadOrders().catch(() => toast.error("No se pudieron cargar las órdenes")) }, [loadOrders])
  useEffect(() => {
    setPreview(null)
    if (!orderId) { setHistory([]); setTimeline([]); return }
    const id = Number(orderId)
    setLoading(true)
    loadComm(id).catch(() => { setHistory([]); setTimeline([]) }).finally(() => setLoading(false))
    const timer = window.setInterval(() => void loadComm(id).catch(() => undefined), 15_000)
    return () => window.clearInterval(timer)
  }, [orderId, loadComm])
  useEffect(() => { const t = window.setInterval(() => setTick(x => x + 1), 5000); return () => window.clearInterval(t) }, [])
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (pickRef.current && !pickRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [menu])

  const items: Item[] = useMemo(() => {
    const l: Item[] = [
      ...timeline.map(e => ({ k: "ev" as const, at: e.recibido_en, e })),
      ...history.map(m => ({ k: "man" as const, at: m.creado_en, m: m as WorkOrderMessage & { abierto_en?: string } })),
    ]
    return l.sort((a, b) => a.at.localeCompare(b.at))
  }, [timeline, history])
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [items.length, orderId, loading])

  const consent = async (enabled: boolean) => {
    if (!selected) return
    setBusy(true)
    try {
      await updateWorkOrder(selected.id_orden_servicio, { ...selected, whatsapp_consentimiento: enabled, whatsapp_consentimiento_fuente: "confirmación registrada en ERP" })
      await loadOrders(); setDlg(null); setPreview(null)
      toast.success(enabled ? "Consentimiento registrado" : "Consentimiento revocado")
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo actualizar el consentimiento") } finally { setBusy(false) }
  }
  const prepare = async () => {
    if (!selected) return
    setBusy(true)
    try { setPreview(await prepareWorkOrderMessage(selected.id_orden_servicio, template)); await loadComm(selected.id_orden_servicio) }
    catch (e) { toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo preparar el mensaje") } finally { setBusy(false) }
  }
  const open = async () => {
    if (!selected || !preview) return
    const popup = window.open(preview.url, "_blank", "noopener,noreferrer")
    if (!popup) return toast.error("Permite ventanas emergentes para abrir WhatsApp")
    await markWorkOrderMessageOpened(selected.id_orden_servicio, preview.id_mensaje_servicio)
    await loadComm(selected.id_orden_servicio)
    setPreview(null); setSheet(false)
    toast.info("WhatsApp fue abierto. Esto no confirma entrega ni lectura.")
  }
  const setVisible = async (ev: WorkOrderChannelEvent, visible: boolean) => {
    if (!selected || !ev.evidencia) return
    try {
      await setWorkOrderEvidenceVisibility(selected.id_orden_servicio, ev.evidencia.id_evidencia_servicio, visible)
      await loadComm(selected.id_orden_servicio); setDlg(null)
      toast.success(visible ? "Foto publicada en el seguimiento" : "Foto ocultada al cliente")
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo cambiar la visibilidad") }
  }

  const list = orders.filter(o => !q.trim() || norm(`${o.codigo} ${o.cliente} ${o.equipo}`).includes(norm(q)))
  const pick = (id: number) => { setOrderId(String(id)); setMenu(false); setQ("") }
  const secs = Math.max(0, Math.round((Date.now() - updated) / 1000))
  const picker = (
    <div className="pick" ref={pickRef}>
      <button type="button" className="pk" aria-haspopup="listbox" aria-expanded={menu} aria-label="Orden" onClick={() => setMenu(m => !m)}>
        <span className="tx">{selected ? <><b>{selected.codigo}</b> . {selected.cliente} . {selected.equipo}</> : <span className="mut">Buscar orden: código, cliente o equipo</span>}</span>{I(ChevronDown)}
      </button>
      {menu && (
        <div className="menu">
          <div className="srch">{I(Search)}<input className="in" value={q} placeholder="Código, cliente o equipo" aria-label="Buscar orden" autoFocus onChange={e => setQ(e.target.value)} /></div>
          <div role="listbox" aria-label="Órdenes">
            {list.map(o => (
              <button type="button" className="op" role="option" key={o.id_orden_servicio} aria-selected={String(o.id_orden_servicio) === orderId} onClick={() => pick(o.id_orden_servicio)}>
                <span><b>{o.codigo}</b> . {o.cliente}<span className="s2" style={{ display: "block" }}>{o.equipo}</span></span>{conShort(o)}
              </button>
            ))}
            {!list.length && <div className="empty" style={{ minHeight: 80, background: "none" }}>Ninguna orden coincide con la búsqueda.</div>}
          </div>
        </div>
      )}
    </div>
  )

  const head = selected && (
    <div className="ch">
      <div className="r1"><h2>{selected.codigo} . {selected.cliente}</h2>{estChip(selected)}</div>
      <div className="r2">
        <span className="eq num">{selected.equipo} . {selected.telefono ? fmtTel(selected.telefono) : "Sin teléfono registrado"}</span>
        <div className="cs">
          {conChip(selected)}
          {selected.whatsapp_consentimiento ? <button type="button" className="btn out" onClick={() => setDlg({ kind: "rev" })}>{I(Ban)}Revocar permiso</button>
            : selected.telefono ? <button type="button" className="btn" disabled={busy} onClick={() => void consent(true)}>Registrar autorización</button>
              : <><button type="button" className="btn" aria-disabled="true" aria-describedby="wr">Registrar autorización</button></>}
        </div>
      </div>
      {!selected.whatsapp_consentimiento && selected.telefono && <div className="why neu">{I(Info)}<span>Quedará registrado con la fuente {Q("confirmación registrada en ERP")}.</span></div>}
      {!selected.whatsapp_consentimiento && !selected.telefono && <div className="why bad" id="wr">{I(CircleAlert)}<span>Falta el teléfono del cliente: regístralo en el expediente para poder registrar la autorización.</span></div>}
    </div>
  )

  const tl = (() => {
    if (loading && !items.length) return <div className="tlw" aria-busy="true">{[0, 1, 0, 1].map((r, i) => <div className={`skb${r ? " r" : ""}`} key={i}><span className="sk" style={{ width: "40%" }} /><span className="sk" /><span className="sk" style={{ width: "70%" }} /></div>)}</div>
    if (!items.length) return <div className="empty">{I(MessageCircle, 28)}<h3>Sin mensajes en el canal de esta orden</h3><p>Los mensajes y fotos que lleguen por OpenClaw aparecerán aquí.</p><p>Para asociar una conversación sin ambigüedad, comparte el código {selected?.codigo} en el chat.</p></div>
    let day = ""
    return (
      <div className="tlw" tabIndex={0} role="log" aria-label={`Conversación de la orden ${selected?.codigo}`} ref={logRef}>
        {items.map(it => {
          const d = limaDate(it.at)
          const sep = d !== day ? (day = d, <div className="day" key={`d-${d}-${it.at}`}>{dayLbl(it.at)}</div>) : null
          if (it.k === "ev") {
            const e = it.e, cl = e.remitente_tipo !== "tecnico"
            return (
              <div key={`e-${e.id_canal_evento}`} style={{ display: "contents" }}>
                {sep}
                <div className={`msg ${cl ? "c" : "t"}`}>
                  <div className="meta num">{cl ? "Cliente" : "Técnico"} . ---- {e.remitente_ultimos4} . Gateway . {timeOf(e.recibido_en)}</div>
                  {e.contenido && <div className="bub">{e.contenido}</div>}
                </div>
                {e.evidencia && (
                  <div className="phc">
                    <div className="thumb" role="img" aria-label="Miniatura de la foto">{I(ImageIcon, 28)}</div>
                    <div>
                      <div className="pt">{e.evidencia.descripcion || "Evidencia de WhatsApp"}</div>
                      <div className={`st ${e.evidencia.visible_cliente ? "ok" : "neu"}`}>{e.evidencia.visible_cliente ? <>{I(Eye)}Publicada en el seguimiento del cliente</> : <>{I(Lock)}Privada hasta que la publiques</>}</div>
                      <div className="ac">
                        <button type="button" className="lnk" onClick={() => void openWorkOrderEvidence(e.evidencia as never)}>{I(Eye)}Ver</button>
                        <button type="button" className="sw" role="switch" aria-checked={!!e.evidencia.visible_cliente} onClick={() => { if (e.evidencia?.visible_cliente) void setVisible(e, false); else setDlg({ kind: "pub", ev: e }) }}><span className="tr" />Visible al cliente</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          }
          const m = it.m, ab = m.estado === "abierto"
          return (
            <div key={`m-${m.id_mensaje_servicio}`} style={{ display: "contents" }}>
              {sep}
              <div className="msg m">
                <div className="meta num"><span className={`st ${ab ? "neu" : "warn"}`}>{I(ab ? ExternalLink : Clock, 14)}Manual . {ab ? "Abierto" : m.estado === "cancelado" ? "Cancelado" : "Preparado . todavía no abierto"}</span><span>. {pLbl(m.plantilla)} . {timeOf(ab && m.abierto_en ? m.abierto_en : m.creado_en)}</span></div>
                <div className="bub">{m.contenido}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  })()

  const foot = (
    <div className="cf">
      <div className="ro">{I(Lock)}<span>{mob ? "Solo lectura" : "Canal solo de lectura"}</span></div>
      <div className="rf"><span className="num">{loading ? "Actualizando..." : mob ? `hace ${secs} s` : `Actualizado hace ${secs} s . cada 15 s`}</span>
        <button type="button" className={`btn out${mob ? " sq" : ""}`} aria-label="Actualizar" onClick={() => selected && void loadComm(selected.id_orden_servicio)}>{I(RefreshCw)}{mob ? "" : "Actualizar"}</button></div>
    </div>
  )

  const dis = !selected?.whatsapp_consentimiento
  const panelBody = selected && (
    <>
      <div className="tpl" role="radiogroup" aria-label="Plantilla" aria-disabled={dis}>
        {PLT.map(([k, l]) => <button type="button" className="tp" role="radio" key={k} aria-checked={template === k} aria-disabled={dis} tabIndex={dis ? -1 : 0} onClick={() => { if (!dis) { setTemplate(k); setPreview(null) } }}><span className="rd" />{l}</button>)}
      </div>
      {dis ? <div className="why bad" id="wp">{I(Lock)}<span>Sin autorización del cliente no se prepara ningún mensaje. Registra la autorización de esta orden para activar el envío.</span></div>
        : preview ? <><div className="prev"><div className="pl"><span>Vista previa . solo lectura</span><span className="st warn">{I(Clock, 14)}Preparado . todavía no abierto</span></div>{preview.contenido}</div><div className="why neu">{I(Info)}<span>{REGLA}</span></div></>
          : <div className="prev"><div className="pl"><span>Vista previa . solo lectura</span></div><span className="mut">Aquí verás el texto antes de abrirlo en WhatsApp.</span></div>}
      <div className="ft">
        {dis ? <button type="button" className="btn" aria-disabled="true" aria-describedby="wp">Preparar vista previa</button>
          : preview ? <button type="button" className="btn" onClick={() => void open()}>{I(ExternalLink)}Abrir en WhatsApp</button>
            : <button type="button" className="btn" disabled={busy} onClick={() => void prepare()}>Preparar vista previa</button>}
      </div>
    </>
  )

  return (
    <div className="pg-twha" ref={host}>
      <div className="pg">
        <div className="hd"><h1>Comunicación al cliente</h1>{!mob && picker}</div>
        {mob && picker}
        {!selected ? (
          <section className="card gd">
            <div className="sh">Elige una orden para ver su conversación<small>Busca arriba por código, cliente o equipo, o elige de la lista.</small></div>
            <div className="gl">{orders.map(o => (
              <button type="button" className="ow" key={o.id_orden_servicio} onClick={() => pick(o.id_orden_servicio)}>
                <span><b>{o.codigo}</b> . {o.cliente}<span className="s2">{o.equipo} . {estChip(o)}</span></span>{conShort(o)}{I(ChevronRight, 16, "ch")}
              </button>))}</div>
          </section>
        ) : (
          <div className="cv">
            <section className="card conv" aria-label="Conversación">{head}{tl}{foot}</section>
            {!mob && <aside className="card pnl" aria-labelledby="pt"><h2 id="pt">Enviar actualización</h2>{panelBody}</aside>}
          </div>
        )}
      </div>
      {mob && selected && <div className="mbar">{selected.whatsapp_consentimiento ? <button type="button" className="btn" onClick={() => setSheet(true)}>{I(Send)}Enviar actualización</button> : <button type="button" className="btn" aria-disabled="true">{I(Lock)}Enviar actualización</button>}</div>}

      {sheet && selected && (
        <div className="scrim bt"><div className="dlg" role="dialog" aria-labelledby="ht">
          <div className="th"><h3 id="ht">Enviar actualización</h3><button type="button" className="btn out sq" aria-label="Cerrar" onClick={() => setSheet(false)}>{I(X)}</button></div>{panelBody}
        </div></div>
      )}
      {dlg?.kind === "pub" && selected && (
        <ErpDialog open onOpenChange={o => { if (!o) setDlg(null) }} title="Publicar foto al cliente">
          <div className="pg-twha"><div className="dlg" style={{ border: 0, padding: 0, maxWidth: "none", position: "static", marginTop: 12 }}>
            <div className="cons">Foto {Q(dlg.ev.evidencia?.descripcion || "Evidencia de WhatsApp")} . orden {selected.codigo}</div>
            <p>{selected.cliente.split(" ")[0]} podrá ver esta foto en el seguimiento de su orden. Mientras no la publiques, es privada. Podrás ocultarla de nuevo con un clic.</p>
            <div className="ft"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn" onClick={() => void setVisible(dlg.ev, true)}>Publicar foto</button></div>
          </div></div>
        </ErpDialog>
      )}
      {dlg?.kind === "rev" && selected && (
        <ErpDialog open onOpenChange={o => { if (!o) setDlg(null) }} title="Revocar permiso de contacto">
          <div className="pg-twha"><div className="dlg" style={{ border: 0, padding: 0, maxWidth: "none", position: "static", marginTop: 12 }}>
            <div className="cons">{selected.cliente} . {fmtTel(selected.telefono)} . autorización: {selected.whatsapp_consentimiento_fuente || "orden"}</div>
            <p>Desde ahora no se podrán preparar mensajes para esta orden. La conversación y el historial siguen visibles. Para volver a escribirle tendrás que registrar la autorización otra vez.</p>
            <div className="ft"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn dng" disabled={busy} onClick={() => void consent(false)}>Revocar permiso</button></div>
          </div></div>
        </ErpDialog>
      )}
    </div>
  )
}
