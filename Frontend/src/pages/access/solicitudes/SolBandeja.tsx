import { useState } from "react"
import { Lock, RefreshCw, TriangleAlert } from "lucide-react"
import type { SolRequest, SolStatus } from "./solCommon"
import { SolAlert, SolEmpty, SolRetry, SolSkeleton } from "./SolEstados"
import { SolConfirm, type SolConfirmData } from "./SolConfirm"
import { SolRow } from "./SolRow"
import type { SolOutcome } from "./useSolAccess"

const TABS: [SolStatus, string][] = [["pending", "Pendientes"], ["approved", "Aprobadas"], ["rejected", "Rechazadas"]]
const EMPTY_TEXT: Record<SolStatus, [string, string]> = {
  pending: ["No hay solicitudes pendientes", "Cuando alguien pida un área, aparecerá aquí para aprobarla o rechazarla."],
  approved: ["No hay solicitudes aprobadas", "Las que apruebes aparecerán aquí con su vigencia."],
  rejected: ["No hay solicitudes rechazadas", "Las que rechaces aparecerán aquí."],
}
const I = (Icon: typeof Lock, size = 18) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />

/** Bandeja «Solicitudes para aprobar» (solo es_maestra): pestañas con contador y confirmación en línea. */
export function SolBandeja({ status, rows, onReload, onResolve }: {
  status: "load" | "ok" | "err"; rows: SolRequest[]; onReload: () => void
  onResolve: (id: number, status: "approved" | "rejected", days: number) => Promise<SolOutcome>
}) {
  const [tab, setTab] = useState<SolStatus>("pending")
  const [days, setDays] = useState<Record<number, number>>({})
  const [confirm, setConfirm] = useState<SolConfirmData | null>(null)
  const [banner, setBanner] = useState<"409" | "403" | null>(null)
  const [busy, setBusy] = useState(false)

  const counts = (s: SolStatus) => rows.filter(r => r.status === s).length
  const list = rows.filter(r => r.status === tab)

  const doResolve = async () => {
    if (!confirm) return
    setBusy(true)
    const status = confirm.kind === "apr" ? "approved" : "rejected"
    const d = confirm.kind === "apr" ? confirm.days : 0
    const r = await onResolve(confirm.req.id_request, status, d)
    setBusy(false)
    if (r.ok) { setConfirm(null); setBanner(null); return }
    if (r.status === 409) { setConfirm(null); setBanner("409"); return }
    if (r.status === 403) { setConfirm(null); setBanner("403"); return }
    setConfirm(null)
  }

  let body: React.ReactNode
  if (status === "load") body = <div className="cp"><SolSkeleton shapes={["h", "h", "h"]} /></div>
  else if (status === "err") body = <div className="cp"><SolRetry title="No pudimos cargar las solicitudes" detail="El servidor respondió con un error. Las solicitudes pendientes no se perdieron." onRetry={onReload} /></div>
  else if (!list.length) body = <SolEmpty title={EMPTY_TEXT[tab][0]} centered>{EMPTY_TEXT[tab][1]}</SolEmpty>
  else body = (
    <ul className="rqs" aria-labelledby="h-tray">
      {list.map(r => (
        <SolRow key={r.id_request} r={r} tab={tab} days={days[r.id_request] ?? 7} disabled={busy || banner === "403"}
          onDays={n => setDays(d => ({ ...d, [r.id_request]: n }))}
          onApprove={() => setConfirm({ kind: "apr", req: r, days: days[r.id_request] ?? 7 })}
          onReject={() => setConfirm({ kind: tab === "approved" ? "rev" : "rej", req: r })} />
      ))}
    </ul>
  )

  return (
    <section className="card tray trayc" aria-labelledby="h-tray">
      <div className="th">
        <h2 id="h-tray">Solicitudes para aprobar</h2>
        <div className="chips" role="tablist" aria-label="Estado de las solicitudes">
          {TABS.map(([k, l]) => (
            <button key={k} className="chip" role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}>
              {l} <b>{counts(k)}</b>
            </button>
          ))}
        </div>
      </div>
      {banner === "409" && (
        <div className="cp" style={{ paddingBottom: 4 }}>
          <SolAlert tone="warn" icon={I(TriangleAlert)} title="Esta solicitud ya fue resuelta."
            extra={<button className="btn out" type="button" onClick={() => { setBanner(null); onReload() }}>{I(RefreshCw, 16)}Recargar solicitudes</button>}>
            Otro puesto la resolvió mientras la mirabas y tu acción no se aplicó. Recarga para ver su estado actual.
          </SolAlert>
        </div>
      )}
      {banner === "403" && (
        <div className="cp" style={{ paddingBottom: 4 }}>
          <SolAlert tone="bad" icon={I(Lock)} title="Solo la cuenta maestra aprueba accesos especiales (403).">
            Tu sesión ya no es la de la cuenta maestra real, así que no puedes resolver solicitudes. Pídele a la cuenta maestra que lo haga.
          </SolAlert>
        </div>
      )}
      {body}
      {confirm && <SolConfirm data={confirm} busy={busy} onCancel={() => setConfirm(null)} onOk={() => void doResolve()} />}
    </section>
  )
}
