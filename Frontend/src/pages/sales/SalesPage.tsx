"use client"

import "../../styles/historial.css"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { toast } from "sonner"
import { Ban, Calendar, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleX, Clock, CreditCard, Ellipsis, Eye, FileText, Loader, Plus, Printer, Search, SearchX, Send, ShoppingCart, SlidersHorizontal, Trash2, TriangleAlert, X } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import TicketViewer from "../../components/ticket-viewer"
import { addDays, dateTimeLima, limaDate, longDate, money, norm, todayLima } from "../../components/erp/format"
import { confirmPosPayment, deleteSale, emitElectronicDocument, fetchSaleById, fetchSales, generateSaleTicket, type Sale } from "../../services/saleService"

const stroke = { strokeWidth: 1.75, "aria-hidden": true } as const
type Tone = "ok" | "warn" | "bad" | "neu"
const TIPO: Record<string, string> = { "0": "Nota de venta", "1": "Factura", "3": "Boleta" }
const METODO: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia", pago_link: "Pago por link" }
const CANAL: Record<string, string> = { pos: "POS", qr: "QR", link: "Link" }
const EST: Record<string, { c: Tone; i: typeof Clock; l: string; s: string }> = {
  sin_emitir: { c: "neu", i: FileText, l: "Nota de venta", s: "No va a SUNAT" },
  aceptado: { c: "ok", i: CircleCheck, l: "Aceptado", s: "SUNAT aceptó" },
  pendiente: { c: "warn", i: Clock, l: "Pendiente", s: "Aún sin enviar" },
  rechazado: { c: "bad", i: CircleX, l: "Rechazado", s: "SUNAT rechazó" },
  error: { c: "bad", i: TriangleAlert, l: "Error", s: "Falla técnica" },
}
const POS: Record<string, { c: Tone; i: typeof Clock; l: string }> = {
  pendiente_confirmacion: { c: "warn", i: Clock, l: "Pago pendiente" },
  confirmado: { c: "ok", i: CircleCheck, l: "Confirmado" },
  anulado: { c: "neu", i: Ban, l: "Anulado" },
}
const real = (v: Sale) => Math.round((Number(v.total_con_igv) - (v.es_descuento && v.descuento ? Number(v.descuento) : 0)) * 100) / 100
const nro = (v: Sale) => (v.serie && v.correlativo ? `${v.serie}-${String(v.correlativo).padStart(8, "0")}` : `#${v.venta_id}`)
const estadoOf = (v: Sale) => v.estado_comprobante ?? (v.tipo_documento === "0" || !v.tipo_documento ? "sin_emitir" : v.comprobante_emitido ? "aceptado" : "pendiente")
const isPending = (v: Sale) => v.pago_pos?.estado === "pendiente_confirmacion"
const isProblem = (v: Sale) => (v.tipo_documento === "1" || v.tipo_documento === "3") && estadoOf(v) !== "aceptado"
const docText = (v: Sale) => (v.cliente_nombre ? `${v.cliente_tipo_documento === "6" ? "RUC" : "DNI"} ${v.cliente_numero_documento ?? ""}` : "")

const Status = ({ tone, icon: Icon, label }: { tone: Tone; icon: typeof Clock; label: string }) => <span className={`st ${tone}`}><Icon size={14} {...stroke} />{label}</span>
const PRESETS = ["Hoy", "7 días", "Este mes"] as const
const TIPOS = ["Todos los tipos", "Nota de venta", "Boleta", "Factura"]
const METS = ["Todos los métodos", ...Object.values(METODO)]

type Dlg = { kind: "conf" | "del"; sale: Sale; items?: number } | null

