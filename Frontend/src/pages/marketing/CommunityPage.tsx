import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { exportMembersCsv, type CommunityCampaign, type CommunityMember } from "../../services/communityService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { BajaDialog } from "./community/BajaDialog"
import { Attention, CampaignList } from "./community/CampaignList"
import { ComHeader } from "./community/ComHeader"
import { ComTabs, type ComTab } from "./community/ComTabs"
import { Composer } from "./community/Composer"
import { MemberFilters, type MemberQuery } from "./community/MemberFilters"
import { MembersBody } from "./community/MembersBody"
import { ModeStrip } from "./community/ModeStrip"
import { SendDialog } from "./community/SendDialog"
import { TestDialog } from "./community/TestDialog"
import { blockReason, errMsg, type MailFlags } from "./community/comShared"
import { useComData } from "./community/useComData"
import "../../styles/comunidad.css"

const Q0: MemberQuery = { q: "", estado: "", fuente: "", page: 1, limit: 25 }

export default function CommunityPage() {
  useDocumentTitle("Comunidad y correos")
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

  const [tab, setTab] = useState<ComTab>("c")
  const [mq, setMq] = useState<MemberQuery>(Q0)
  const [composer, setComposer] = useState<{ draft: CommunityCampaign | null } | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const [testing, setTesting] = useState<CommunityCampaign | null>(null)
  const [sending, setSending] = useState<CommunityCampaign | null>(null)
  const [baja, setBaja] = useState<CommunityMember | null>(null)
  const [exporting, setExporting] = useState(false)
  const { data, status, error, live, load, retry } = useComData({ q: mq.q || undefined, estado: mq.estado || undefined, fuente: mq.fuente || undefined, page: mq.page, limit: mq.limit })
  const set = useCallback((p: Partial<MemberQuery>) => setMq(m => ({ ...m, ...p })), [])

  const flags: MailFlags | null = data ? { mail_mode: data.mail_mode, smtp_configured: data.smtp_configured, public_base_url_configured: data.public_base_url_configured } : null
  const list = (data?.campaigns || []).map(c => (live[c.id_campaign] ? { ...c, ...live[c.id_campaign] } : c))
  const why = blockReason(flags)
  const nTotal = data ? data.activos + data.bajas : null

  const exportCsv = async () => {
    setExporting(true)
    try {
      const url = URL.createObjectURL(await exportMembersCsv({ q: mq.q || undefined, estado: mq.estado || undefined, fuente: mq.fuente || undefined }))
      const a = document.createElement("a")
      a.href = url; a.download = "comunidad-miembros.csv"; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error(errMsg(e, "No se pudo exportar")) } finally { setExporting(false) }
  }

  if (composer) {
    return (
      <div className={`pg-com${mob ? " fx" : ""}`} ref={host}>
        <Composer draft={composer.draft} mob={mob} flags={flags} status={status} onBack={() => setComposer(null)} onChanged={() => void load()}
          onTest={setTesting} onSend={setSending} />
        {testing && <TestDialog c={testing} mode={flags?.mail_mode || "dry"} onClose={() => setTesting(null)} onSend={setSending} />}
        {sending && flags && <SendDialog c={sending} flags={flags} activos={data?.activos || 0} onClose={() => setSending(null)}
          onDone={() => { setSending(null); setComposer(null); setTab("c"); void load() }} />}
      </div>
    )
  }
  const counts = { total: nTotal ?? 0, activos: data?.activos ?? 0, bajas: data?.bajas ?? 0 }
  const loaded = status === "ok" && !!data
  const right = tab === "c"
    ? (loaded && list.length ? <Attention list={list} activos={counts.activos} bajas={counts.bajas} /> : null)
    : (!mob && loaded ? <MemberFilters mq={mq} set={set} counts={counts} /> : null)
  return (
    <div className="pg-com" ref={host}>
      <div className="pg">
        <ComHeader mob={mob} exporting={exporting} onExport={() => void exportCsv()} onNew={() => setComposer({ draft: null })} />
        <ModeStrip flags={flags} status={status} />
        <ComTabs tab={tab} set={setTab} nc={loaded ? list.length : null} nm={loaded ? nTotal : null} right={right} />
        {tab === "m" && mob && loaded && <MemberFilters mq={mq} set={set} counts={counts} />}
        {tab === "c"
          ? <CampaignList list={list} status={status} error={error} mob={mob} expanded={expanded} why={why} tick={`${tick}-${list.map(c => c.estado).join()}`}
              onRetry={retry} onToggle={id => setExpanded(e => (e === id ? null : id))} onEdit={c => setComposer({ draft: c })}
              onTest={setTesting} onSend={setSending} onNew={() => setComposer({ draft: null })} />
          : <MembersBody data={data} status={status} error={error} mq={mq} set={set} mob={mob} onBaja={setBaja} onRetry={retry} onClear={() => setMq(Q0)} />}
      </div>
      {testing && <TestDialog c={testing} mode={flags?.mail_mode || "dry"} onClose={() => setTesting(null)} onSend={setSending} />}
      {sending && flags && <SendDialog c={sending} flags={flags} activos={data?.activos || 0} onClose={() => setSending(null)}
        onDone={() => { setSending(null); setTick(t => t + 1); setExpanded(null); void load() }} />}
      {baja && <BajaDialog m={baja} onClose={() => setBaja(null)} onDone={() => { setBaja(null); void load() }} />}
    </div>
  )
}
