import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, CircleAlert, Download, Inbox, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { deleteImport, listImports, updateImport, type ImportRecord } from "../../services/importService"
import { fetchProducts, type Product } from "../../services/productService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { Chip, ESTADOS, I, Llegada, NXT, ST, SEP, enSoles, errMsg, exportCsv, sol, toPayload, unit, uds, type Estado } from "./importsShared"
import { ImportDetail, MobileBar, type DetailActions } from "./ImportDetail"
import { ImportSheet } from "./ImportSheet"
import { ImportDialog, type DlgKind } from "./ImportDialogs"
import "../../styles/importaciones.css"

type Filter = "todas" | Estado
const Q = (s: string) => `\u00ab${s}\u00bb`

export default function ImportsPage() {
  useDocumentTitle("Compra por importación")
  const [items, setItems] = useState<ImportRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [filter, setFilter] = useState<Filter>("todas")
  const [selId, setSelId] = useState<number | null>(null)
  const [mobEx, setMobEx] = useState(false)
  const [sheet, setSheet] = useState<"nueva" | "editar" | null>(null)
  const [dlg, setDlg] = useState<DlgKind | null>(null)
  const [dlgMsg, setDlgMsg] = useState("")
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
    try { setItems(await listImports()); setStatus("ok") } catch { setStatus("error"); toast.error("No se pudieron cargar las importaciones") }
  }, [])
  const loadProducts = useCallback(() => { fetchProducts().then(setProducts).catch(() => toast.error("No se pudo cargar el inventario de productos")) }, [])
  useEffect(() => { void load(); loadProducts() }, [load, loadProducts])

  const cnt = (k: Filter) => (k === "todas" ? items.length : items.filter(o => o.estado === k).length)
  const list = useMemo(() => items.filter(o => filter === "todas" || o.estado === filter), [items, filter])
  const sel = list.find(o => o.id_importacion === selId) || null
  useEffect(() => { if (!mob && status === "ok" && !sel && list[0]) setSelId(list[0].id_importacion) }, [mob, status, sel, list])

  const put = async (o: ImportRecord, over: Record<string, unknown>, okMsg: string) => {
    setBusy(true)
    try {
      await updateImport(o.id_importacion, toPayload({ ...o, ...over }))
      toast.success(okMsg)
      setDlg(null)
      await load()
      return true
    } catch (e) { toast.error(errMsg(e, "No se pudo actualizar la importación")); return false } finally { setBusy(false) }
  }
  const remove = async (o: ImportRecord) => {
    setBusy(true)
    try {
      await deleteImport(o.id_importacion)
      toast.success(`Importación ${o.referencia} eliminada`)
      setDlg(null); setSelId(null); setMobEx(false)
      await load()
    } catch (e) {
      const st = (e as { response?: { status?: number } }).response?.status
      if (st === 409) { setDlgMsg(errMsg(e, "")); setDlg("bloq") } else toast.error(errMsg(e, "No se pudo eliminar la importación"))
    } finally { setBusy(false) }
  }
  const actions = (o: ImportRecord): DetailActions => ({
    busy,
    advance: () => { const nx = NXT[o.estado]; if (nx) void put(o, { estado: nx }, `${o.referencia}: ${ST[nx][0]}`) },
    receive: () => setDlg("recibir"),
    edit: () => setSheet("editar"),
    cancel: () => setDlg("cancelar"),
    remove: () => { if (o.inventario_registrado_en) { setDlgMsg(""); setDlg("bloq") } else setDlg("eliminar") },
    saveEditables: async d => { await put(o, d, `Importación ${o.referencia} actualizada`) },
  })
  const pick = (id: number) => { setSelId(id); if (mob) setMobEx(true) }

  const hdBtns = <>
    <button type="button" className="btn out" aria-disabled={!items.length} onClick={() => { if (items.length) exportCsv(items) }}>{I(Download)}Exportar para contador</button>
    <button type="button" className="btn" onClick={() => setSheet("nueva")}>{I(Plus)}Nueva importación</button>
  </>
  const hd = mob
    ? <><div className="hd"><h1>Compra por importación</h1></div><div className="mhd">{hdBtns}</div></>
    : <div className="hd"><h1>Compra por importación</h1><div className="ac">{hdBtns}</div></div>
  const chips = (
    <div className="chips" role="tablist" aria-label="Filtrar por estado">
      {(["todas", ...ESTADOS] as Filter[]).map(k => (
        <button type="button" key={k} className="chip" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
          {k === "todas" ? "Todas" : <>{I(ST[k][1], 14)}{ST[k][0]}</>} <b>{status === "ok" ? cnt(k) : "-"}</b>
        </button>
      ))}
    </div>
  )
  const row = (o: ImportRecord) => (
    <button type="button" className="rw" role="option" key={o.id_importacion} aria-selected={selId === o.id_importacion} onClick={() => pick(o.id_importacion)}>
      <span className="rb">
        <span className="l1"><b>{o.referencia}</b><Chip e={o.estado} s={14} /></span>
        <span className="l2">{o.descripcion}{SEP}{uds(o.cantidad)}</span>
        <span className="l3">{o.proveedor}{SEP}{o.pais_origen}</span>
        <span className="l4"><Llegada o={o} /><b className="num">{sol(enSoles(o))}</b></span>
      </span>
      {I(ChevronRight, 16, "ch")}
    </button>
  )
  const card = (o: ImportRecord) => (
    <button type="button" className="mc" key={o.id_importacion} onClick={() => pick(o.id_importacion)}>
      <span className="l1"><b>{o.referencia}</b><Chip e={o.estado} s={14} /></span>
      <span className="l2">{o.descripcion}{SEP}{uds(o.cantidad)}</span>
      <span className="l3">{o.proveedor}{SEP}{o.pais_origen}</span>
      <span className="l4"><Llegada o={o} /></span>
      <span className="l4"><span>Costo en soles</span><b className="num">{sol(enSoles(o))}</b></span>
      <span className="go"><span className="num">{sol(unit(o))} por unidad</span><span>Ver {I(ChevronRight)}</span></span>
    </button>
  )
  const emptyFilter = <div className="empty" style={{ minHeight: 160 }}><h3>Sin expedientes en {filter === "todas" ? "la lista" : Q(ST[filter][0])}</h3><span>Prueba con otro estado.</span></div>
  const skel = (w: string) => <span className="sk" style={{ width: w }} />

  let content: React.ReactNode
  if (status === "error") content = (
    <div className="card empty" role="alert"><span className="st bad">{I(CircleAlert)}Error</span><h3>No se pudieron cargar las importaciones</h3><span>Tus datos no se han tocado.</span>
      <button type="button" className="btn out" onClick={() => { setStatus("load"); void load() }}>{I(RefreshCw)}Reintentar</button></div>
  )
  else if (status === "ok" && !items.length) content = (
    <div className="card empty">{I(Inbox, 32)}<h3>Aún no hay importaciones</h3><span>Registra la primera con {Q("Nueva importación")}.</span></div>
  )
  else if (status === "load") content = mob
    ? <div className="mlist" aria-busy="true">{[0, 1, 2].map(i => <div className="skr card" key={i}>{skel("40%")}{skel("85%")}{skel("60%")}</div>)}</div>
    : <div className="md" aria-busy="true"><div className="list">{[0, 1, 2, 3, 4].map(i => <div className="skr" key={i}>{skel("40%")}{skel("85%")}{skel("60%")}{skel("70%")}</div>)}</div>
      <div className="card ex"><div className="empty"><span className="st neu">{I(RefreshCw)}Cargando importaciones…</span></div></div></div>
  else if (mob) content = <div className="mlist" aria-label="Importaciones">{list.length ? list.map(card) : <div className="card">{emptyFilter}</div>}</div>
  else content = (
    <div className="md">
      <div className="list" role="listbox" aria-label="Importaciones">{list.length ? list.map(row) : emptyFilter}</div>
      {sel ? <ImportDetail o={sel} mob={false} a={actions(sel)} /> : <div className="card empty"><h3>Selecciona un expediente</h3></div>}
    </div>
  )

  const exScreen = mob && mobEx && sel
  const fx = !mob || !!exScreen || !!sheet
  const editing = sheet === "editar" ? sel : null
  return (
    <div className={`pg-importaciones${fx ? " fx" : ""}`} ref={host}>
      {exScreen && sel ? (
        <>
          <div className="mscr">
            <div className="mtop"><button type="button" className="btn out sq" onClick={() => setMobEx(false)} aria-label="Volver a la lista">{I(ChevronLeft, 18)}</button><h1>Compra por importación</h1></div>
            <ImportDetail o={sel} mob a={actions(sel)} />
          </div>
          <MobileBar o={sel} a={actions(sel)} />
        </>
      ) : (
        <div className="pg">{hd}{status === "ok" && items.length > 0 && chips}{content}</div>
      )}
      {sheet && (sheet === "nueva" || editing) && (
        <ImportSheet key={editing ? editing.id_importacion : "new"} record={editing} products={products} onClose={() => setSheet(null)}
          onSaved={id => { setSheet(null); setFilter("todas"); void load().then(() => setSelId(id)) }} />
      )}
      {sel && dlg && (
        <ImportDialog kind={dlg} o={sel} products={products} busy={busy} msg={dlgMsg} onClose={() => setDlg(null)}
          onReceive={pid => { void put(sel, { estado: "recibida", producto_id: pid }, `${sel.referencia} recibida: +${uds(sel.cantidad)} al stock`).then(ok => { if (ok) loadProducts() }) }}
          onCancel={() => { void put(sel, { estado: "cancelada" }, `${sel.referencia} cancelada`) }}
          onDelete={() => { void remove(sel) }} />
      )}
    </div>
  )
}
