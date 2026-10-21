import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, SlidersHorizontal, Search } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { chipsDe, motivoPurga } from "./audCommon"
import { AudBanner } from "./AudBanner"
import { AudCards, AudCardsSkeleton } from "./AudCards"
import { AudDetail, AudDetailEmpty } from "./AudDetail"
import { AudChips, AudFilters } from "./AudFilters"
import { AudHeader } from "./AudHeader"
import { AudPager } from "./AudPager"
import { AudPurgeDialog } from "./AudPurgeDialog"
import { AudRetention } from "./AudRetention"
import { AudSheet } from "./AudSheet"
import { AudState } from "./AudStates"
import { AudSkeleton, AudTable } from "./AudTable"
import { I } from "./audParts"
import { useAudDetail } from "./useAudDetail"
import { useAudExport, type AudBanner as B } from "./useAudExport"
import { useAudList } from "./useAudList"
import { useAudMeta } from "./useAudMeta"
import { useAudWidth } from "./useAudWidth"

/** Bandeja + detalle de logs de auditoria; en movil, lista de tarjetas y detalle a pantalla completa. */
export default function AudScreen() {
  const { user } = useAuth()
  const meta = useAudMeta()
  const { host, mob, compact } = useAudWidth()
  const list = useAudList(meta.status === "ok")
  const [sel, setSel] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [banner, setBanner] = useState<B | null>(null)
  const [purga, setPurga] = useState(false)
  const [hoja, setHoja] = useState(false)
  const exp = useAudExport(list.params, setBanner)

  const row = list.rows.find(r => r.id_log === sel) ?? null
  const det = useAudDetail(row?.tiene_detalle ? sel : null)

  // Escritorio: la primera fila queda abierta al cargar y al cambiar filtros/pagina.
  useEffect(() => {
    if (mob || list.fetching || list.status !== "ok") return
    if (sel == null || !list.rows.some(r => r.id_log === sel)) setSel(list.rows[0]?.id_log ?? null)
  }, [mob, list.fetching, list.status, list.rows, sel])

  const set = (c: Parameters<typeof list.set>[0]) => { setBanner(b => (b?.t === "run" ? b : null)); list.set(c) }
  const cat = meta.cat
  const forbidden = meta.status === "forbidden" || list.status === "forbidden"
  const unauth = meta.status === "unauth" || list.status === "unauth"
  const metaErr = meta.status === "error"
  const pick = (id: number) => { setSel(id); if (mob) setView("detail") }
  const nChips = useMemo(() => chipsDe(list.f, cat).filter(c => c.clave !== "q").length, [list.f, cat])

  const puedeExp = !!meta.permisos?.puede_exportar && list.status === "ok" && list.total > 0
  const motivoExp = !meta.permisos?.puede_exportar ? "Tu acceso no incluye exportar." : "No hay logs para exportar con estos filtros."
  const refresh = () => { setBanner(null); void list.load(true); void meta.reloadStats(); det.retry() }
  const onPurged = (n: number, fecha: string, logId: number | null) => {
    setPurga(false); setBanner({ t: "purga", n, fecha }); if (logId != null && !mob) setSel(logId)
    list.first(); void meta.reloadStats()
  }

  const header = <AudHeader mob={mob} exporting={exp.exporting} canExport={puedeExp} motivo={motivoExp} onRefresh={refresh} onExport={() => void exp.run()} />
  const aviso = banner && <AudBanner b={banner} onClose={() => setBanner(null)} />

  if (forbidden || unauth || metaErr) {
    return (
      <div className="pg-auditoria fx" ref={host}>
        <div className="pg">
          <div className="hd"><h1>Logs de auditoría</h1></div>
          <AudState kind={forbidden ? "403" : unauth ? "401" : "err"} msg={metaErr ? "No se pudo comprobar tu acceso." : ""} onRetry={() => void meta.reload()} onClear={list.clear} />
        </div>
      </div>
    )
  }

  const vacio = list.status === "ok" && list.total === 0
  const retention = <AudRetention stats={meta.stats} permisos={meta.permisos} motivo={motivoPurga(user?.id_role)} onPurge={() => setPurga(true)} />
  const pager = <AudPager page={list.page} limit={list.limit} total={list.total} shown={list.rows.length} filtrado={list.filtrado} mob={mob} onPage={list.setPage} onLimit={list.setLimit} />
  const estado = list.status === "error" ? <AudState kind="err" msg={list.errMsg} onRetry={() => void list.load()} onClear={list.clear} />
    : vacio ? <AudState kind={list.filtrado ? "emptyf" : "empty"} onRetry={() => undefined} onClear={list.clear} /> : null
  const cargando = list.status === "load" || meta.status === "load"
  const detalle = row ? <AudDetail r={row} det={det.det} status={det.status} cat={cat} onClose={() => setSel(null)} onRetry={det.retry} /> : <AudDetailEmpty />
  const dialogs = (
    <>
      {purga && <AudPurgeDialog onClose={() => setPurga(false)} onDone={onPurged} />}
      {hoja && <AudSheet f={list.f} cat={cat} total={list.total} set={set} onClear={list.clear} onClose={() => setHoja(false)} />}
    </>
  )

  if (mob && view === "detail" && row) {
    return (
      <div className="pg-auditoria fx" ref={host}>
        <div className="pg">
          <div className="mback"><button type="button" className="btn out" onClick={() => setView("list")}>{I(ArrowLeft, 16)}Volver a la lista</button><h1>Log #{row.id_log}</h1></div>
          <div className="mdet"><AudDetail mob r={row} det={det.det} status={det.status} cat={cat} onRetry={det.retry} /></div>
        </div>
        {dialogs}
      </div>
    )
  }
  return (
    <div className="pg-auditoria fx" ref={host}>
      <div className="pg">
        {header}
        {aviso}
        {mob ? (
          <>
            <div className="mfl">
              <label className="fld q">{I(Search, 16)}<input type="search" aria-label="Buscar" placeholder="Buscar" value={list.qLive} onChange={e => list.setQ(e.target.value)} /></label>
              <button type="button" className="btn out" aria-haspopup="dialog" onClick={() => setHoja(true)}>{I(SlidersHorizontal, 16)}Filtros{nChips ? <span className="badge" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>{nChips}</span> : null}</button>
            </div>
            {nChips > 0 && <div className="sub" style={{ fontSize: 13 }}><b style={{ color: "hsl(var(--foreground))" }}>{nChips} {nChips === 1 ? "filtro activo" : "filtros activos"}</b></div>}
          </>
        ) : <AudFilters f={list.f} qLive={list.qLive} cat={cat} onQ={list.setQ} set={set} />}
        <AudChips f={list.f} cat={cat} set={set} onQ={list.setQ} onClear={list.clear} />
        {estado && !cargando ? estado : mob ? (
          <div className="mscroll">
            {cargando ? <AudCardsSkeleton /> : <AudCards rows={list.rows} cat={cat} sel={sel} onPick={pick} />}
            {!cargando && pager}
            {retention}
          </div>
        ) : (
          <div className="body">
            <section className="tcard">
              {cargando ? <AudSkeleton /> : <div className="tscroll"><AudTable rows={list.rows} cat={cat} sel={sel} compact={compact} onPick={pick} /></div>}
              {pager}
              {retention}
            </section>
            {detalle}
          </div>
        )}
      </div>
      {dialogs}
    </div>
  )
}
