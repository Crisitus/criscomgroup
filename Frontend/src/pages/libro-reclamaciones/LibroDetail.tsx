import { Inbox, User } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import { tipoTxt } from "./libroCommon"
import { EstadoChip, I, PlazoChip } from "./libroParts"
import { DetailFicha } from "./DetailFicha"
import { DetailFooter } from "./DetailFooter"
import { DetailPlazo } from "./DetailPlazo"
import { DetailRespuesta } from "./DetailRespuesta"
import { LibroBanner } from "./LibroBanner"
import { useScrollTop } from "./useScrollTop"
import type { Banner } from "./useLibroDetail"

export function DetailHead({ r }: { r: Reclamacion }) {
  return (
    <div className="dh">
      <div className="dh1"><span className="cd">{r.codigo}</span><span className="tp">{tipoTxt(r.tipo)}</span><PlazoChip r={r} lg /><EstadoChip e={r.estado} lg /></div>
      <h2>{r.nombre}</h2>
      {r.es_menor && <p className="ml">{I(User, 14)}Menor de edad · representado por {r.apoderado || "su apoderado"}</p>}
    </div>
  )
}

export const DetailSkeleton = () => (
  <section className="dp" role="status" aria-label="Cargando detalle">
    <div className="skb">
      <div className="sk" style={{ width: "40%", height: 16 }} /><div className="sk" style={{ width: "60%", height: 22 }} />
      <div className="sk" style={{ height: 96, borderRadius: 8 }} /><div className="sk" style={{ height: 38, borderRadius: 8 }} />
      <div className="sk" style={{ height: 38, borderRadius: 8 }} /><div className="sk" style={{ height: 120, borderRadius: 8 }} />
    </div>
  </section>
)

export const DetailEmpty = () => (
  <section className="dp"><div className="em"><span className="ico">{I(Inbox, 22)}</span><h3>Ninguna hoja seleccionada</h3><p>Cuando haya resultados, elige una hoja de la lista para ver su detalle.</p></div></section>
)

export interface DetailCtl {
  r: Reclamacion; banner: Banner | null; draft: string; fieldErr: string; busy: "proc" | "send" | "arc" | null
  onDraft: (v: string) => void; onReload: () => void; onProc: () => void; onSend: () => void; onArchive: () => void
}

/** Cuerpo del detalle (compartido por escritorio y movil). */
export function DetailBody({ c }: { c: DetailCtl }) {
  return (
    <>
      {c.banner && <LibroBanner b={c.banner} r={c.r} onReload={c.onReload} />}
      <DetailPlazo r={c.r} />
      <DetailFicha key={c.r.id_reclamo} r={c.r} />
      <DetailRespuesta r={c.r} draft={c.draft} error={c.fieldErr} busy={c.busy === "send"} onDraft={c.onDraft} />
    </>
  )
}

export function DetailActions({ c }: { c: DetailCtl }) {
  return <DetailFooter r={c.r} len={[...c.draft].length} busy={c.busy} onProc={c.onProc} onSend={c.onSend} onArchive={c.onArchive} />
}

export function LibroDetail({ c }: { c: DetailCtl }) {
  const ref = useScrollTop(c.r.id_reclamo, c.banner)
  return (
    <section className="dp" aria-label={`Detalle de la hoja ${c.r.codigo}`}>
      <DetailHead r={c.r} />
      <div className="db" ref={ref}><DetailBody c={c} /></div>
      <div className="df"><DetailActions c={c} /></div>
    </section>
  )
}
