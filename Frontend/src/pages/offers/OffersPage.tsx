"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CircleAlert, Clock } from "lucide-react"
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner"
import { useBusinessHours } from "../../hooks/useBusinessHours"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { buscarProductoPorCodigoBarras } from "../../services/codigoBarrasService"
import { norm } from "../../components/erp/format"
import { calc, summary, type OfeRow } from "./ofeCalc"
import { I } from "./ofeShared"
import { OfeBar } from "./OfeBar"
import { OfeCards } from "./OfeCards"
import type { RowCtx } from "./ofeRow"
import { OfeRemoveDialog, type RemoveReq } from "./OfeDialogs"
import { OfePager } from "./OfePager"
import { OfePreview } from "./OfePreview"
import { OfeResult } from "./OfeResult"
import { OfeEmpty, OfeError, OfeKpiSkeleton, OfeScan, OfeSkeleton } from "./OfeStates"
import { OfeTable } from "./OfeTable"
import { OfeFilters, OfeHeader, OfeKpi } from "./OfeTop"
import { useOfeActions } from "./useOfeActions"
import { useOfeData } from "./useOfeData"
import { useOfeFilter } from "./useOfeFilter"
import "../../styles/ofertas.css"

const OffersPage = () => {
  useDocumentTitle("Gestión de Ofertas")
  const { isWithinBusinessHours, businessHoursMessage } = useBusinessHours()
  const off = !isWithinBusinessHours

  const host = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [width, setWidth] = useState(1120)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  const data = useOfeData()
  const flt = useOfeFilter(data.rows)
  const acts = useOfeActions(data.rows, data.refresh)
  const [pv, setPv] = useState<number[] | null>(null)
  const [rm, setRm] = useState<RemoveReq | null>(null)
  const [focused, setFocused] = useState(false)

  // Escáner: ráfagas rápidas de teclas con el foco en la búsqueda, cerradas con Enter
  const { setQ } = flt
  const onScan = useCallback(async (code: string) => {
    const c = code.trim()
    if (!c) return
    try {
      const res = await buscarProductoPorCodigoBarras(c)
      if (res?.producto) { setQ(c); toast.success(`Producto encontrado: ${res.producto.nombre}`); return }
    } catch { /* sin coincidencia exacta: se busca por nombre o SKU */ }
    setQ(c)
    const n = norm(c)
    const found = data.rows.filter(r => norm(r.p.nombre).includes(n) || norm(r.p.sku).includes(n)).length
    if (found > 0) toast.success(`Encontrado${found > 1 ? "s" : ""} ${found} producto${found > 1 ? "s" : ""} relacionado${found > 1 ? "s" : ""}`)
    else toast.warning(`No se encontraron productos con código: ${c}`)
  }, [data.rows, setQ])
  useBarcodeScanner({ onScan: c => void onScan(c), enabled: focused, minLength: 5, interKeyTimeout: 100, captureInsideInputs: true })

  const x: RowCtx = {
    mode: acts.mode, pct: acts.pct, fix: acts.fix, sel: acts.sel, off, hasResult: !!acts.result, busy: acts.busy,
    onPrice: acts.setPrice, onBlur: acts.blurPrice, onPick: r => acts.toggle(r.id), setMany: acts.setMany,
    onQuitar: r => setRm({ kind: "row", r }),
    onOfertar: (r: OfeRow) => {
      if (!acts.sel.includes(r.id)) acts.toggle(r.id)
      if (acts.mode === "fix" && calc(r, "fix", acts.pct, acts.fix).err) {
        setTimeout(() => document.querySelector<HTMLInputElement>(`[data-pin="${r.id}"]`)?.focus(), 0)
        return
      }
      setPv([r.id])
    },
  }

  const usable = flt.pageRows.filter(r => r.normal > 0)
  const enabledList = flt.list.filter(r => r.normal > 0)
  const pageAll = usable.length > 0 && usable.every(r => acts.sel.includes(r.id))
  const filterTotal = pageAll && enabledList.length > usable.length ? enabledList.length : null
  const S = summary(acts.selRows, acts.mode, acts.pct, acts.fix)
  const nOn = data.kpi.on
  const counts: [number, number, number] = [data.kpi.total, nOn, data.kpi.total - nOn]
  const busy = data.loading || data.error

  const confirmRemove = async () => {
    if (!rm) return
    const ids = rm.kind === "row" ? [rm.r.id] : rm.kind === "all" ? rm.rows.filter(r => r.offer !== null).map(r => r.id) : rm.rows.map(r => r.id)
    await acts.remove(ids)
    setRm(null)
  }
  const confirmApply = async () => {
    if (!pv) return
    await acts.apply(pv)
    setPv(null)
  }
  const retry = () => {
    const ids = (acts.result?.ids || []).filter(id => acts.byId.has(id))
    acts.setResult(null)
    if (ids.length) setPv(ids)
  }
  const pvRows = (pv || []).map(id => acts.byId.get(id)).filter((r): r is OfeRow => !!r)

  const top = (
    <>
      {data.loading ? <OfeKpiSkeleton /> : <OfeKpi k={data.kpi} />}
      <OfeFilters
        q={flt.q} onQ={flt.setQ} inputRef={input} scanning={focused} onFocus={setFocused}
        cat={flt.cat} onCat={flt.setCat} cats={data.cats} sort={flt.sort} onSort={flt.setSort}
        seg={flt.seg} onSeg={flt.setSeg} counts={counts} busy={busy}
      />
      {data.costFail && <p className="ctx bad" role="status">{I(CircleAlert, 16)}<span>No se pudo leer el costo promedio de los productos: el margen no está disponible por ahora.</span></p>}
      {!data.loading && <OfeScan hit={flt.hit} q={flt.q} />}
      {acts.result
        ? <OfeResult res={acts.result} byId={acts.byId} onClose={() => acts.setResult(null)} onRetry={retry} />
        : !mob && acts.sel.length > 0 && (
          <OfeBar
            S={S} mode={acts.mode} pct={acts.pct} off={off} busy={acts.busy} filterTotal={filterTotal}
            onMode={acts.setMode} onPct={acts.setPct} onClear={acts.clear} onAll={() => acts.setMany(enabledList.map(r => r.id), true)}
            onApply={() => setPv(acts.sel)} onQuit={() => setRm({ kind: "sel", rows: acts.selRows })}
          />
        )}
    </>
  )
  const listPage = (p: number) => { flt.setPage(p); window.scrollTo({ top: 0 }) }
  const body = data.loading ? <OfeSkeleton /> : flt.list.length === 0 ? (
    <OfeEmpty total={data.kpi.total} onlyOffers={flt.seg === "on" && nOn === 0 && !flt.q.trim() && !flt.cat} q={flt.q.trim()} onClear={flt.clear} onAll={() => flt.setSeg("all")} />
  ) : mob ? (
    <>
      <OfeCards rows={flt.pageRows} x={x} />
      <div className="tcard"><OfePager from={flt.from} to={flt.to} total={flt.list.length} page={flt.page} pages={flt.pages} onPage={listPage} /></div>
    </>
  ) : (
    <OfeTable
      rows={flt.pageRows} x={x} onAllPage={on => acts.setMany(usable.map(r => r.id), on)}
      footer={<OfePager from={flt.from} to={flt.to} total={flt.list.length} page={flt.page} pages={flt.pages} onPage={listPage} />}
    />
  )
  const note = off && (
    <p className="note" id="off-msg" role="status">{I(Clock, 18)}<span><b>Fuera de horario laboral.</b> {businessHoursMessage ? `${businessHoursMessage}: ` : ""}no se pueden aplicar ni quitar ofertas hasta que abra el horario.</span></p>
  )
  return (
    <div className={`pg-ofe${mob ? " fx" : ""}`} ref={host}>
      <div className="pg">
        <OfeHeader mob={mob} noOffers={nOn === 0} off={off} busy={acts.busy} loading={busy} onAll={() => setRm({ kind: "all", rows: data.rows })} />
        {note}
        {data.error ? <OfeError detail={data.errMsg} onRetry={data.retry} /> : mob ? <div className="rcs">{top}{body}</div> : <>{top}{body}</>}
        {mob && acts.sel.length > 0 && !acts.result && (
          <div className="mbar">
            <div className="tx"><b className="num">{acts.sel.length} {acts.sel.length === 1 ? "seleccionado" : "seleccionados"}</b>{acts.mode === "fix" ? "Precio fijo" : `Porcentaje ${acts.pct} %`}</div>
            {S.withOffer > 0 && <button type="button" className="btn out sm dn" aria-disabled={off || undefined} aria-describedby={off ? "off-msg" : undefined} onClick={() => { if (!off) setRm({ kind: "sel", rows: acts.selRows }) }}>Quitar</button>}
            <button type="button" className="btn" onClick={() => setPv(acts.sel)}>Aplicar a {acts.sel.length}</button>
          </div>
        )}
        <p id="qt-why" className="sr">Quitar todas: no hay ofertas que quitar.</p>
      </div>
      {pv && pvRows.length > 0 && (
        <OfePreview
          rows={pvRows} mode={acts.mode} pct={acts.pct} fix={acts.fix} off={off} busy={acts.busy} mob={mob}
          onMode={acts.setMode} onPct={acts.setPct} onClose={() => setPv(null)} onConfirm={() => void confirmApply()}
        />
      )}
      {rm && <OfeRemoveDialog req={rm} busy={acts.busy} onCancel={() => setRm(null)} onConfirm={() => void confirmRemove()} />}
    </div>
  )
}

export default OffersPage
