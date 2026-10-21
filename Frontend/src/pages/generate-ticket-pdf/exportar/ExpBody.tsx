import { ExpArchive } from "./ExpArchive"
import { ExpCards } from "./ExpCards"
import { ExpFilters, ExpFiltersMovil } from "./ExpFilters"
import { ExpHeader } from "./ExpHeader"
import { ExpBottomBar, ExpMobileSummary, ExpSheet } from "./ExpMobile"
import { ExpResult } from "./ExpResult"
import { ExpEsqueleto, ExpError, ExpSinPermiso, ExpSinResultados, ExpVacio } from "./ExpStates"
import { ExpAvisos, ExpSummary } from "./ExpSummary"
import { ExpTable } from "./ExpTable"
import type { ExpPage } from "./useExpPage"

/** Estados que reemplazan la lista (la cabecera y el h1 se conservan siempre). */
function Estado({ p, movil }: { p: ExpPage; movil: boolean }) {
  if (p.fase === "loading") return <ExpEsqueleto movil={movil} />
  if (p.fase === "vacio") return <ExpVacio />
  if (p.fase === "403") return <ExpSinPermiso />
  return <ExpError mensaje={p.datos.error ?? ""} onReintentar={p.datos.reintentar} />
}

const sinResultados = (p: ExpPage) => (
  <ExpSinResultados total={p.datos.productos.length} conStock={p.f.soloConStock} onLimpiar={p.limpiarFiltros} />
)

export function ExpDesktop({ p, compacto }: { p: ExpPage; compacto: boolean }) {
  return (
    <div className="pg">
      <ExpHeader cantidad={p.aExportar.length} motivo={p.motivo} busy={p.busy} cargando={p.fase === "loading"} onDescargar={() => void p.descargar()} movil={false} />
      {p.resultado && <ExpResult r={p.resultado} />}
      {p.fase !== "ok" ? <Estado p={p} movil={false} /> : (
        <>
          <ExpFilters p={p} compacto={compacto} />
          <div className="cols">
            <section className="tcard lst">
              <ExpSummary p={p} />
              <ExpAvisos p={p} />
              {p.filtrados.length ? <ExpTable productos={p.filtrados} seleccion={p.seleccion} compacto={compacto} onAlternar={p.alternar} onLista={p.marcarLista} /> : sinResultados(p)}
            </section>
            <ExpArchive p={p} />
          </div>
        </>
      )}
    </div>
  )
}

interface MovilProps { p: ExpPage; filtros: boolean; onFiltros: () => void; hoja: boolean; onHoja: (abierta: boolean) => void; barRef: React.RefObject<HTMLDivElement | null> }

export function ExpMovil({ p, filtros, onFiltros, hoja, onHoja, barRef }: MovilProps) {
  return (
    <>
      <div className="zone">
        <div className="pg">
          <ExpHeader cantidad={p.aExportar.length} motivo={p.motivo} busy={p.busy} cargando={p.fase === "loading"} onDescargar={() => void p.descargar()} movil onArchivo={p.fase === "ok" ? () => onHoja(true) : undefined} />
          {p.resultado && <ExpResult r={p.resultado} />}
          {p.fase !== "ok" ? <Estado p={p} movil /> : (
            <>
              <ExpFiltersMovil p={p} abierto={filtros} onToggle={onFiltros} />
              <ExpMobileSummary p={p} />
              {p.filtrados.length ? <ExpCards productos={p.filtrados} seleccion={p.seleccion} onAlternar={p.alternar} /> : sinResultados(p)}
            </>
          )}
        </div>
      </div>
      {hoja && p.fase === "ok" && <ExpSheet p={p} onClose={() => onHoja(false)} />}
      <ExpBottomBar p={p} barRef={barRef} />
    </>
  )
}
