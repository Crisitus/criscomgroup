import { Info, X } from "lucide-react"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Contador UNICO de la seleccion: «N seleccionados · C copias · E etiquetas · H hojas A4». */
export function TkContador({ p, corto }: { p: TkPage; corto?: boolean }) {
  if (p.n === 0) {
    return <div className="cnt">0 seleccionados<span className="mut"> · elige productos de la tabla</span></div>
  }
  const base = `${p.n} ${pl(p.n, "seleccionado", "seleccionados")} · ${p.config.copias} ${pl(p.config.copias, "copia", "copias")}`
  if (corto) return <div className="cnt num">{base}</div>
  return <div className="cnt num">{base} · {p.etiquetas} {pl(p.etiquetas, "etiqueta", "etiquetas")} · {p.hojas} {pl(p.hojas, "hoja", "hojas")} A4</div>
}

/** Acciones de seleccion: Todos / Pagina actual / Deseleccionar todos / Limpiar filtros. */
export function TkSelAcciones({ p }: { p: TkPage }) {
  const cnt = p.filtrados.length
  const pg = p.enPagina.length
  return (
    <div className="sa">
      <button type="button" className="lnk" aria-disabled={cnt ? undefined : true} onClick={() => { if (cnt) p.marcarTodos() }}>Todos ({cnt})</button>
      <button type="button" className="lnk" aria-disabled={pg ? undefined : true} onClick={() => { if (pg) p.marcarPagina(true) }}>Página actual ({pg})</button>
      <button type="button" className="lnk" aria-disabled={p.n ? undefined : true} onClick={() => { if (p.n) p.deseleccionar() }}>Deseleccionar todos</button>
      <button type="button" className="lnk" aria-disabled={p.sucio ? undefined : true} onClick={() => { if (p.sucio) p.limpiarFiltros() }}>Limpiar filtros</button>
    </div>
  )
}

/** Fila contador + acciones (en compacto las acciones van en la segunda linea de filtros). */
export function TkSelBar({ p, compacto }: { p: TkPage; compacto: boolean }) {
  if (compacto) return <div className="selbar"><TkContador p={p} /></div>
  return <div className="selbar"><TkContador p={p} /><TkSelAcciones p={p} /></div>
}

/** Aviso de seleccionados que el filtro actual ya no muestra: SI se imprimen, con «Quitarlos». */
export function TkFueraFiltro({ p }: { p: TkPage }) {
  const m = p.fuera.length
  if (m === 0) return null
  return (
    <div className="out-of" role="status">{I(Info, 16)}
      <span><b className="num">{m}</b> {pl(m, "seleccionado", "seleccionados")} fuera del filtro actual también {pl(m, "se imprime", "se imprimen")}.</span>
      <button type="button" className="lnk" onClick={p.quitarFuera}>{I(X, 16)}Quitarlos</button>
    </div>
  )
}
