import type { SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { fDT } from "./simCommon"
import { SimBanners } from "./SimBanners"
import { SimFooter } from "./SimFooter"
import { convInfo } from "./simConv"
import { SimSecCot } from "./SimSecCot"
import { SimSecEstado } from "./SimSecEstado"
import { SimSecHist, SimSecNotas } from "./SimSecHist"
import { SimSecPedido } from "./SimSecPedido"
import { EstadoChip, UrgChip, VencidaChip } from "./simParts"
import type { Draft, Errs } from "./simForm"
import type { Banner } from "./useSimDetail"
import { useScrollTop } from "./useSimScroll"

export interface DetailCtl {
  r: Sol; d: Draft; errs: Errs; banner: Banner | null; dirty: boolean; busy: "save" | "conv" | null
  pend: { cod: string; que: string } | null
  onPatch: (c: Partial<Draft>) => void; onSave: () => void; onConvertir: () => void; onReload: () => void
  onDiscard: () => void; onKeep: () => void
}

export function SimHead({ r }: { r: Sol }) {
  return (
    <div className="dh">
      <div className="dh1"><span className="cd">{r.codigo_seguimiento}</span><EstadoChip e={r.estado} lg /><UrgChip u={r.nivel_urgencia} lg />{r.vencida && <VencidaChip lg />}</div>
      <h2>{r.nombre_producto}</h2>
      {r.created_at && <div className="sub">Solicitada el {fDT(r.created_at)}</div>}
    </div>
  )
}

export function SimBody({ c, mob }: { c: DetailCtl; mob: boolean }) {
  const k = `d${c.r.id_solicitud}`
  const cv = convInfo({ r: c.r, k, busy: c.busy === "conv", onConvertir: c.onConvertir })
  const hay = c.pend || Object.keys(c.errs).length || c.banner
  return (
    <>
      {hay ? <SimBanners k={k} errs={c.errs} banner={c.banner} pend={c.pend} onReload={c.onReload} onDiscard={c.onDiscard} onKeep={c.onKeep} /> : null}
      <SimSecPedido r={c.r} k={k} />
      <SimSecEstado r={c.r} k={k} sel={c.d.estado} onSel={estado => c.onPatch({ estado })} />
      <SimSecCot r={c.r} k={k} d={c.d} errs={c.errs} onPatch={c.onPatch} />
      {mob && <section className="sec"><h3>Importación</h3><div className="t1" id={cv.id || undefined}>{cv.txt}</div><div className="acts">{cv.ctl}</div></section>}
      <SimSecNotas r={c.r} k={k} d={c.d} errs={c.errs} onPatch={c.onPatch} />
      <SimSecHist r={c.r} k={k} />
    </>
  )
}

export function SimFoot({ c, mob }: { c: DetailCtl; mob: boolean }) {
  return <SimFooter r={c.r} k={`d${c.r.id_solicitud}`} d={c.d} dirty={c.dirty} busy={c.busy} mob={mob} onSave={c.onSave} onConvertir={c.onConvertir} />
}

export function SimDetail({ c }: { c: DetailCtl }) {
  const ref = useScrollTop(c.r.id_solicitud, c.banner ?? c.pend)
  return (
    <section className="dp" aria-label={`Detalle de la solicitud ${c.r.codigo_seguimiento}`}>
      <SimHead r={c.r} />
      <div className="db" ref={ref}><SimBody c={c} mob={false} /></div>
      <SimFoot c={c} mob={false} />
    </section>
  )
}
