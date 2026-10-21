import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { pl } from "./sarCommon"
import { SarFilters } from "./SarFilters"
import { SarList } from "./SarList"
import { DetailEmpty, DetailPanel, DetailSkeleton, ListPanel } from "./SarPanels"
import { SarLeave } from "./SarBanner"
import { SarDetail, SarMobileDetail, type DetailCtl } from "./SarDetail"
import { useSarDetail } from "./useSarDetail"
import { useSarList } from "./useSarList"
import "../../styles/sol-armado.css"

export default function SolicitudesEnsamblePage() {
  useDocumentTitle("Cotizaciones de armado")
  const list = useSarList()
  const [sel, setSel] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [leave, setLeave] = useState<number | null>(null)
  const reselect = useRef(true)
  const det = useSarDetail(sel, () => void list.load(true))

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

  // Escritorio: la primera solicitud queda abierta al entrar y al cambiar filtros/pagina.
  useEffect(() => {
    if (list.fetching || list.status !== "ok" || mob) return
    const esta = sel != null && list.rows.some(r => r.id_solicitud === sel)
    if (sel == null || (reselect.current && !esta)) setSel(list.rows[0]?.id_solicitud ?? null)
    reselect.current = false
  }, [list.fetching, list.status, list.rows, mob, sel])

  const filtra = (fn: () => void) => { reselect.current = true; setLeave(null); fn() }
  const pick = (id: number) => {
    if (id === sel) { if (mob) setView("detail"); return }
    if (!mob && det.dirty) { setLeave(id); return }
    setLeave(null); setSel(id); if (mob) setView("detail")
  }
  const codigoDe = (id: number | null) => list.rows.find(r => r.id_solicitud === id)?.codigo_seguimiento ?? `n.º ${id}`

  const err = list.status === "error"
  const vacio = list.status === "ok" && list.resumen.total === 0 && !list.filtrado
  const full = list.status === "forbidden" || list.status === "unauth" || err || vacio
  const s = det.det
  const aviso = leave != null && s ? (
    <SarLeave de={s.codigo_seguimiento} a={codigoDe(leave)} onStay={() => setLeave(null)}
      onDiscard={() => { det.discard(); setSel(leave); setLeave(null) }} />
  ) : null
  const ctl: DetailCtl | null = s && det.draft && det.status === "ok" ? {
    s, draft: det.draft, dirty: det.dirty, err: det.err, trans: det.transiciones, banner: det.banner, busy: det.busy, rej: det.rej, leave: aviso,
    onDraft: det.setDraft, onRej: det.setRej, onSave: () => void det.save(), onConvert: () => void det.convert(), onReload: det.reload,
  } : null
  const sinSel = sel == null || det.status === "idle"
  const panel = <DetailPanel status={det.status} onRetry={det.retry} />
  const detalle = sinSel ? <DetailEmpty /> : det.status === "load" ? <DetailSkeleton /> : ctl ? <SarDetail c={ctl} /> : panel

  if (mob && view === "detail" && !full) {
    return (
      <div className="pg-solarm fx" ref={host}>
        <div className="pg"><SarMobileDetail c={ctl} codigo={codigoDe(sel)} cargando={det.status === "load"} vacio={panel} onBack={() => setView("list")} /></div>
      </div>
    )
  }
  const sinLista = list.status === "forbidden" || list.status === "unauth"
  return (
    <div className="pg-solarm fx" ref={host}>
      <div className="pg">
        <div className="hd">
          <h1>Cotizaciones de armado</h1>
          {list.status === "ok" && <span className="tot">{pl(list.resumen.total, "solicitud", "solicitudes")}</span>}
        </div>
        {!sinLista && (
          <SarFilters f={list.f} qLive={list.qLive} resumen={list.resumen} err={err} onQ={v => filtra(() => list.setQLive(v))} onSet={c => filtra(() => list.set(c))} />
        )}
        {full ? <ListPanel status={vacio ? "empty" : list.status} onRetry={() => void list.load()} /> : (
          <div className="bd">
            <SarList rows={list.rows} loading={list.status === "load"} mob={mob} selId={sel} page={list.page} total={list.total} limit={list.limit}
              onPick={pick} onPage={p => filtra(() => list.setPage(p))} onClear={() => filtra(list.clear)} />
            {!mob && detalle}
          </div>
        )}
      </div>
    </div>
  )
}
