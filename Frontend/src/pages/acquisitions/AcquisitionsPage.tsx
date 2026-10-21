import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ArrowDownToLine, ChevronLeft, ChevronRight, CircleAlert, Inbox, Plus, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import { listAcquisitions, updateAcquisition, type Acquisition } from "../../services/acquisitionService"
import { fetchProducts, type Product } from "../../services/productService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { norm } from "../../components/erp/format"
import { COMP, Q, FILTERS, I, PruebaChip, SEP, StkChip, TIPO, errMsg, fd, gl, sol, type Filter } from "./acqShared"
import { AcqDetail, bandParts } from "./AcqDetail"
import { AcqWizard } from "./AcqWizard"
import { IngresarDialog } from "./AcqDialogs"
import "../../styles/adquisiciones.css"

const TITLE = "Adquisiciones de segunda mano"
const nameOf = (a: Acquisition) => [a.marca, a.modelo].filter(Boolean).join(" ") || COMP[a.tipo_componente]

export default function AcquisitionsPage() {
  useDocumentTitle(TITLE)
  const [items, setItems] = useState<Acquisition[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [filter, setFilter] = useState<Filter>("todos")
  const [q, setQ] = useState("")
  const [selId, setSelId] = useState<number | null>(null)
  const [mobEx, setMobEx] = useState(false)
  const [form, setForm] = useState(false)
  const [dlg, setDlg] = useState(false)
  const [dlgErr, setDlgErr] = useState("")
  const [busy, setBusy] = useState(false)
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
    try { setItems(await listAcquisitions()); setStatus("ok") } catch { setStatus("error"); toast.error("No se pudieron cargar las adquisiciones") }
  }, [])
  const loadProducts = useCallback(() => { fetchProducts().then(setProducts).catch(() => toast.error("No se pudo cargar el inventario de productos")) }, [])
  useEffect(() => { void load(); loadProducts() }, [load, loadProducts])

  const sorted = useMemo(() => [...items].sort((x, y) => y.fecha_adquisicion.localeCompare(x.fecha_adquisicion)), [items])
  const fn = FILTERS.find(x => x[0] === filter)![2]
  const list = useMemo(() => {
    const t = norm(q.trim())
    return sorted.filter(fn).filter(a => !t || norm(`${a.marca ?? ""} ${a.modelo ?? ""} ${a.numero_serie} ${a.transferente_nombre}`).includes(t))
  }, [sorted, fn, q])
  const sel = list.find(a => a.id_adquisicion === selId) || null
  useEffect(() => { if (!mob && status === "ok" && !sel && list[0]) setSelId(list[0].id_adquisicion) }, [mob, status, sel, list])

  const ingresar = async (a: Acquisition, productoId: number) => {
    setBusy(true); setDlgErr("")
    try {
      await updateAcquisition(a.id_adquisicion, { producto_id: productoId, registrar_inventario: true })
      toast.success(`Expediente #${a.id_adquisicion} ingresado al stock`)
      setDlg(false)
      await load(); loadProducts()
    } catch (e) { setDlgErr(errMsg(e, "No se pudo ingresar al stock")) } finally { setBusy(false) }
  }
  const pick = (id: number) => { setSelId(id); if (mob) setMobEx(true) }
  const open = () => { setDlgErr(""); setDlg(true) }

  const hd = (
    <div className="hd"><h1>{TITLE}</h1><div className="ac"><button type="button" className="btn" onClick={() => setForm(true)}>{I(Plus)}Nuevo expediente</button></div></div>
  )
  const row = (a: Acquisition) => (
    <button type="button" className="rw2" role="option" key={a.id_adquisicion} aria-selected={selId === a.id_adquisicion} onClick={() => pick(a.id_adquisicion)}>
      <span className="rb">
        <span className="l1"><b>{nameOf(a)}</b><span className="mon num">{sol(a.monto_adquisicion)}</span></span>
        <span className="l2">{a.numero_serie}{SEP}{a.transferente_nombre}</span>
        <span className="l3"><span className="tag">{TIPO[a.tipo_operacion]}</span><PruebaChip p={a.prueba_funcional} s={14} /><span className="tag">{a.grado_evaluacion ? `Grado ${gl(a.grado_evaluacion)}` : "Sin grado"}</span></span>
        <span className="l4"><span className="sk"><StkChip a={a} />{a.producto && <span className="pn2">{SEP.trim()} {a.producto.nombre}</span>}</span><span className="num">{fd(a.fecha_adquisicion)}</span></span>
      </span>
      {I(ChevronRight, 16, "ch")}
    </button>
  )
  const chips = (
    <div className="chips" role="group" aria-label="Filtros">
      {FILTERS.map(([k, l, f]) => <button type="button" key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l} <b>{status === "ok" ? items.filter(f).length : "-"}</b></button>)}
    </div>
  )
  const skel = <div className="skr"><div className="sk1" style={{ width: "60%" }} /><div className="sk1" style={{ width: "85%" }} /><div className="sk1" style={{ width: "45%" }} /></div>
  const lc = (
    <div className="lc">
      <div className="srch" role="search">{I(Search)}<input className="in" type="search" aria-label="Buscar por equipo, serie o transferente" placeholder="Buscar por equipo, serie o transferente" value={q} onChange={e => setQ(e.target.value)} /></div>
      {chips}
      <div className="list" role="listbox" aria-label="Expedientes" aria-busy={status === "load"}>
        {status === "load" ? <>{skel}{skel}{skel}{skel}</> : list.length ? list.map(row) : <div className="emp" style={{ minHeight: 160 }}><b>Sin expedientes</b><span>Prueba con otro filtro o búsqueda.</span></div>}
      </div>
    </div>
  )
  const empty = (icon: React.ReactNode, t: string, s: string, extra?: React.ReactNode, role?: string) => <div className="card emp" role={role}>{icon}<b>{t}</b><span>{s}</span>{extra}</div>

  let content: React.ReactNode
  if (status === "error") content = empty(I(CircleAlert, 32, "big"), "No se pudo cargar el listado", "Revisa tu conexión e inténtalo de nuevo.", <button type="button" className="btn out" onClick={() => { setStatus("load"); void load() }}>{I(RefreshCw)}Reintentar</button>, "alert")
  else if (status === "ok" && !items.length) content = empty(I(Inbox, 32, "big"), "Aún no hay expedientes de adquisición", `Usa ${Q("Nuevo expediente")} para registrar el primero.`)
  else if (mob) content = lc
  else content = <div className="md">{lc}{sel ? <AcqDetail a={sel} mob={false} onOpen={open} /> : empty(I(ArrowDownToLine, 32, "big"), "Elige un expediente de la bandeja", "Verás su evaluación, el transferente y si ya ingresó al stock.")}</div>

  const exScreen = mob && mobEx && sel
  const fx = !mob || !!exScreen || form
  return (
    <div className={`pg-adquisiciones${fx ? " fx" : ""}`} ref={host}>
      {form ? (
        <AcqWizard products={products} mob={mob} onCancel={() => setForm(false)}
          onSaved={id => { setForm(false); setFilter("todos"); setQ(""); void load().then(() => { setSelId(id); loadProducts() }) }} />
      ) : exScreen && sel ? (
        <div className="pg">
          <div className="hd"><button type="button" className="btn out sq" onClick={() => setMobEx(false)} aria-label="Volver a la lista">{I(ChevronLeft, 18)}</button><h1>{nameOf(sel)}</h1></div>
          <AcqDetail a={sel} mob onOpen={open} />
          {bandParts(sel, open).btn && <div className="ftb fx">{bandParts(sel, open).btn}</div>}
        </div>
      ) : <div className="pg">{hd}{content}</div>}
      {sel && dlg && <IngresarDialog a={sel} products={products} busy={busy} error={dlgErr} onClose={() => setDlg(false)} onConfirm={pid => { void ingresar(sel, pid) }} />}
    </div>
  )
}
