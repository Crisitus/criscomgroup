import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { API_URL } from "../../../config/api"
import { useDocumentTitle } from "../../../hooks/useDocumentTitle"
import { Header, MobileBar, type Pend } from "./Header"
import { DataCard } from "./DataCard"
import { PriceCard } from "./PriceCard"
import { ConditionCard } from "./ConditionCard"
import { StockCard } from "./StockCard"
import { CodesCard } from "./CodesCard"
import { HistoryCard } from "./HistoryCard"
import { HistoryPanel } from "./HistoryPanel"
import { DlgAddCode } from "./DlgAddCode"
import { DlgAdjust } from "./DlgAdjust"
import { DlgImage } from "./DlgImage"
import { DlgLeave } from "./DlgLeave"
import { Loading, NotFound } from "./States"
import { changedKeys, toDraft, validate } from "./draft"
import { codeModel, usePending } from "./usePending"
import { saveAll } from "./saveAll"
import { useFichaData } from "./useFichaData"
import { errMsg } from "./shared"
import type { Draft, Ficha } from "./types"
import "../../../styles/producto-detalle.css"

type Dlg = null | "add" | "adjust" | "history" | "image" | "leave"

/** URL absoluta de la imagen guardada (el backend suele entregarla completa; si no, se arma). */
const imageUrl = (p: Ficha): string | null => {
  const raw = p.imagen_url
  if (!raw) return null
  if (raw.startsWith("http")) return raw
  const base = API_URL.replace("/api", "")
  if (raw.includes("/uploads/")) return `${base}${raw}`
  return `${base}/uploads/productos/${raw.split("\\").pop() || raw.split("/").pop() || raw}`
}

