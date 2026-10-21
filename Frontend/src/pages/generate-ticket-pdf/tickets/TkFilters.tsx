import { CircleCheck, FilterX, Package, Percent, Search, SlidersHorizontal } from "lucide-react"
import { ORDENES_TICKET } from "../productFilters"
import { Chip, Sel } from "./tkCommon"
import { I } from "./tkIcon"
import { contadoresChips, cuentaFiltros } from "./tkLogic"
import type { TkPage } from "./useTkPage"

const ordenes = (): Array<[string, string]> => ORDENES_TICKET.map(o => [o.value, o.label])

const Buscar = ({ p }: { p: TkPage }) => (
  <label className="fld q">{I(Search, 16)}
    <input type="search" value={p.f.busqueda} placeholder="Nombre o SKU" aria-label="Buscar por nombre o SKU"
      onChange={e => p.cambiar("busqueda", e.target.value)} />
  </label>
)

const Categoria = ({ p, w }: { p: TkPage; w: number | string }) => {
  const todos = p.datos.productos
  const opciones: Array<[string, string]> = [
    ["", `Todas las categorías (${todos.length})`],
    ["sin_categoria", `Sin categoría (${todos.filter(x => !x.categoria?.nombre).length})`],
    ...p.datos.categorias.map((c): [string, string] => [c, `${c} (${todos.filter(x => x.categoria?.nombre === c).length})`]),
  ]
  return <Sel label="Categoría" width={w} value={p.f.categoria} onChange={v => p.cambiar("categoria", v)} opciones={opciones} />
}

const Precio = ({ p }: { p: TkPage }) => (
  <>
    <label className="fld rng">
      <input inputMode="decimal" value={p.f.precioMin} placeholder="Mín. S/" aria-label="Precio mínimo con IGV"
        onChange={e => p.cambiar("precioMin", e.target.value)} />
    </label>
    <label className="fld rng">
      <input inputMode="decimal" value={p.f.precioMax} placeholder="Máx. S/" aria-label="Precio máximo con IGV"
        onChange={e => p.cambiar("precioMax", e.target.value)} />
    </label>
  </>
)

const Chips = ({ p }: { p: TkPage }) => {
  const cnt = contadoresChips(p.datos.productos)
  return (
    <>
      <Chip label="Solo con stock" n={cnt.stock} on={p.f.soloConStock}
        icono={I(p.f.soloConStock ? CircleCheck : Package, 16)} onToggle={() => p.cambiar("soloConStock", !p.f.soloConStock)} />
      <Chip label="Solo en oferta" n={cnt.oferta} on={p.f.soloOfertas}
        icono={I(Percent, 16)} onToggle={() => p.cambiar("soloOfertas", !p.f.soloOfertas)} />
    </>
  )
}

const Limpiar = ({ p }: { p: TkPage }) => (
  <button type="button" className="btn out sm" aria-disabled={p.sucio ? undefined : true}
    onClick={() => { if (p.sucio) p.limpiarFiltros() }}>{I(FilterX, 16)}Limpiar filtros</button>
)

/** Filtros en UNA linea (escritorio); a <1100 px las acciones de seleccion suben a la segunda linea. */
export function TkFilters({ p, compacto, acciones }: { p: TkPage; compacto: boolean; acciones?: React.ReactNode }) {
  if (compacto) {
    return (
      <>
        <div className="fbar" role="search"><Buscar p={p} /><Categoria p={p} w={184} /><Sel label="Ordenar por" width={168} value={p.f.ordenamiento} onChange={v => p.cambiar("ordenamiento", v)} opciones={ordenes()} /><Precio p={p} /></div>
        <div className="fbar"><Chips p={p} />{acciones && <div style={{ marginLeft: "auto" }} className="sa">{acciones}</div>}</div>
      </>
    )
  }
  return (
    <div className="fbar" role="search">
      <Buscar p={p} /><Categoria p={p} w={176} /><Sel label="Ordenar por" width={176} value={p.f.ordenamiento} onChange={v => p.cambiar("ordenamiento", v)} opciones={ordenes()} /><Precio p={p} /><Chips p={p} />
    </div>
  )
}

/** Movil: buscador + boton «Filtros (N)» que despliega categoria, orden, precio, chips y limpiar. */
export function TkFiltersMovil({ p, abierto, onToggle }: { p: TkPage; abierto: boolean; onToggle: () => void }) {
  const n = cuentaFiltros(p.f)
  return (
    <>
      <div className="mrow">
        <Buscar p={p} />
        <button type="button" className="btn out" aria-expanded={abierto} onClick={onToggle}>{I(SlidersHorizontal, 16)}Filtros{n > 0 ? ` (${n})` : ""}</button>
      </div>
      {abierto && (
        <div className="tcard mf" role="group" aria-label="Filtros">
          <Categoria p={p} w="100%" />
          <Sel label="Ordenar por" width="100%" value={p.f.ordenamiento} onChange={v => p.cambiar("ordenamiento", v)} opciones={ordenes()} />
          <Precio p={p} />
          <Chips p={p} />
          <Limpiar p={p} />
        </div>
      )}
    </>
  )
}
