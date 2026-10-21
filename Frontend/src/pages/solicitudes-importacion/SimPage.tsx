import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { DetailEmpty, DetailPanel, DetailSkeleton, ListPanel } from "./SimPanels"
import { SimDetail, type DetailCtl } from "./SimDetail"
import { SimFilters } from "./SimFilters"
import { SimList } from "./SimList"
import { SimMobileDetail } from "./SimMobileDetail"
import { cambiosTxt } from "./simForm"
import { useSimDetail } from "./useSimDetail"
import { useSimList } from "./useSimList"
import "../../styles/sol-importacion.css"

const titulo = (n: number) => `${n} ${n === 1 ? "solicitud" : "solicitudes"}`

/** Bandeja (izquierda) + detalle sin modal (derecha); en movil, lista y detalle a pantalla completa. */
export default function SimPage() {
  useDocumentTitle("Solicitudes de importación")
  const list = useSimList()
  const [sel, setSel] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [pendTo, setPendTo] = useState<number | "list" | null>(null)
  const reselect = useRef(true)
  const det = useSimDetail(sel, () => void list.load(true))

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

  // Escritorio: la primera solicitud queda abierta al entrar y al cambiar filtros (sin pisar cambios sin guardar).
  useEffect(() => {
    if (list.fetching || list.status !== "ok" || mob) return
    const esta = sel != null && list.rows.some(r => r.id_solicitud === sel)
    if (sel == null || (reselect.current && !esta && !det.dirty)) setSel(list.rows[0]?.id_solicitud ?? null)
    reselect.current = false
  }, [list.fetching, list.status, list.rows, mob, sel, det.dirty])
  useEffect(() => { if (!det.dirty) setPendTo(null) }, [det.dirty])

  const filtra = (fn: () => void) => { reselect.current = true; fn() }
  const go = (to: number | "list") => {
    setPendTo(null)
    if (to === "list") setView("list")
    else { setSel(to); if (mob) setView("detail") }
  }
  const request = (to: number | "list") => {
    if (to !== "list" && to === sel) { if (mob) setView("detail"); return }
    if (det.dirty) setPendTo(to)
    else go(to)
  }

  const full = list.status === "forbidden" || list.status === "unauth" || list.status === "error" || (list.status === "ok" && list.resumen.total === 0 && !list.filtrado)
  const d = det.det
  const pendCod = pendTo === "list" ? "la lista" : list.rows.find(r => r.id_solicitud === pendTo)?.codigo_seguimiento ?? "otra solicitud"
  const ctl: DetailCtl | null = d && det.draft && det.status === "ok" ? {
    r: d, d: det.draft, errs: det.errs, banner: det.banner, dirty: det.dirty, busy: det.busy,
    pend: pendTo != null ? { cod: pendCod, que: cambiosTxt(d, det.draft) } : null,
    onPatch: det.patch, onSave: () => void det.save(), onConvertir: () => void det.convertir(), onReload: det.reload,
    onDiscard: () => { if (pendTo != null) go(pendTo) }, onKeep: () => setPendTo(null),
  } : null
  const sinSel = sel == null || det.status === "idle"
  const detalle = sinSel ? <DetailEmpty /> : det.status === "load" ? <DetailSkeleton />
    : ctl ? <SimDetail c={ctl} /> : <DetailPanel status={det.status} onRetry={det.retry} />
  const total = list.status === "ok" ? titulo(list.total) : list.status === "load" ? "Cargando…" : ""

  if (mob && view === "detail" && !full) {
    return (
      <div className="pg-solimp fx" ref={host}>
        <div className="pg">
          <SimMobileDetail c={ctl} cargando={det.status === "load"} vacio={<DetailPanel status={det.status} onRetry={det.retry} />} onBack={() => request("list")} />
        </div>
      </div>
    )
  }
  return (
    <div className="pg-solimp fx" ref={host}>
      <div className="pg">
        <div className="hd"><h1>Solicitudes de importación</h1><span className="tot" aria-live="polite">{total}</span></div>
        {list.status !== "forbidden" && list.status !== "unauth" && (
          <SimFilters f={list.f} qLive={list.qLive} resumen={list.resumen} err={list.status === "error"} mob={mob}
            onQ={v => filtra(() => list.setQLive(v))} onSet={c => filtra(() => list.set(c))} />
        )}
        {full ? <ListPanel status={list.status === "ok" ? "empty" : list.status} msg={list.errMsg} onRetry={() => void list.load()} /> : (
          <div className="bd">
            <SimList rows={list.rows} loading={list.status === "load"} mob={mob} selId={sel} page={list.page} total={list.total} limit={list.limit}
              onPick={request} onPage={p => filtra(() => list.setPage(p))} onClear={() => filtra(list.clear)} />
            {!mob && detalle}
          </div>
        )}
      </div>
    </div>
  )
}
