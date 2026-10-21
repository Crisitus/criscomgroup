import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import type { EstadoEnsamble, SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import type { Draft, CampoErr } from "./sarDraft"
import { I } from "./sarParts"
import { SarBanner } from "./SarBanner"
import { SarConvert } from "./SarConvert"
import { SarFooter } from "./SarFooter"
import { SarHead } from "./SarHead"
import { SarHistory } from "./SarHistory"
import { SarManage } from "./SarManage"
import { SarOrder } from "./SarOrder"
import { DetailSkeleton } from "./SarPanels"
import type { Banner } from "./useSarDetail"
import { useSarScroll } from "./useSarScroll"

export interface DetailCtl {
  s: SolicitudEnsamble; draft: Draft; dirty: boolean; err: CampoErr; trans: EstadoEnsamble[]
  banner: Banner | null; busy: "save" | "conv" | null; rej: boolean; leave: ReactNode
  onDraft: (p: Partial<Draft>) => void; onRej: (v: boolean) => void; onSave: () => void; onConvert: () => void; onReload: () => void
}

/** Cuerpo del detalle (compartido por escritorio y movil): pedido -> cotizacion -> conversion -> historial. */
export function DetailBody({ c }: { c: DetailCtl }) {
  return (
    <>
      {c.banner && <SarBanner b={c.banner} s={c.s} onReload={c.onReload} />}
      <SarOrder s={c.s} />
      <SarManage s={c.s} d={c.draft} err={c.err} trans={c.trans} busy={c.busy === "save"} onDraft={c.onDraft} />
      <SarConvert s={c.s} busy={c.busy === "conv"} onConvert={c.onConvert} />
      <SarHistory h={c.s.historial ?? []} />
    </>
  )
}

export const DetailActions = ({ c }: { c: DetailCtl }) => (
  <SarFooter s={c.s} d={c.draft} dirty={c.dirty} busy={c.busy === "save"} rej={c.rej} onRej={c.onRej} onSave={c.onSave} />
)

export function SarDetail({ c }: { c: DetailCtl }) {
  const ref = useSarScroll(c.s.id_solicitud, c.banner)
  return (
    <section className="dp" aria-label={`Detalle de la solicitud ${c.s.codigo_seguimiento}`}>
      <SarHead s={c.s} />
      {c.leave && <div className="top-n">{c.leave}</div>}
      <div className="db" ref={ref}><DetailBody c={c} /></div>
      <div className="df"><DetailActions c={c} /></div>
    </section>
  )
}

/** Movil: detalle a pantalla completa con volver y pie de acciones fijo (hermano, no sticky). */
export function SarMobileDetail({ c, codigo, cargando, vacio, onBack }: {
  c: DetailCtl | null; codigo: string; cargando: boolean; vacio?: ReactNode; onBack: () => void
}) {
  const ref = useSarScroll(c?.s.id_solicitud ?? 0, c?.banner ?? null)
  return (
    <>
      <div className="mback"><button type="button" className="btn out" onClick={onBack}>{I(ArrowLeft, 16)}Volver a la lista</button><h1>{codigo}</h1></div>
      {cargando ? <DetailSkeleton /> : c ? (
        <>
          <div className="mdet" ref={ref}><SarHead s={c.s} />{c.leave}<DetailBody c={c} /></div>
          <div className="mf"><DetailActions c={c} /></div>
        </>
      ) : vacio}
    </>
  )
}
