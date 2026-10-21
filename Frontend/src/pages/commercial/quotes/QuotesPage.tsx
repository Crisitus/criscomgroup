import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronLeft, Plus } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { useDocumentTitle } from "../../../hooks/useDocumentTitle"
import { QuoteList, visibleQuotes, type Filter } from "./QuoteList"
import { QuoteDetail } from "./QuoteDetail"
import { actionsFor } from "./QuoteActions"
import { ConvertDialog, RejectDialog } from "./QuoteDialogs"
import { QuoteForm } from "./QuoteForm"
import { ES, I, errMsg, phone, waText, waUrl, type Estado, type Quote, type StockProduct } from "./quotesShared"
import "../../../styles/cotizaciones.css"

type Status = "load" | "ok" | "error"

export default function QuotesPage() {
  useDocumentTitle("Cotizaciones")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [products, setProducts] = useState<StockProduct[]>([])
  const [status, setStatus] = useState<Status>("load")
  const [filter, setFilter] = useState<Filter>("abiertas")
  const [search, setSearch] = useState("")
  const [selId, setSelId] = useState<number | null>(null)
  const [screen, setScreen] = useState<"list" | "det">("list")
  const [creating, setCreating] = useState(false)
  const [dlg, setDlg] = useState<"conv" | "rech" | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: number | null; text: string } | null>(null)
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  const load = useCallback(async () => {
    const [d, q] = await Promise.allSettled([commercialApi.dashboard(), commercialApi.quotes()])
    if (d.status === "fulfilled") setProducts(d.value.products || [])
    else toast.error(errMsg((d as PromiseRejectedResult).reason, "No se pudo cargar el inventario de productos"))
    if (q.status === "fulfilled") { setQuotes(q.value); setStatus("ok") } else setStatus("error")
  }, [])
  useEffect(() => { void load() }, [load])
  const retry = () => { setStatus("load"); void load() }

  const rows = visibleQuotes(quotes, filter, search)
  const sel = quotes.find(q => q.id_cotizacion === selId) || (!mob ? rows[0] : undefined) || null
  const open = (id: number) => { setSelId(id); setScreen("det"); setFlash(f => (f && f.id === id ? f : null)) }

  const act = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setFlash(null)
    try { await fn() } finally { setBusy(false) }
  }
  const toState = (q: Quote, e: Estado) => act(async () => {
    try {
      await commercialApi.quoteStatus(q.id_cotizacion, e)
      toast.success(`${q.numero} marcada como ${ES[e].toLowerCase()}`)
    } catch (err) { toast.error(errMsg(err, "No se pudo cambiar el estado")) }
    await load()
  })
  const whatsapp = (q: Quote) => {
    if (!phone(q.cliente_telefono || "")) return toast.error("Agrega un WhatsApp válido: celular peruano de 9 dígitos o número con código de país")
    const pop = window.open(waUrl(q.cliente_telefono || "", waText(q)), "_blank")
    if (!pop) return toast.error("Permite ventanas emergentes para abrir WhatsApp")
    pop.opener = null
    if (q.estado === "borrador") void toState(q, "enviada")
    else toast.success("WhatsApp abierto con la cotización preparada")
  }

  const h = { busy, onWa: whatsapp, onConvert: () => setDlg("conv"), onReject: () => setDlg("rech"), onTo: (e: Estado) => sel && void toState(sel, e) }
  const actions = sel ? actionsFor(sel, h, "why-act") : null
  const detail = sel && actions ? <QuoteDetail q={sel} mob={mob} actions={actions} msg={flash && flash.id === sel.id_cotizacion ? flash.text : null} /> : null
  const empty = <div className="card" style={{ flex: 1, display: "flex" }}><div className="empty" role="status"><h3>Elige una cotización</h3></div></div>
  const newBtn = <button type="button" className="btn" onClick={() => setCreating(true)}>{I(Plus, 16)}Nueva cotización</button>

  const dialogs = sel && (
    <>
      {dlg === "conv" && <ConvertDialog q={sel} products={products} onClose={() => setDlg(null)} onDone={vid => {
        setDlg(null); setFlash({ id: sel.id_cotizacion, text: `Venta #${vid} creada y stock descontado.` }); toast.success(`${sel.numero} convertida en la venta #${vid}`); void load()
      }} />}
      {dlg === "rech" && <RejectDialog q={sel} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setFlash(null); toast.success(`${sel.numero} rechazada`); void load() }} />}
    </>
  )

  if (creating) return (
    <div className={`pg-cotiz ${mob ? "fx" : "bd"}`} ref={host}>
      <QuoteForm products={products} onCancel={() => setCreating(false)} onSaved={(q, sent) => {
        setCreating(false); setSelId(q.id_cotizacion); setScreen("det"); setFilter("abiertas"); setSearch("")
        setFlash({ id: q.id_cotizacion, text: sent ? `${q.numero} guardada como enviada y WhatsApp abierto.` : `${q.numero} guardada como borrador.` })
        toast.success(`Cotización ${q.numero} creada`); void load()
      }} />
    </div>
  )
  if (mob && screen === "det" && sel && actions) return (
    <div className="pg-cotiz fx" ref={host}>
      <div className="mscr">
        <div className="mtop"><button type="button" className="btn out" onClick={() => setScreen("list")}>{I(ChevronLeft, 16)}Cotizaciones</button></div>
        {detail}
      </div>
      {actions.p && <div className="mbar">{actions.p}</div>}
      {dialogs}
    </div>
  )
  return (
    <div className={`pg-cotiz${mob ? "" : " bd"}`} ref={host}>
      <div className="pg">
        <div className="hd"><h1>Cotizaciones</h1><div className="ac">{newBtn}</div></div>
        <div className={mob ? undefined : "md"}>
          <QuoteList quotes={quotes} status={status} filter={filter} search={search} selId={mob ? null : sel?.id_cotizacion ?? null}
            onFilter={setFilter} onSearch={setSearch} onOpen={open} onRetry={retry} onNew={() => setCreating(true)} />
          {!mob && (status === "ok" && detail ? detail : empty)}
        </div>
      </div>
      {!mob && dialogs}
    </div>
  )
}
