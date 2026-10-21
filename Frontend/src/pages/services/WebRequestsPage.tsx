import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft, Ban, Check, ChevronRight, Clock, ExternalLink, FileCheck, Inbox, MessageCircle, MoreHorizontal, Plus, RefreshCw, RotateCcw, Search,
  ShieldAlert, ShieldCheck, TriangleAlert, type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { convertServiceRequest, listServiceRequests, updateServiceRequest, type ServiceRequest } from "../../services/serviceRequestService"
import { listWorkOrders } from "../../services/workOrderService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { dateTimeLima, norm } from "../../components/erp/format"
import "../../styles/taller-web.css"

const Q = (s: string) => `"${s}"`
const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
type Estado = ServiceRequest["estado"]
const ST: Record<Estado, [string, LucideIcon, string]> = {
  pendiente: ["Pendiente", Clock, "warn"], contactado: ["Contactado", MessageCircle, "neu"], recibido: ["Recibido", Inbox, "neu"], descartado: ["Descartado", Ban, "neu"],
}
const FLOW: Estado[] = ["pendiente", "contactado", "recibido"]
const RANK: Record<string, number> = { pendiente: 0, contactado: 1, recibido: 2 }
const tel = (t: string) => (t.length >= 11 ? `+${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}` : t)
const conv = (r: ServiceRequest) => !!r.id_orden_servicio
const abierta = (r: ServiceRequest) => !conv(r) && r.estado !== "descartado"
const noConsent = (r: ServiceRequest) => ["0", 0, false].includes(r.consentimiento_contacto as never)
const ago = (iso: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 6e4))
  if (m < 60) return { t: `hace ${m} min`, d: 0 }
  if (m < 1440) return { t: `hace ${Math.floor(m / 60)} h`, d: 0 }
  const d = Math.floor(m / 1440)
  return { t: `hace ${d} ${d === 1 ? "día" : "días"}`, d }
}
const waHref = (r: ServiceRequest) => `https://wa.me/${r.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${r.cliente}, recibimos tu solicitud ${r.codigo} para revisar ${r.tipo_equipo}. Queremos coordinar el ingreso del equipo a CRISCOM.`)}`
const Chip = ({ e, s = 16 }: { e: Estado; s?: number }) => { const x = ST[e]; return <span className={`st ${x[2]}`}>{I(x[1], s)}{x[0]}</span> }

export default function WebRequestsPage() {
  useDocumentTitle("Solicitudes web de servicio")
  const [items, setItems] = useState<ServiceRequest[]>([])
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [codes, setCodes] = useState<Record<number, { codigo: string }>>({})
  const [filter, setFilter] = useState<"todas" | Estado>("todas")
  const [query, setQuery] = useState("")
  const [selId, setSelId] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [dlg, setDlg] = useState<"convertir" | "contactar" | null>(null)
  const [chk, setChk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mobEx, setMobEx] = useState(false)
  const [width, setWidth] = useState(1200)
  const [nota, setNota] = useState("")
  const host = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 900

  const load = useCallback(async () => {
    try { setItems(await listServiceRequests()); setStatus("ok") } catch { setStatus("error"); toast.error("No se pudieron cargar las solicitudes web") }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    Promise.all([listWorkOrders("servicio_tecnico"), listWorkOrders("mantenimiento"), listWorkOrders("armado_pc")])
      .then(l => { const m: Record<number, { codigo: string }> = {}; l.flat().forEach(o => { m[o.id_orden_servicio] = { codigo: o.codigo } }); setCodes(m) }).catch(() => undefined)
  }, [items.length])
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [menu])

  const cnt = (k: "todas" | Estado) => (k === "todas" ? items.length : items.filter(r => r.estado === k).length)
  const { open, closed } = useMemo(() => {
    const q = norm(query.trim())
    const a = items.filter(r => (filter === "todas" || r.estado === filter) && (!q || norm([r.codigo, r.cliente, r.tipo_equipo, r.marca_modelo, r.telefono].join(" ")).includes(q)))
    return {
      open: a.filter(abierta).sort((x, y) => RANK[x.estado] - RANK[y.estado] || x.creado_en.localeCompare(y.creado_en)),
      closed: a.filter(r => !abierta(r)).sort((x, y) => y.creado_en.localeCompare(x.creado_en)),
    }
  }, [items, query, filter])
  const flat = useMemo(() => [...open, ...closed], [open, closed])
  const sel = items.find(r => r.id_solicitud_servicio === selId) && flat.some(r => r.id_solicitud_servicio === selId) ? items.find(r => r.id_solicitud_servicio === selId)! : null
  useEffect(() => { if (!mob && status === "ok" && !sel && flat[0]) setSelId(flat[0].id_solicitud_servicio) }, [mob, status, sel, flat])
  useEffect(() => { setNota(sel?.notas_admin || ""); setMenu(false) }, [sel?.id_solicitud_servicio, sel?.notas_admin])
  const orderCode = (r: ServiceRequest) => (r.id_orden_servicio ? codes[r.id_orden_servicio]?.codigo || `#${r.id_orden_servicio}` : "")

  const setEstado = async (r: ServiceRequest, estado: Estado) => {
    try { await updateServiceRequest(r.id_solicitud_servicio, { estado }); toast.success(`Estado actualizado: ${ST[estado][0]}`); setMenu(false); await load() }
    catch { toast.error("No se pudo actualizar") }
  }
  const convertir = async (r: ServiceRequest) => {
    setBusy(true)
    try {
      const order = await convertServiceRequest(r.id_solicitud_servicio)
      toast.success(`Orden ${order.codigo} creada. Verifica físicamente el equipo al recibirlo.`)
      setDlg(null); setChk(false); await load()
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo convertir la solicitud") } finally { setBusy(false) }
  }
  const saveNote = async (r: ServiceRequest) => {
    try { await updateServiceRequest(r.id_solicitud_servicio, { notas_admin: nota }); toast.success("Nota guardada"); await load() } catch { toast.error("No se pudo guardar la nota") }
  }
  const pick = (id: number) => { setSelId(id); if (mob) setMobEx(true) }

  const nPend = cnt("pendiente")
  const hd = (
    <div className="hd">
      <h1>Solicitudes web</h1>
      <span className="cnt num">{status === "ok" && <><b>{nPend}</b> {nPend === 1 ? "pendiente" : "pendientes"} . <b>{items.length}</b> en total</>}</span>
    </div>
  )
  const off = status !== "ok"
  const chips = (
    <div className="chips" role="tablist" aria-label="Filtrar por estado">
      {(["todas", "pendiente", "contactado", "recibido", "descartado"] as const).map(k => (
        <button type="button" key={k} className="chip" role="tab" aria-selected={filter === k} disabled={off} onClick={() => setFilter(k)}>
          {k === "todas" ? "Todas" : <>{I(ST[k][1], 14)}{ST[k][0]}</>} <b>{off ? "-" : cnt(k)}</b>
        </button>
      ))}
    </div>
  )
  const search = (
    <label className="srch"><span className="sr">Buscar por código, cliente, equipo o teléfono</span>{I(Search, 18)}
      <input className="in" type="search" placeholder="Código, cliente, equipo o teléfono" value={query} disabled={off} onChange={e => setQuery(e.target.value)} /></label>
  )
  const row = (r: ServiceRequest) => {
    const a = ago(r.creado_en), late = abierta(r) && a.d >= 2
    const right = conv(r) ? <span className="tag ok">{I(FileCheck, 14)}Convertida</span> : noConsent(r) ? <span className="st warn">{I(ShieldAlert, 14)}Sin consentimiento</span> : null
    return (
      <button type="button" className="rw2" role="option" key={r.id_solicitud_servicio} aria-selected={selId === r.id_solicitud_servicio} onClick={() => pick(r.id_solicitud_servicio)}>
        <span className="rb">
          <span className="l1"><b>{r.codigo}</b><Chip e={r.estado} s={15} /></span>
          <span className="l2">{r.cliente} . {r.tipo_equipo}{r.marca_modelo ? ` ${r.marca_modelo}` : ""}</span>
          <span className="l3"><span className={`st ${late ? "warn" : "neu"}`} style={{ fontWeight: late ? 600 : 500 }}>{I(Clock, 14)}{a.t}</span>{right}</span>
        </span>
        {I(ChevronRight, 16, "ch")}
      </button>
    )
  }
  const listEl = (() => {
    if (status === "load") return <div className="list" aria-busy="true">{[0, 1, 2, 3, 4, 5].map(i => <div className="rw2" key={i} aria-hidden="true"><span className="rb" style={{ gap: 6 }}><span className="sk" style={{ width: "38%" }} /><span className="sk" style={{ width: "80%" }} /><span className="sk" style={{ width: "55%" }} /></span></div>)}</div>
    if (!flat.length) return <div className="list" style={{ flex: 1 }}><div className="empty">{I(Search, 28)}<h3>Sin resultados</h3><span>{query ? `Ninguna solicitud coincide con ${Q(query)}` : "No hay solicitudes"}{filter !== "todas" ? ` en ${Q(ST[filter][0])}` : ""}.</span><button type="button" className="btn out" onClick={() => { setQuery(""); setFilter("todas") }}>Limpiar búsqueda</button></div></div>
    return (
      <div className="list" role="listbox" aria-label="Solicitudes web">
        {open.length > 0 && <div className="gh" role="presentation">Por atender . {open.length}</div>}{open.map(row)}
        {closed.length > 0 && <div className="gh" role="presentation">Cerradas . {closed.length}</div>}{closed.map(row)}
      </div>
    )
  })()

  const hint = (r: ServiceRequest) => conv(r) ? `Ya convertida en la orden ${orderCode(r)}: no se vuelve a convertir.`
    : { pendiente: "Siguiente paso: escríbele por WhatsApp y márcala como contactada.", contactado: "Ya contactada. Convierte a orden cuando el equipo esté en el taller.", recibido: "Recibida pero sin orden: conviértela para crear la orden técnica.", descartado: `Descartada: ${Q("Marcar como contactado")} no aplica. Reábrela desde ${Q("Más")}.` }[r.estado]
  const primary = (r: ServiceRequest) => conv(r) ? "exp" : r.estado === "pendiente" ? "contactar" : r.estado === "descartado" ? "" : "convertir"
  const bContactar = (r: ServiceRequest, p: string) => noConsent(r)
    ? <button type="button" className={`btn${p === "contactar" ? "" : " out"}`} onClick={() => setDlg("contactar")}>{I(MessageCircle)}Contactar</button>
    : <a className={`btn${p === "contactar" ? "" : " out"}`} href={waHref(r)} target="_blank" rel="noopener noreferrer">{I(MessageCircle)}Contactar</a>
  const bMarcar = (r: ServiceRequest) => r.estado === "pendiente"
    ? <button type="button" className="btn out" onClick={() => void setEstado(r, "contactado")}>{I(Check)}Marcar como contactado</button>
    : <button type="button" className="btn out" aria-disabled="true" aria-describedby={`why-${r.id_solicitud_servicio}`}>{I(Check)}Marcar como contactado</button>
  const bConvertir = (r: ServiceRequest, p: string) => conv(r)
    ? <button type="button" className="btn out" aria-disabled="true" aria-describedby={`why-${r.id_solicitud_servicio}`}>{I(FileCheck)}Ya convertida</button>
    : <button type="button" className={`btn${p === "convertir" ? "" : " out"}`} onClick={() => { setChk(false); setDlg("convertir") }}>{I(FileCheck)}Convertir a orden</button>
  const bExp = (r: ServiceRequest) => <Link className="btn" to={`/services/technical?orden=${r.id_orden_servicio}`}>{I(ExternalLink)}Abrir expediente {orderCode(r)}</Link>

  const masBtn = (r: ServiceRequest, mobile: boolean) => {
    if (conv(r)) return <button type="button" className="btn out sq" aria-disabled="true" aria-describedby={`why-${r.id_solicitud_servicio}`} aria-label="Más acciones, no disponibles: solicitud convertida">{I(MoreHorizontal, 18)}</button>
    const it = (to: Estado, t: string, Icon: LucideIcon) => <button type="button" role="menuitem" onClick={() => void setEstado(r, to)}>{I(Icon)}{t}</button>
    const e = r.estado
    return (
      <span className="hw" ref={menuRef} style={{ position: "relative" }}>
        <button type="button" className="btn out sq" aria-haspopup="menu" aria-expanded={menu} aria-label="Más acciones" onClick={() => setMenu(m => !m)}>{I(MoreHorizontal, 18)}</button>
        {menu && (
          <div className="menu" role="menu" style={{ right: 0, top: 48 }}>
            {mobile && e !== "contactado" && e !== "recibido" && e !== "descartado" && <><button type="button" role="menuitem" onClick={() => { setMenu(false); setChk(false); setDlg("convertir") }}>{I(FileCheck)}Convertir a orden...</button><hr /></>}
            <div className="g">Cambiar estado</div>
            {e === "contactado" && <>{it("recibido", "Marcar como Recibido", Inbox)}{it("pendiente", "Volver a Pendiente", RotateCcw)}</>}
            {e === "recibido" && <>{it("contactado", "Volver a Contactado", RotateCcw)}{it("pendiente", "Volver a Pendiente", RotateCcw)}</>}
            {e === "descartado" ? it("pendiente", "Reabrir como Pendiente", RotateCcw) : <><hr />{it("descartado", "Descartar solicitud", Ban)}</>}
          </div>
        )}
      </span>
    )
  }
  const exHead = (r: ServiceRequest, mobile: boolean) => {
    const e = r.estado, i = FLOW.indexOf(e), a = ago(r.creado_en)
    const segs = FLOW.map((k, j) => <i key={k} className={e !== "descartado" && j <= i ? "on" : ""} />)
    return (
      <div className="exh">
        <div className="r1"><h2>{r.codigo}</h2><Chip e={e} />{conv(r) && <span className="tag ok">{I(FileCheck, 14)}Convertida</span>}<span className="sp" />{!mobile && masBtn(r, false)}</div>
        <div className="r2">{r.cliente} . recibida el {dateTimeLima(r.creado_en)} . {a.t}</div>
        {noConsent(r) && <div className="why" role="note">{I(ShieldAlert)}<span>Sin consentimiento de contacto. Puedes contactar igual; se pedirá confirmar antes de escribir.</span></div>}
        <div>
          <div className="fl" aria-hidden="true">{segs}</div>
          <div className="fc">{e === "descartado" ? <><span><b>Descartado</b> . flujo cerrado</span><span>Reábrela desde {Q("Más")}</span></> : <><span>Paso {i + 1} de 3 . <b>{ST[e][0]}</b></span><span>{conv(r) ? <>Orden <b>{orderCode(r)}</b></> : "Sin orden técnica aún"}</span></>}</div>
        </div>
      </div>
    )
  }
  const dt = (k: string, v: React.ReactNode, x = "") => <div className={x}><dt>{k}</dt><dd>{v}</dd></div>
  const body = (r: ServiceRequest) => (
    <div className="exb">
      <dl className="dl">
        {dt("Falla", r.falla, "full big")}{dt("Equipo", `${r.tipo_equipo}${r.marca_modelo ? ` . ${r.marca_modelo}` : ""}`)}{dt("Teléfono", tel(r.telefono))}
        {dt("Correo", r.email || <span className="mut">No registrado</span>)}{dt("Disponibilidad", r.disponibilidad || <span className="mut">No indicada</span>)}
        {dt("Consentimiento de contacto", noConsent(r) ? <span className="st warn">{I(ShieldAlert, 14)}No otorgado</span> : <span className="st neu">{I(ShieldCheck, 14)}Otorgado</span>)}
        {dt("Recibida", dateTimeLima(r.creado_en))}
      </dl>
      <div className="note">
        <label className="fld"><span>Nota interna</span><textarea className="ta" value={nota} onChange={e => setNota(e.target.value)} /></label>
        <button type="button" className="btn out" disabled={nota === (r.notas_admin || "")} onClick={() => void saveNote(r)}>Guardar nota</button>
      </div>
    </div>
  )
  const detail = (r: ServiceRequest) => {
    const p = primary(r)
    return (
      <section className="card ex" aria-label={`Detalle de ${r.codigo}`}>
        {exHead(r, false)}
        <div className="acts" role="group" aria-label="Acciones en el orden del flujo">{bContactar(r, p)}{bMarcar(r)}{bConvertir(r, p)}{conv(r) && bExp(r)}</div>
        <p className="ahint" id={`why-${r.id_solicitud_servicio}`}>{hint(r)}</p>
        {body(r)}
      </section>
    )
  }

  const nuevo = <Link className="btn out" to="/services/intake">{I(Plus)}Nuevo ingreso</Link>
  const head = <>{hd}<div className="fl1">{mob ? <>{search}{chips}</> : <>{chips}{search}</>}</div></>
  const exScreen = mob && mobEx && sel
  const p = sel ? primary(sel) : ""

  return (
    <div className={`pg-tweb${!mob || exScreen ? " fx" : ""}`} ref={host}>
      {exScreen && sel ? (
        <>
          <div className="mscr">
            <h1 className="sr">Solicitudes web</h1>
            <div className="mtop"><button type="button" className="btn out" onClick={() => setMobEx(false)}>{I(ArrowLeft)}Volver</button><span className="mut">Solicitudes web</span><span className="sp" />{masBtn(sel, true)}</div>
            <section className="card ex" aria-label={`Detalle de ${sel.codigo}`}>
              {exHead(sel, true)}
              <p className="ahint" id={`why-${sel.id_solicitud_servicio}`} style={{ paddingTop: 10, borderTop: "1px solid hsl(var(--border))" }}>{hint(sel)}</p>
              {body(sel)}
            </section>
          </div>
          <div className="mbar">{bContactar(sel, p)}{p === "contactar" ? bMarcar(sel) : p === "exp" ? bExp(sel) : bConvertir(sel, p)}</div>
        </>
      ) : (
        <div className="pg">
          {head}
          {status === "error" ? (
            <div className="card" style={{ flex: 1, display: "flex" }}><div className="empty" role="alert">{I(TriangleAlert, 28)}<h3>No se pudieron cargar las solicitudes</h3><span>Revisa tu conexión e inténtalo de nuevo.</span><button type="button" className="btn" onClick={() => { setStatus("load"); void load() }}>{I(RefreshCw)}Reintentar</button></div></div>
          ) : status === "ok" && !items.length ? (
            <div className="card" style={{ flex: 1, display: "flex" }}><div className="empty">{I(Inbox, 28)}<h3>Aún no hay solicitudes</h3><span>Cada vez que un cliente llene el formulario público de {Q("Servicio técnico")} aparecerá aquí una pre-solicitud.</span>{nuevo}</div></div>
          ) : (
            <div className="md">
              <div className="lc">{listEl}</div>
              {!mob && (status === "load"
                ? <section className="card ex" aria-hidden="true"><div className="exh" style={{ gap: 12 }}><span className="sk" style={{ width: "34%", height: 22 }} /><span className="sk" style={{ width: "60%" }} /></div></section>
                : sel ? detail(sel) : <section className="card ex"><div className="empty">{I(Inbox, 28)}<h3>Ninguna solicitud seleccionada</h3><span>Elige una solicitud de la lista para ver su detalle.</span></div></section>)}
            </div>
          )}
        </div>
      )}

      {sel && dlg === "convertir" && (
        <ErpDialog open onOpenChange={o => { if (!o) setDlg(null) }} title={`Convertir a orden . ${sel.codigo}`}>
          <div className="pg-tweb"><div className="dlg" style={{ border: 0, padding: 0, maxWidth: "none", marginTop: 12 }}>
            <div className="cons"><b>Qué pasa:</b> se crea una orden técnica en estado {Q("Recibido")} con los datos de abajo y la solicitud queda enlazada a ella y marcada {Q("Convertida")}.<br /><b>No se puede repetir:</b> una solicitud convertida no vuelve a convertirse.</div>
            <dl className="sum"><dt>Cliente</dt><dd>{sel.cliente}</dd><dt>Teléfono</dt><dd className="num">{tel(sel.telefono)}</dd><dt>Equipo</dt><dd>{sel.tipo_equipo}{sel.marca_modelo ? ` . ${sel.marca_modelo}` : ""}</dd><dt>Falla</dt><dd>{sel.falla}</dd></dl>
            <button type="button" className="sw" role="switch" aria-checked={chk} onClick={() => setChk(c => !c)}><span className="tr" /><span>Confirmo que el equipo ya está físicamente en el taller</span></button>
            <span className="hint" id="h-conv">{chk ? "Listo para convertir." : `Marca la confirmación para habilitar ${Q("Convertir a orden")}.`}</span>
            <div className="ft"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn" aria-disabled={!chk || busy} aria-describedby="h-conv" onClick={() => { if (chk && !busy) void convertir(sel) }}>Convertir a orden</button></div>
          </div></div>
        </ErpDialog>
      )}
      {sel && dlg === "contactar" && (
        <ErpDialog open onOpenChange={o => { if (!o) setDlg(null) }} title="Contactar sin consentimiento">
          <div className="pg-tweb"><div className="dlg" style={{ border: 0, padding: 0, maxWidth: "none", marginTop: 12 }}>
            <div className="cons"><b>{sel.cliente}</b> no dio consentimiento de contacto. El sistema no bloquea el mensaje, pero confirma que es necesario antes de escribirle. Se abrirá WhatsApp en una pestaña nueva; el estado no cambia.</div>
            <div className="ft"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><a className="btn" href={waHref(sel)} target="_blank" rel="noopener noreferrer" onClick={() => setDlg(null)}>{I(MessageCircle)}Abrir WhatsApp</a></div>
          </div></div>
        </ErpDialog>
      )}
    </div>
  )
}
