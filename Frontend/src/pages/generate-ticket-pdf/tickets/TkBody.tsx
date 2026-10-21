import { AvSinCodigo, AvExceso, AvGeneracion, AvInvalidos } from "./TkAvisos"
import { TkFilters } from "./TkFilters"
import { TkHeader } from "./TkHeader"
import { TkFiltersMovil } from "./TkFilters"
import { TkMovil } from "./TkMobile"
import { TkPanel } from "./TkPanel"
import { TkPreview } from "./TkPreview"
import { TkFueraFiltro, TkSelAcciones, TkSelBar } from "./TkSelBar"
import { TkError, TkEsqueleto, TkSinPermiso, TkSinResultados, TkVacio } from "./TkStates"
import { TkPager, TkTable } from "./TkTable"
import type { TkPage } from "./useTkPage"

/** Estados que reemplazan la lista; la cabecera y los filtros (deshabilitados) se conservan. */
function Estado({ p, compacto }: { p: TkPage; compacto: boolean }) {
  const filtros = (
    <fieldset className="pk" disabled>
      <TkFilters p={p} compacto={compacto} acciones={compacto ? <TkSelAcciones p={p} /> : undefined} />
    </fieldset>
  )
  if (p.fase === "loading") {
    return (
      <>
        {filtros}
        <div className="cols">
          <div style={{ minWidth: 0 }}><TkEsqueleto /></div>
          <TkPanel p={p} compacto={compacto} />
        </div>
      </>
    )
  }
  return (
    <>
      {filtros}
      {p.fase === "403" && <TkSinPermiso />}
      {p.fase === "error" && <TkError mensaje={p.datos.error ?? ""} onReintentar={p.datos.reintentar} />}
      {p.fase === "vacio" && <TkVacio />}
    </>
  )
}

export function TkDesktop({ p, compacto }: { p: TkPage; compacto: boolean }) {
  return (
    <div className="pg">
      <TkHeader p={p} movil={false} onVista={() => void p.ejecutar("vista")} />
      {p.fase !== "ok" ? <Estado p={p} compacto={compacto} /> : (
        <>
          <TkFilters p={p} compacto={compacto} acciones={compacto ? <TkSelAcciones p={p} /> : undefined} />
          <TkSelBar p={p} compacto={compacto} />
          <AvExceso p={p} />
          <AvGeneracion p={p} />
          <TkFueraFiltro p={p} />
          <div className="cols">
            <div style={{ minWidth: 0 }}>
              {p.filtrados.length ? (
                <div className="tcard">
                  <AvSinCodigo p={p} />
                  <AvInvalidos invalidos={p.datos.invalidos} />
                  <TkTable p={p} compacto={compacto} />
                  <TkPager p={p} />
                </div>
              ) : <TkSinResultados onLimpiar={p.limpiarFiltros} />}
            </div>
            <TkPanel p={p} compacto={compacto} />
          </div>
        </>
      )}
      <TkPreview p={p} />
    </div>
  )
}

interface MovilProps {
  p: TkPage
  filtros: boolean
  onFiltros: () => void
  hoja: boolean
  onHoja: (abierta: boolean) => void
  barRef: React.RefObject<HTMLDivElement | null>
}

export function TkMovilEnv({ p, filtros, onFiltros, hoja, onHoja, barRef }: MovilProps) {
  const estado = (
    <>
      <TkHeader p={p} movil onVista={() => void p.ejecutar("vista")} />
      {p.fase === "loading" && <fieldset className="pk" disabled><TkFiltersMovil p={p} abierto={filtros} onToggle={onFiltros} /></fieldset>}
      {p.fase === "loading" && <TkEsqueleto />}
      {p.fase === "403" && <TkSinPermiso />}
      {p.fase === "error" && <TkError mensaje={p.datos.error ?? ""} onReintentar={p.datos.reintentar} />}
      {p.fase === "vacio" && <TkVacio />}
    </>
  )
  return <TkMovil p={p} filtros={filtros} onFiltros={onFiltros} hoja={hoja} onHoja={onHoja} barRef={barRef} estado={estado} />
}