export default function SalesPage() {
  useDocumentTitle("Historial de ventas")
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isManager = user?.id_role === 1
  const { data: sales = [], isLoading } = useQuery({ queryKey: ["sales"], queryFn: fetchSales })

  const [q, setQ] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [preset, setPreset] = useState<string | null>(null)
  const [tipo, setTipo] = useState(TIPOS[0])
  const [metodo, setMetodo] = useState(METS[0])
  const [chip, setChip] = useState<"pagos" | "prob" | null>(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [menu, setMenu] = useState<number | null>(null)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [sheet, setSheet] = useState(false)
  const [sending, setSending] = useState<number[]>([])
  const [ticket, setTicket] = useState<{ html: string; title: string } | null>(null)

  const applyPreset = (p: string) => {
    const today = todayLima()
    setPreset(p); setPage(1)
    if (p === "Hoy") { setFrom(today); setTo(today) }
    else if (p === "7 días") { setFrom(addDays(today, -6)); setTo(today) }
    else { setFrom(`${today.slice(0, 8)}01`); setTo(today) }
  }
  const clearFilters = () => { setQ(""); setFrom(""); setTo(""); setPreset(null); setTipo(TIPOS[0]); setMetodo(METS[0]); setChip(null); setPage(1) }
  const dirty = !!(q || from || to || tipo !== TIPOS[0] || metodo !== METS[0] || chip)

  const all = useMemo(() => [...sales].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), [sales])
  const filtered = useMemo(() => all.filter(v => {
    const day = limaDate(v.fecha)
    if (from && day < from) return false
    if (to && day > to) return false
    if (tipo !== TIPOS[0] && TIPO[v.tipo_documento ?? "0"] !== tipo) return false
    if (metodo !== METS[0] && METODO[v.metodo_pago] !== metodo) return false
    if (chip === "pagos" && !isPending(v)) return false
    if (chip === "prob" && !isProblem(v)) return false
    if (q) { const hay = [nro(v), String(v.venta_id), v.cliente_nombre ?? "", v.cliente_numero_documento ?? "", v.observaciones ?? ""].some(s => norm(s).includes(norm(q))); if (!hay) return false }
    return true
  }), [all, q, from, to, tipo, metodo, chip])

  const kpi = useMemo(() => {
    const sum = (f: (v: Sale) => number) => Math.round(filtered.reduce((s, v) => s + f(v), 0) * 100) / 100
    const prob = filtered.filter(isProblem).length, pagos = isManager ? filtered.filter(isPending).length : 0
    return {
      n: filtered.length,
      sn: `${filtered.filter(v => v.tipo_documento === "0").length} notas · ${filtered.filter(v => v.tipo_documento === "3").length} boletas · ${filtered.filter(v => v.tipo_documento === "1").length} facturas`,
      fin: sum(real), desc: sum(v => (v.es_descuento && v.descuento ? Number(v.descuento) : 0)), gen: sum(v => Number(v.total_con_igv)),
      pagos, prob, rev: pagos + prob,
    }
  }, [filtered, isManager])
  const pagosAll = isManager ? all.filter(isPending).length : 0
  const probAll = all.filter(isProblem).length

  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * size, current * size)
  const filterCount = [from || to, tipo !== TIPOS[0], metodo !== METS[0]].filter(Boolean).length

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sales"] })
  const confirm = useMutation({ mutationFn: (id: number) => confirmPosPayment(id), onSuccess: () => { toast.success("Pago confirmado"); void refresh() }, onError: () => toast.error("No se pudo confirmar el pago") })
  const remove = useMutation({ mutationFn: (id: number) => deleteSale(id), onSuccess: () => { toast.success("Venta eliminada"); void refresh() }, onError: (e: Error) => toast.error(e.message || "No se pudo eliminar la venta") })

  const resend = async (v: Sale) => {
    setSending(s => [...s, v.venta_id])
    try {
      const r = await emitElectronicDocument(v.venta_id)
      toast.success(r.sandbox ? `${nro(v)}: validado en sandbox (no se envió a SUNAT)` : `${nro(v)} aceptado por SUNAT`)
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(`${nro(v)} no se pudo enviar`, { description: message || "Intenta de nuevo." })
    } finally { setSending(s => s.filter(x => x !== v.venta_id)); void refresh() }
  }
  const printTicket = async (v: Sale) => {
    try { const r = await generateSaleTicket(v.venta_id); setTicket({ html: r.html, title: `Ticket ${nro(v)}` }) } catch { toast.error("No se pudo generar el ticket") }
  }
  const askDelete = async (v: Sale) => {
    setDlg({ kind: "del", sale: v })
    try { const full = await fetchSaleById(v.venta_id); setDlg(d => (d && d.sale.venta_id === v.venta_id ? { ...d, items: (full.detalles ?? []).reduce((s, x) => s + x.cantidad, 0) } : d)) } catch { /* se muestra sin conteo */ }
  }

  const primary = (v: Sale): { k: "conf" | "snd" | "ver"; l: string } =>
    isPending(v) && isManager ? { k: "conf", l: "Confirmar pago" } : isProblem(v) ? { k: "snd", l: "Reenviar a SUNAT" } : { k: "ver", l: "Ver" }
  const run = (v: Sale, k: "conf" | "snd" | "ver" | "tic" | "del") => {
    setMenu(null)
    if (k === "ver") navigate(`/sales/${v.venta_id}`)
    else if (k === "conf") setDlg({ kind: "conf", sale: v })
    else if (k === "snd") void resend(v)
    else if (k === "tic") void printTicket(v)
    else void askDelete(v)
  }
  const PrimaryBtn = ({ v }: { v: Sale }) => {
    if (sending.includes(v.venta_id)) return <button type="button" className="btn sm" aria-disabled="true" aria-busy="true"><Loader size={16} className="spin" {...stroke} />Enviando…</button>
    const a = primary(v)
    return <button type="button" className={`btn sm ${a.k === "ver" ? "out" : "rp"}`} aria-label={`${a.l} ${nro(v)}`} onClick={e => { e.stopPropagation(); run(v, a.k) }}>{a.l}</button>
  }
  const MoreMenu = ({ v, up }: { v: Sale; up?: boolean }) => (
    <>
      <button type="button" className="ib" aria-label={`Más acciones de ${nro(v)}`} aria-haspopup="menu" aria-expanded={menu === v.venta_id} onClick={e => { e.stopPropagation(); setMenu(menu === v.venta_id ? null : v.venta_id) }}><Ellipsis size={20} {...stroke} /></button>
      {menu === v.venta_id && (
        <div className="menu" role="menu" aria-label={`Acciones de ${nro(v)}`} style={up ? { top: "auto", bottom: "calc(100% + 4px)" } : undefined}>
          <button type="button" className="mi" role="menuitem" onClick={() => run(v, "ver")}><Eye size={18} {...stroke} />Ver detalle</button>
          <button type="button" className="mi" role="menuitem" onClick={() => run(v, "tic")}><Printer size={18} {...stroke} />Imprimir ticket</button>
          {isProblem(v) && primary(v).k !== "snd" && <button type="button" className="mi" role="menuitem" onClick={() => run(v, "snd")}><Send size={18} {...stroke} />Reenviar a SUNAT</button>}
          {isManager && <><hr /><button type="button" className="mi del" role="menuitem" onClick={() => run(v, "del")}><Trash2 size={18} {...stroke} />Eliminar venta</button></>}
        </div>
      )}
    </>
  )

  const pager = (
    <div className="pg1">
      <button type="button" className="pb" aria-label="Página anterior" aria-disabled={current === 1} onClick={() => current > 1 && setPage(current - 1)}><ChevronLeft size={18} {...stroke} /></button>
      {[...new Set([1, 2, 3, pages].filter(n => n <= pages))].map((n, i, arr) => (
        <span key={n} style={{ display: "contents" }}>{i > 0 && n - arr[i - 1] > 1 && <span className="mut" aria-hidden="true">…</span>}<button type="button" className="pb num" aria-current={n === current ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => setPage(n)}>{n}</button></span>
      ))}
      <button type="button" className="pb" aria-label="Página siguiente" aria-disabled={current === pages} onClick={() => current < pages && setPage(current + 1)}><ChevronRight size={18} {...stroke} /></button>
    </div>
  )
  const rowsSelect = (
    <label className="rt"><span>Filas por página</span><span className="sel" style={{ width: 84 }}><select aria-label="Filas por página" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1) }}><option>25</option><option>50</option><option>100</option></select><ChevronDown className="ic" size={18} {...stroke} /></span></label>
  )
  const foot = <div className="pgf"><span className="num">Mostrando {filtered.length ? (current - 1) * size + 1 : 0}–{(current - 1) * size + rows.length} de {filtered.length}</span><div className="rt">{rowsSelect}{pager}</div></div>

  const ctx = chip === "pagos"
    ? <><Clock size={16} {...stroke} /><span><b>{pagosAll} pagos</b> con tarjeta, Yape o Plin registrados, pendientes de confirmar.</span></>
    : chip === "prob"
      ? <><TriangleAlert size={16} {...stroke} /><span><b>{probAll} comprobantes</b> por reenviar a SUNAT: {all.filter(v => isProblem(v) && estadoOf(v) === "error").length} con error · {all.filter(v => isProblem(v) && estadoOf(v) === "rechazado").length} rechazados · {all.filter(v => isProblem(v) && estadoOf(v) === "pendiente").length} pendientes.</span></>
      : null

  const select = (value: string, options: string[], on: (v: string) => void, label: string, width: number) => (
    <span className="sel" style={{ width }}><select aria-label={label} value={value} onChange={e => { on(e.target.value); setPage(1) }}>{options.map(o => <option key={o}>{o}</option>)}</select><ChevronDown className="ic" size={18} {...stroke} /></span>
  )

  const filters = (
    <div className="fbar erp-only-desk" role="search">
      <label className="fld q"><Search size={18} {...stroke} /><input type="text" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar serie, número, cliente…" aria-label="Buscar por serie, correlativo, ID, cliente u observaciones" /></label>
      <label className="fld rng"><Calendar size={18} {...stroke} /><input type="text" readOnly value={from || to ? `${longDate(from || to)} – ${longDate(to || from)}` : ""} placeholder="dd/mm/aaaa – dd/mm/aaaa" aria-label="Rango de fechas, desde – hasta" onFocus={e => e.currentTarget.blur()} /></label>
      <div className="pres" role="group" aria-label="Rangos rápidos">{PRESETS.map(p => <button key={p} type="button" className="pre" aria-pressed={preset === p} onClick={() => applyPreset(p)}>{p}</button>)}</div>
      {select(tipo, TIPOS, setTipo, "Tipo de comprobante", 152)}
      {select(metodo, METS, setMetodo, "Método de pago", 172)}
    </div>
  )
  const mfilters = (
    <div className="fbar erp-only-mob" role="search">
      <label className="fld q" style={{ flexBasis: 180 }}><Search size={18} {...stroke} /><input type="text" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar venta o cliente" aria-label="Buscar por serie, correlativo, ID, cliente u observaciones" /></label>
      <button type="button" className="btn out" style={{ flex: "none" }} aria-haspopup="dialog" onClick={() => setSheet(true)}><SlidersHorizontal size={18} {...stroke} />Filtros{filterCount > 0 && <span className="badge">{filterCount}</span>}</button>
    </div>
  )

  return (
    <div className="pg-historial">
      <div className="pg" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="hd"><h1>Historial de ventas</h1><Link className="btn" to="/sales/new"><Plus size={18} {...stroke} />Nueva venta</Link></div>

        {isLoading ? (
          <div className="strip sk4" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="cell"><span className="skb" style={{ width: "46%", height: 12 }} /><span className="skb" style={{ width: "68%", height: 22 }} /></div>)}</div>
        ) : (
          <div className="strip">
            <div className="cell"><div className="r1">Ventas</div><div className="v num">{kpi.n}</div><div className="s">{kpi.sn}</div></div>
            <div className="cell"><div className="r1">Total vendido</div><div className="v num">{money(kpi.fin)}</div><div className="s">Con descuentos aplicados</div></div>
            <div className="cell"><div className="r1">Descuentos</div><div className="v num">{money(kpi.desc)}</div><div className="s">De {money(kpi.gen)} brutos</div></div>
            <button type="button" className="cell" style={{ textAlign: "left", background: "none", border: 0, borderLeft: "1px solid hsl(var(--border))", cursor: "pointer" }} onClick={() => { setChip(probAll >= pagosAll ? "prob" : "pagos"); setPage(1) }}><div className="r1"><span>Por revisar</span><span className="go"><b>Ver</b><ChevronRight size={16} {...stroke} /></span></div><div className="v num">{kpi.rev}</div><div className="s">{kpi.pagos} pagos · {kpi.prob} comprobantes</div></button>
          </div>
        )}

        <div className="chips" role="group" aria-label="Trabajo pendiente">
          {isManager && <button type="button" className="chp" aria-pressed={chip === "pagos"} aria-label={`Pagos por confirmar (${pagosAll})`} onClick={() => { setChip(chip === "pagos" ? null : "pagos"); setPage(1) }}><CreditCard size={18} {...stroke} />Pagos por confirmar<span className="n num">{pagosAll}</span></button>}
          <button type="button" className="chp" aria-pressed={chip === "prob"} aria-label={`Comprobantes con problema (${probAll})`} onClick={() => { setChip(chip === "prob" ? null : "prob"); setPage(1) }}><TriangleAlert size={18} {...stroke} />Comprobantes con problema<span className="n num">{probAll}</span></button>
          {dirty && <button type="button" className="btn out" onClick={clearFilters}>Limpiar filtros</button>}
        </div>
        {ctx && <div className="ctx">{ctx}</div>}

        {filters}{mfilters}

        {isLoading ? (
          <div className="tcard" aria-busy="true"><div className="empty" role="status"><p>Cargando ventas…</p></div></div>
        ) : !all.length ? (
          <div className="tcard"><div className="empty" role="status"><div className="ei"><ShoppingCart size={22} {...stroke} /></div><h2>Aún no hay ventas registradas</h2><p>Cuando registres la primera venta aparecerá aquí, con su comprobante y el estado de su pago.</p><Link className="btn out" to="/sales/new"><Plus size={18} {...stroke} />Registrar la primera venta</Link></div></div>
        ) : !filtered.length ? (
          <div className="tcard"><div className="empty" role="status"><div className="ei"><SearchX size={22} {...stroke} /></div><h2>{q ? `Sin resultados para «${q}»` : "Sin resultados"}</h2><p>No hay ventas que coincidan con la búsqueda. Revisa el nombre o el número, o quita algún filtro.</p><button type="button" className="btn out" onClick={clearFilters}>Limpiar filtros</button></div></div>
        ) : (
          <>
            <div className="tcard erp-only-desk">
              <table className="tb">
                <colgroup>{[108, 148, 244, 160, 156, 108].map((w, i) => <col key={i} style={{ width: w }} />)}<col /></colgroup>
                <thead><tr><th scope="col">Fecha y hora</th><th scope="col">Comprobante</th><th scope="col">Cliente</th><th scope="col">Pago</th><th scope="col">Estado del comprobante</th><th scope="col" className="r">Total</th><th scope="col" className="r">Acciones</th></tr></thead>
                <tbody>
                  {rows.map(v => {
                    const e = EST[estadoOf(v)], dt = dateTimeLima(v.fecha).split(" ")
                    const r = real(v), pos = v.pago_pos && POS[v.pago_pos.estado]
                    return (
                      <tr key={v.venta_id} className="rw" tabIndex={0} aria-label={`Abrir venta ${nro(v)}`} onClick={() => navigate(`/sales/${v.venta_id}`)} onKeyDown={ev => ev.key === "Enter" && navigate(`/sales/${v.venta_id}`)}>
                        <td><div className="stk"><span className="a num" style={{ fontWeight: 500 }}>{dt[0]}</span><span className="sub num">{dt.slice(1).join(" ")}</span></div></td>
                        <td><div className="stk"><span className="a num">{nro(v)}</span><span className="tag">{TIPO[v.tipo_documento ?? "0"]}</span></div></td>
                        <td>{v.cliente_nombre ? <div className="stk"><span className="nm">{v.cliente_nombre}</span><span className="sub num">{docText(v)}</span></div> : <span className="mut">Sin cliente</span>}</td>
                        <td><div className="stk"><span className="tag">{METODO[v.metodo_pago] ?? v.metodo_pago}</span>{pos && <Status tone={pos.c} icon={pos.i} label={pos.l} />}</div></td>
                        <td><div className="stk"><Status tone={e.c} icon={e.i} label={e.l} /><span className="sub">{e.s}</span></div></td>
                        <td className="r"><div className="stk rt"><span className="a num">{money(r)}</span>{v.es_descuento && v.descuento ? <span className="old num">{money(Number(v.total_con_igv))}</span> : null}</div></td>
                        <td><div className="ac"><PrimaryBtn v={v} /><MoreMenu v={v} /></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {foot}
            </div>
            <div className="erp-only-mob">
              <div className="mlist" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map(v => {
                  const e = EST[estadoOf(v)], dt = dateTimeLima(v.fecha).split(" "), r = real(v), pos = v.pago_pos && POS[v.pago_pos.estado]
                  return (
                    <article key={v.venta_id} className="mc" tabIndex={0} aria-label={`Abrir venta ${nro(v)}`} onClick={() => navigate(`/sales/${v.venta_id}`)}>
                      <div className="m1"><span className="a num">{nro(v)}</span><div className="tot"><b className="num">{money(r)}</b>{v.es_descuento && v.descuento ? <span className="old num">{money(Number(v.total_con_igv))}</span> : null}</div></div>
                      <div className="m2"><div>{v.cliente_nombre ? <><div className="nm">{v.cliente_nombre}</div><div className="num">{docText(v)}</div></> : <div className="nm mut" style={{ fontWeight: 400 }}>Sin cliente</div>}</div><span className="num" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{dt[0]}<br />{dt.slice(1).join(" ")}</span></div>
                      <div className="m3">{v.tipo_documento ? <span className="tag">{TIPO[v.tipo_documento]}</span> : null}<span className="tag">{METODO[v.metodo_pago] ?? v.metodo_pago}</span>{pos && <Status tone={pos.c} icon={pos.i} label={pos.l} />}<Status tone={e.c} icon={e.i} label={e.l} /></div>
                      <div className="m4"><PrimaryBtn v={v} /><MoreMenu v={v} up /></div>
                    </article>
                  )
                })}
              </div>
              <div className="mpg"><span className="num">Mostrando {(current - 1) * size + 1}–{(current - 1) * size + rows.length} de {filtered.length}</span><div className="rt">{rowsSelect}{pager}</div></div>
            </div>
          </>
        )}
      </div>

      <DialogPrimitive.Root open={!!dlg} onOpenChange={o => !o && setDlg(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="erp-scrim" />
          <DialogPrimitive.Content className="erp-dlg pg-dlg pg-historial" aria-describedby={undefined}>
            {dlg && dlg.kind === "del" && (
              <div className="dlg">
                <div className="dic bad"><Trash2 size={22} {...stroke} /></div>
                <DialogPrimitive.Title asChild><h3>Eliminar venta {nro(dlg.sale)}</h3></DialogPrimitive.Title>
                <p>Se devolverán <b>{dlg.items ?? "los"} productos</b> al stock y se perderá el registro de esta venta. También se restauran sus códigos de barras. Esta acción no se puede deshacer.</p>
                <dl className="dl"><div><dt>Cliente</dt><dd>{dlg.sale.cliente_nombre || "Sin cliente"}</dd></div><div><dt>Fecha</dt><dd className="num">{dateTimeLima(dlg.sale.fecha).replace(" ", " · ")}</dd></div><div className="big"><dt>Total</dt><dd className="num">{money(real(dlg.sale))}</dd></div></dl>
                <div className="acts"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn dng" disabled={remove.isPending} onClick={() => { remove.mutate(dlg.sale.venta_id); setDlg(null) }}>Eliminar venta</button></div>
              </div>
            )}
            {dlg && dlg.kind === "conf" && (
              <div className="dlg">
                <div className="dic"><CreditCard size={22} {...stroke} /></div>
                <DialogPrimitive.Title asChild><h3>Confirmar pago</h3></DialogPrimitive.Title>
                <p>Verifica en la app o en el terminal que el pago llegó antes de confirmarlo. La venta {nro(dlg.sale)} quedará con el pago <b>Confirmado</b>.</p>
                <dl className="dl"><div><dt>Método</dt><dd>{METODO[dlg.sale.metodo_pago]}</dd></div><div><dt>Canal</dt><dd>{CANAL[dlg.sale.pago_pos?.canal ?? "pos"]}</dd></div><div><dt>Adquirente</dt><dd>{dlg.sale.pago_pos?.adquirente?.nombre ?? "—"}</dd></div><div><dt>N.º de operación</dt><dd className="num">{dlg.sale.pago_pos?.numero_operacion}</dd></div><div className="big"><dt>Monto a confirmar</dt><dd className="num">{money(real(dlg.sale))}</dd></div></dl>
                <div className="acts"><button type="button" className="btn out" onClick={() => setDlg(null)}>Cancelar</button><button type="button" className="btn" disabled={confirm.isPending} onClick={() => { confirm.mutate(dlg.sale.venta_id); setDlg(null) }}>Confirmar pago</button></div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root open={sheet} onOpenChange={setSheet}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="erp-scrim" />
          <DialogPrimitive.Content className="pg-historial pg-sheet" aria-describedby={undefined}>
            <div className="sheet">
              <div className="sh"><DialogPrimitive.Title asChild><h3>Filtros</h3></DialogPrimitive.Title><button type="button" className="ib" aria-label="Cerrar filtros" onClick={() => setSheet(false)}><X size={20} {...stroke} /></button></div>
              <div className="grp"><div className="gl">Rango de fechas</div>
                <div className="row2"><label className="fld"><span>Desde</span><input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(null) }} aria-label="Desde" /></label><label className="fld"><span>Hasta</span><input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset(null) }} aria-label="Hasta" /></label></div>
                <div className="pres" role="group" aria-label="Rangos rápidos">{PRESETS.map(p => <button key={p} type="button" className="pre" aria-pressed={preset === p} onClick={() => applyPreset(p)}>{p}</button>)}</div></div>
              <div className="grp"><div className="gl">Tipo de comprobante</div><div className="opts">{TIPOS.map(t => <button key={t} type="button" className="chp" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t.replace("Todos los tipos", "Todos")}</button>)}</div></div>
              <div className="grp"><div className="gl">Método de pago</div><div className="opts">{METS.map(t => <button key={t} type="button" className="chp" aria-pressed={metodo === t} onClick={() => setMetodo(t)}>{t.replace("Todos los métodos", "Todos")}</button>)}</div></div>
              <div className="foot"><button type="button" className="btn out" onClick={clearFilters}>Limpiar</button><button type="button" className="btn" onClick={() => { setSheet(false); setPage(1) }}>Aplicar filtros</button></div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <TicketViewer isOpen={!!ticket} onClose={() => setTicket(null)} htmlContent={ticket?.html ?? ""} title={ticket?.title} documentType="Ticket" />
    </div>
  )
}

