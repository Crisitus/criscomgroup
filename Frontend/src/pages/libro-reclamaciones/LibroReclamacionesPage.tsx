import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ArchiveDialog } from "./ArchiveDialog"
import { DetailEmpty, DetailSkeleton, LibroDetail, type DetailCtl } from "./LibroDetail"
import { LibroFilters } from "./LibroFilters"
import { LibroList } from "./LibroList"
import { LibroMobileDetail } from "./LibroMobileDetail"
import { DetailPanel, ListPanel } from "./LibroPanels"
import { masUrgente } from "./libroCommon"
import { I, Spin } from "./libroParts"
import { useLibroDetail } from "./useLibroDetail"
import { useLibroList } from "./useLibroList"
import "../../styles/libro-reclamaciones.css"

export default function LibroReclamacionesPage() {
  useDocumentTitle("Libro de Reclamaciones")
  const list = useLibroList()
  const [sel, setSel] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [arch, setArch] = useState(false)
  const reselect = useRef(true)
  const det = useLibroDetail(sel, () => void list.load(true))

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

  // Escritorio: la hoja mas urgente queda seleccionada al abrir y al cambiar filtros/pagina.
  useEffect(() => {
    if (list.fetching || list.status !== "ok" || mob) return
    const esta = sel != null && list.rows.some(r => r.id_reclamo === sel)
    if (sel == null || (reselect.current && !esta)) setSel(masUrgente(list.rows)?.id_reclamo ?? null)
    reselect.current = false
  }, [list.fetching, list.status, list.rows, mob, sel])

  const filtra = (fn: () => void) => { reselect.current = true; fn() }
  const pick = (id: number) => { setSel(id); if (mob) setView("detail") }

  const err = list.status === "error"
  const vacio = list.status === "ok" && list.resumen.total === 0 && !list.filtrado
  const full = list.status === "forbidden" || list.status === "unauth" || err || vacio
  const sinExport = list.status !== "ok" || list.total === 0
  const d = det.det
  const ctl: DetailCtl | null = d && det.status === "ok" ? {
    r: d, banner: det.banner, draft: det.draft, fieldErr: det.fieldErr, busy: det.busy,
    onDraft: det.setDraft, onReload: det.reload, onProc: () => void det.proc(), onSend: () => void det.send(), onArchive: () => { det.setDlgErr(""); setArch(true) },
  } : null
  const sinSel = sel == null || (det.status === "idle")
  const detalle = sinSel ? <DetailEmpty />
    : det.status === "load" ? <DetailSkeleton />
    : ctl ? <LibroDetail c={ctl} /> : <DetailPanel status={det.status} onRetry={det.retry} />

  const exportBtn = list.status === "forbidden" || list.status === "unauth" ? null : (
    <button type="button" className="btn out" aria-disabled={sinExport || list.exporting} aria-label="Exportar CSV" title="Exporta con los filtros activos"
      onClick={() => { if (!sinExport) void list.exportCsv() }}>{list.exporting ? <Spin /> : I(Download, 16)}{mob ? null : "Exportar CSV"}</button>
  )

  if (mob && view === "detail" && !full) {
    return (
      <div className="pg-libro fx" ref={host}>
        <div className="pg">
          <LibroMobileDetail c={ctl} codigo={list.rows.find(r => r.id_reclamo === sel)?.codigo ?? d?.codigo ?? ""} cargando={det.status === "load"} vacio={<DetailPanel status={det.status} onRetry={det.retry} />} onBack={() => setView("list")} />
        </div>
        {arch && ctl && <ArchiveDialog codigo={ctl.r.codigo ?? `#${ctl.r.id_reclamo}`} busy={det.busy === "arc"} error={det.dlgErr} onCancel={() => setArch(false)} onConfirm={() => void det.archive().then(ok => ok && setArch(false))} />}
      </div>
    )
  }
  return (
    <div className="pg-libro fx" ref={host}>
      <div className="pg">
        <div className="hd"><h1>Libro de reclamaciones</h1>{exportBtn}</div>
        {list.status !== "forbidden" && list.status !== "unauth" && (
          <LibroFilters f={list.f} qLive={list.qLive} resumen={list.resumen} err={err} onQ={v => filtra(() => list.setQLive(v))} onSet={c => filtra(() => list.set(c))} />
        )}
        {full ? <ListPanel status={vacio ? "empty" : list.status} onRetry={() => void list.load()} /> : (
          <div className="bd">
            <LibroList rows={list.rows} loading={list.status === "load"} mob={mob} selId={sel} page={list.page} total={list.total} limit={list.limit}
              onPick={pick} onPage={p => filtra(() => list.setPage(p))} onClear={() => filtra(list.clear)} />
            {!mob && detalle}
          </div>
        )}
      </div>
      {arch && ctl && <ArchiveDialog codigo={ctl.r.codigo ?? `#${ctl.r.id_reclamo}`} busy={det.busy === "arc"} error={det.dlgErr} onCancel={() => setArch(false)} onConfirm={() => void det.archive().then(ok => ok && setArch(false))} />}
    </div>
  )
}