export default function FichaPage() {
  const { id } = useParams<{ id: string }>()
  const pid = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  useDocumentTitle(`Editar Producto #${id}`)
  const data = useFichaData(pid)
  const product = data.product.data
  const pe = usePending()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [base, setBase] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [viewUrl, setViewUrl] = useState("")
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)
  const loadedFor = useRef<number | null>(null)
  const statusId = useId()

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  const rebase = useCallback((p: Ficha) => { const d = toDraft(p); setDraft(d); setBase(d); pe.reset() }, [pe.reset]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (product && loadedFor.current !== product.id_producto) { loadedFor.current = product.id_producto; rebase(product) }
  }, [product, rebase])

  const goBack = useCallback(() => {
    const s = location.state as { scrollPosition?: number; currentPage?: number } | null
    if (s?.scrollPosition || s?.currentPage) navigate("/products", { state: { scrollPosition: s.scrollPosition || 0, currentPage: s.currentPage || 1 } })
    else navigate("/products")
  }, [location.state, navigate])

  const codes = useMemo(() => data.codes.data ?? [], [data.codes.data])
  const cm = useMemo(() => codeModel(codes, pe.p), [codes, pe.p])
  const errors = useMemo(() => (draft ? validate(draft) : {}), [draft])
  const dk = useMemo(() => new Set(draft && base ? changedKeys(draft, base) : []), [draft, base])
  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => (d ? { ...d, [k]: v } : d)), [])

  if (data.product.isLoading || (product && (!draft || !base))) return <div ref={host} className="pg-ficha"><Loading /></div>
  if (data.product.isError || !product || !draft || !base) {
    return <div ref={host} className="pg-ficha"><NotFound onBack={goBack} text={data.product.isError && (data.product.error as { response?: { status?: number } })?.response?.status !== 404 ? errMsg(data.product.error, "No se pudo cargar la ficha") : undefined} /></div>
  }

  const dirty = dk.size > 0 || cm.dirty
  const mismatch = cm.usa && cm.suma !== product.stock
  const invalid = Object.keys(errors).length > 0 || cm.badQty
  const can = (dirty || mismatch) && !invalid && !busy
  const pend: Pend = busy ? "busy" : invalid ? "invalid" : dirty ? "dirty" : mismatch ? "recalc" : "clean"
  const bajo = product.stock_minimo > 0 && product.stock <= product.stock_minimo
  const catName = data.cats.data?.find(c => c.id_categoria === product.id_categoria)?.nombre ?? product.categoria?.nombre ?? "Sin categoría"
  const saved = imageUrl(product)
  const shown = pe.p.preview ?? (pe.p.removeImg ? null : saved)

  const save = async () => {
    if (!can) return
    setBusy(true)
    let touched = false
    try {
      await saveAll({ id: pid, saved: product, draft, codes, pending: pe.p, model: cm }, () => { touched = true })
      const fresh = await data.refetchCore()
      rebase(fresh.product)
      void data.refreshSide()
      toast.success("Producto actualizado exitosamente")
    } catch (e) {
      toast.error(errMsg(e, "No se pudo guardar la ficha"))
      if (touched) {
        // La ficha ya se guardo pero faltaron pasos: se muestra lo que realmente quedo en el servidor.
        try { const fresh = await data.refetchCore(); rebase(fresh.product); void data.refreshSide() } catch { /* se queda lo mostrado */ }
      }
    } finally { setBusy(false) }
  }
  const tryBack = () => { if (dirty) setDlg("leave"); else goBack() }
  const afterAdjust = async () => {
    setDlg(null)
    await Promise.all([data.product.refetch(), data.refreshSide()])
  }
  const mobileBar = mob && <MobileBar can={can} describedBy={statusId} onBack={tryBack} onSave={() => void save()} />

  const body = (
    <div className="pg">
      <Header p={product} catName={catName} bajo={bajo} pend={pend} can={can} mob={mob} statusId={statusId} onBack={tryBack} onSave={() => void save()} />
      <div className="cols">
        <div className="col">
          <DataCard d={draft} set={set} err={errors} cats={data.cats.data ?? []} dk={dk}
            img={{ url: shown, pendingRemove: pe.p.removeImg, hasSaved: !!saved, onPick: pe.pickImage, onClear: () => pe.clearImage(!!saved), onUndo: pe.undoRemoveImage, onView: u => { setViewUrl(u); setDlg("image") } }} />
          <PriceCard p={product} d={draft} set={set} err={errors} dk={dk} />
          <ConditionCard d={draft} set={set} err={errors} dk={dk} />
        </div>
        <div className="col">
          <StockCard p={product} metrics={data.metrics.data ?? null} minimo={product.stock_minimo} usa={cm.usa} suma={cm.suma} count={cm.count} recalc={mismatch && !dirty} mob={mob} onAdjust={() => setDlg("adjust")} />
          <CodesCard codes={codes} pe={pe} cm={cm} onAdd={() => setDlg("add")} />
          <HistoryCard items={data.movs.data ?? []} loading={data.movs.isLoading} onAll={() => setDlg("history")} />
        </div>
      </div>
    </div>
  )
  return (
    <div ref={host} className={`pg-ficha${mob ? " fx" : ""}`}>
      {mob ? <div className="zs">{body}</div> : body}
      {mobileBar}
      {dlg === "add" && <DlgAddCode name={product.nombre} stock={product.stock} suma={cm.suma} taken={[...codes.map(c => c.codigo), ...pe.p.tmp.map(t => t.codigo)]} onClose={() => setDlg(null)} onAdd={(c, q) => { pe.addTmp(c, q); setDlg(null); toast.success("Código agregado. Queda pendiente hasta guardar.") }} />}
      {dlg === "adjust" && <DlgAdjust id={pid} name={product.nombre} stock={product.stock} onClose={() => setDlg(null)} onDone={() => void afterAdjust()} />}
      {dlg === "history" && <HistoryPanel name={product.nombre} sku={product.sku} items={data.movs.data ?? []} onClose={() => setDlg(null)} />}
      {dlg === "image" && <DlgImage url={viewUrl} name={product.nombre} onClose={() => setDlg(null)} />}
      {dlg === "leave" && <DlgLeave onStay={() => setDlg(null)} onLeave={goBack} />}
    </div>
  )
}
