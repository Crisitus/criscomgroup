import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Clock, Plus, ScanBarcode } from "lucide-react"
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner"
import { useBusinessHours } from "../../../hooks/useBusinessHours"
import { useDocumentTitle } from "../../../hooks/useDocumentTitle"
import { useAuth } from "../../../contexts/AuthContext"
import { buscarProductoPorCodigoBarras } from "../../../services/codigoBarrasService"
import { ProdBody, Loading } from "./ProdBody"
import { ProdFilters, ProdKpi } from "./ProdKpi"
import { ProdHeader } from "./ProdHeader"
import { ProdOverlays, type Ov } from "./ProdOverlays"
import type { MenuActs } from "./ProdMenu"
import { I, type Row } from "./prodShared"
import { useProdData } from "./useProdData"
import { PAGE, useProdFilter } from "./useProdFilter"
import "../../../styles/productos.css"

export default function ProductsList() {
  const { user } = useAuth()
  const afil = user?.tipo_vendedor === "afiliado"
  const title = afil ? "Mis productos e inventario" : "Productos e inventario"
  useDocumentTitle(title)
  const navigate = useNavigate()
  const location = useLocation()
  const st = (location.state || {}) as { scrollPosition?: number; currentPage?: number }
  const { isWithinBusinessHours, businessHoursMessage } = useBusinessHours()
  const ro = user?.id_role === 3 && !isWithinBusinessHours && !user?.superusuario_temporal && !user?.area_grants?.includes("inventario")

  const host = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [width, setWidth] = useState(1120)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const r = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    r.observe(el)
    return () => r.disconnect()
  }, [])
  const mob = width < 640
  const lap = !mob && width < 1100

  const data = useProdData()
  const flt = useProdFilter(data.rows, st.currentPage || 1)
  const [ov, setOv] = useState<Ov | null>(null)
  const [menuId, setMenuId] = useState<number | null>(null)
  const [hl, setHl] = useState<number | null>(null)
  const [jump, setJump] = useState<number | null>(null)

  useEffect(() => { if (new URLSearchParams(location.search).get("new") === "1" && !ro) setOv({ k: "nuevo" }) }, [location.search, ro])
  useEffect(() => { if (!mob) input.current?.focus() }, [mob])
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || data.loading || !st.scrollPosition) return
    restored.current = true
    const y = st.scrollPosition
    setTimeout(() => requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" })), 150)
  }, [data.loading, st.scrollPosition])
  const { list, setPage } = flt
  useEffect(() => {
    if (jump === null) return
    const i = list.findIndex(r => r.id === jump)
    if (i >= 0) { setPage(Math.floor(i / PAGE) + 1); setJump(null) }
  }, [jump, list, setPage])

  const open = useCallback((r: Row) => navigate(`/products/${r.id}`, { state: { scrollPosition: window.scrollY, currentPage: flt.page } }), [navigate, flt.page])
  const acts: MenuActs = {
    open, codes: r => setOv({ k: "codes", r }), hist: r => setOv({ k: "hist", r }),
    ubic: r => setOv({ k: "ubic", pid: r.id }), adjust: r => setOv({ k: "adj", r }), del: r => setOv({ k: "del", r }),
  }

  const onScan = useCallback(async (code: string) => {
    const c = code.trim()
    if (!c) return
    try {
      const res = await buscarProductoPorCodigoBarras(c)
      if (res?.producto) { navigate(`/products/${res.producto.id_producto}`); toast.success(`Producto encontrado: ${res.producto.nombre}`); return }
    } catch { /* sin coincidencia exacta: se busca en la lista */ }
    flt.setQ(c)
    toast.warning(`No se encontró un producto con el código ${c}`)
  }, [navigate, flt])
  useBarcodeScanner({ onScan: c => void onScan(c), enabled: !ov, minLength: 5 })

  const newBtn = ro ? null : () => setOv({ k: "nuevo" })
  const hitRow = flt.codeHit !== null && flt.q.trim() ? data.rows.find(r => r.id === flt.codeHit) : undefined
  const body = (
    <ProdBody rows={flt.pageRows} hl={hl} ro={ro} acts={acts} menuId={menuId} setMenuId={setMenuId} onView={(url, name) => setOv({ k: "img", url, name })}
      mob={mob} loading={data.loading} error={data.error} empty={!data.rows.length} total={flt.list.length} all={data.rows.length}
      q={flt.q} hasFilter={flt.hasFilter} page={flt.page} pages={flt.pages} from={flt.from} to={flt.to}
      onPage={n => { flt.setPage(n); window.scrollTo({ top: 0 }) }} onRetry={data.retry} onClear={flt.clear} onNew={newBtn} />
  )
  const ctx = (
    <>
      {ro && <div className="ctx off" id="why-off">{I(Clock, 16)}<span>{businessHoursMessage || "Fuera del horario laboral"}: como vendedor no puedes crear, ajustar ni eliminar productos hasta que abra el horario. Puedes consultar el inventario.</span></div>}
      {hitRow && <div className="ctx" role="status">{I(ScanBarcode, 16)}<span>1 resultado: el código <b className="num">{flt.q.trim()}</b> pertenece a <b>{hitRow.p.nombre}</b></span><button type="button" className="btn out sm" onClick={() => flt.setQ("")}>Limpiar búsqueda</button></div>}
      {data.loading && <Loading />}
    </>
  )
  const top = (
    <>
      <ProdKpi s={data.summary} loading={data.loading} err={data.error} onFilter={flt.setF} />
      <ProdFilters rows={data.rows} f={flt.f} onFilter={flt.setF} cats={data.cats} cat={flt.cat} onCat={flt.setCat} sort={flt.sort} onSort={flt.setSort} busy={data.loading || data.error} q={flt.q.trim()} />
      {ctx}
    </>
  )
  return (
    <div className={`pg-prod${mob ? " fx" : ""}`} ref={host}>
      <div className={`pg${lap ? " cmp" : ""}`}>
        <ProdHeader title={title} mob={mob} q={flt.q} onQ={flt.setQ} inputRef={input} onUbic={() => setOv({ k: "ubic" })} onNew={() => setOv({ k: "nuevo" })} ro={ro} />
        {mob ? <div className="rcs">{top}{body}</div> : <>{top}{body}</>}
        {mob && <div className="mbar"><button type="button" className="btn" aria-disabled={ro} aria-describedby={ro ? "why-off" : undefined} onClick={() => { if (!ro) setOv({ k: "nuevo" }) }}>{I(Plus)}Nuevo producto</button></div>}
      </div>
      <ProdOverlays ov={ov} setOv={setOv} ro={ro} refresh={data.refresh} rows={data.rows}
        onCreated={id => { flt.clear(); setHl(id); setJump(id) }} />
    </div>
  )
}
