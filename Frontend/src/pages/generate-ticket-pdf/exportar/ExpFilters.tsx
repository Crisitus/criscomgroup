import { FilterX, Search, SlidersHorizontal } from "lucide-react"
import { ORDENES_BASE } from "../productFilters"
import { Chip, Sel } from "./ExpControls"
import { I } from "./expCommon"
import { cuentaFiltros } from "./expLogic"
import type { ExpPage } from "./useExpPage"

const ordenes = (): Array<[string, string]> => ORDENES_BASE.map(o => [o.value, o.label])

const Buscar = ({ p }: { p: ExpPage }) => (
  <label className="fld">{I(Search, 16)}
    <input type="search" value={p.f.busqueda} placeholder="Nombre o SKU" aria-label="Buscar por nombre o SKU" onChange={e => p.cambiar("busqueda", e.target.value)} />
  </label>
)

const Categoria = ({ p, w }: { p: ExpPage; w: number | string }) => (
  <Sel label="Categoría" width={w} value={p.f.categoria || ""} onChange={v => p.cambiar("categoria", v)}
    opciones={[["", "Todas las categorías"], ["sin_categoria", "Sin categoría"], ...p.datos.categorias.map((c): [string, string] => [c, c])]} />
)

const Chips = ({ p, oferta }: { p: ExpPage; oferta: string }) => (
  <>
    <Chip label="Con stock" n={p.cnt.stock} on={p.f.soloConStock} onToggle={() => p.cambiar("soloConStock", !p.f.soloConStock)} />
    <Chip label={oferta} n={p.cnt.oferta} on={p.f.soloOfertas} onToggle={() => p.cambiar("soloOfertas", !p.f.soloOfertas)} />
    <Chip label="Modificados" n={p.cnt.modif} on={p.f.soloModificados} onToggle={() => p.cambiar("soloModificados", !p.f.soloModificados)} />
  </>
)

const Limpiar = ({ p, compacto }: { p: ExpPage; compacto: boolean }) => {
  const props = { type: "button" as const, "aria-disabled": p.sucio ? undefined : true, onClick: () => { if (p.sucio) p.limpiarFiltros() } }
  return compacto
    ? <button {...props} className="ib" aria-label="Limpiar filtros">{I(FilterX, 16)}</button>
    : <button {...props} className="btn out sm">{I(FilterX, 16)}Limpiar filtros</button>
}

/** Una sola linea de filtros (escritorio). A <1100 px el limpiar pasa a icono (clase .lap del diseño). */
export function ExpFilters({ p, compacto }: { p: ExpPage; compacto: boolean }) {
  return (
    <div className="fbar" role="search">
      <Buscar p={p} />
      <Categoria p={p} w={compacto ? 186 : 176} />
      <Sel label="Orden" width={compacto ? 168 : 176} value={p.f.ordenamiento} onChange={v => p.cambiar("ordenamiento", v)} opciones={ordenes()} />
      <Chips p={p} oferta={compacto ? "Ofertas" : "En oferta"} />
      <Limpiar p={p} compacto={compacto} />
    </div>
  )
}

/** Movil: buscador + boton «Filtros (N)» que despliega categoria, orden, chips y limpiar. */
export function ExpFiltersMovil({ p, abierto, onToggle }: { p: ExpPage; abierto: boolean; onToggle: () => void }) {
  const n = cuentaFiltros(p.f)
  return (
    <>
      <div className="fbar">
        <Buscar p={p} />
        <button type="button" className="btn out" aria-expanded={abierto} onClick={onToggle}>{I(SlidersHorizontal, 16)}Filtros ({n})</button>
      </div>
      {abierto && (
        <div className="tcard mfl" role="group" aria-label="Filtros">
          <Categoria p={p} w={170} />
          <Sel label="Orden" width={170} value={p.f.ordenamiento} onChange={v => p.cambiar("ordenamiento", v)} opciones={ordenes()} />
          <Chips p={p} oferta="En oferta" />
          <Limpiar p={p} compacto={false} />
        </div>
      )}
    </>
  )
}
