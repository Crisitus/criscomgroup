import { Archive, Clock } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import { fCivil, fDT, fLarga, plazoDe } from "./libroCommon"
import { I } from "./libroParts"

/** Bloque de plazo: 15 dias habiles sin prorroga. fecha_vencimiento es una fecha civil. */
export function DetailPlazo({ r }: { r: Reclamacion }) {
  const p = plazoDe(r)
  const venc = r.fecha_vencimiento
  const reg = <div><dt>Registro</dt><dd>{fDT(r.fecha)}</dd></div>
  const ven = venc ? <div><dt>Vencimiento</dt><dd>{fCivil(venc)}</dd></div> : null

  if (r.estado === "archivado") {
    return (
      <section className="pz nu" aria-label="Plazo">
        <div className="pz1"><div><p className="pt">{I(Archive, 16)}Archivado</p><p className="ps">Sin plazo pendiente: la hoja está archivada.</p></div></div>
        <dl className="pz2">{reg}{ven}</dl>
      </section>
    )
  }
  if (r.estado === "respondido" || !p) {
    return (
      <section className={`pz ${p?.t ?? "nu"}`} aria-label="Plazo">
        <div className="pz1"><div>
          <p className="pt">{p ? I(p.icon, 18) : I(Clock, 16)}{p?.x ?? "Respondido"}</p>
          {venc && <p className="ps">El plazo {r.respondido_en_plazo ? "vencía" : "venció"} el {fLarga(venc)}.</p>}
        </div></div>
        <dl className="pz2">{reg}{ven}{r.fecha_respuesta && <div><dt>Respuesta</dt><dd>{fDT(r.fecha_respuesta)}</dd></div>}</dl>
      </section>
    )
  }
  const usados = r.vencido ? 15 : Math.min(15, Math.max(0, 15 - (r.dias_restantes ?? 0)))
  const sub = !venc ? "" : r.vencido ? `Venció el ${fLarga(venc)}` : r.dias_restantes === 0 ? `Vence hoy, ${fLarga(venc)}` : `Vence el ${fLarga(venc)}`
  return (
    <section className={`pz ${p.t}`} aria-label="Plazo">
      <div className="pz1"><span className="big">{p.big}</span><div><p className="pt">{I(p.icon, 18)}{p.x}</p><p className="ps">{sub}</p></div></div>
      <dl className="pz2">{reg}{ven}</dl>
      <div className="bar" role="img" aria-label={`${usados} de 15 días hábiles transcurridos`}><i style={{ width: `${(usados / 15) * 100}%` }} /></div>
    </section>
  )
}
