import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { SimBody, SimFoot, SimHead, type DetailCtl } from "./SimDetail"
import { DetailSkeleton } from "./SimPanels"
import { I } from "./simParts"
import { useScrollTop } from "./useSimScroll"

/** Movil: detalle a pantalla completa con «Lista» y pie fijo («Guardar») hermano del scroll. */
export function SimMobileDetail({ c, cargando, vacio, onBack }: { c: DetailCtl | null; cargando: boolean; vacio?: ReactNode; onBack: () => void }) {
  const ref = useScrollTop(c?.r.id_solicitud ?? 0, c?.banner ?? c?.pend ?? null)
  return (
    <>
      <div className="mback"><h1>Detalle de solicitud</h1><button type="button" className="btn out" onClick={onBack}>{I(ChevronLeft, 16)}Lista</button></div>
      {cargando ? <DetailSkeleton /> : c ? (
        <>
          <div className="mdb" ref={ref}><SimHead r={c.r} /><SimBody c={c} mob /></div>
          <div className="mdf"><SimFoot c={c} mob /></div>
        </>
      ) : vacio}
    </>
  )
}
