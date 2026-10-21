import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { DetailActions, DetailBody, DetailHead, DetailSkeleton, type DetailCtl } from "./LibroDetail"
import { useScrollTop } from "./useScrollTop"
import { I } from "./libroParts"

/** Movil: detalle a pantalla completa con volver y pie de acciones fijo (hermano, no sticky). */
export function LibroMobileDetail({ c, codigo, cargando, vacio, onBack }: {
  c: DetailCtl | null; codigo: string; cargando: boolean; vacio?: ReactNode; onBack: () => void
}) {
  const ref = useScrollTop(c?.r.id_reclamo ?? 0, c?.banner ?? null)
  return (
    <>
      <div className="mback"><button type="button" className="btn out" onClick={onBack}>{I(ArrowLeft, 16)}Volver a la lista</button><h1>{codigo}</h1></div>
      {cargando ? <DetailSkeleton /> : c ? (
        <>
          <div className="mdet" ref={ref}><DetailHead r={c.r} /><DetailBody c={c} /></div>
          <div className="mf"><DetailActions c={c} /></div>
        </>
      ) : vacio}
    </>
  )
}
