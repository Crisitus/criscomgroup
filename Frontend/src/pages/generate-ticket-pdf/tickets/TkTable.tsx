import { Barcode, ChevronLeft, ChevronRight, Percent, TriangleAlert } from "lucide-react"
import type { Product } from "../../../services/productService"
import { money } from "../../../components/erp/format"
import { codigoTicket, nombreCategoria, num } from "../productData"
import { Cb } from "./tkCommon"
import { I } from "./tkIcon"
import { precioEfectivo } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Celda «Codigo en el ticket»: el lote elegido o «SKU:» en ambar, antes de descargar. */
export function CodigoTicketCelda({ p }: { p: Product }) {
  const c = codigoTicket(p)
  return (
    <div className="cod">
      {c.origen === "sku"
        ? <span className="st warn">{I(TriangleAlert, 13)}SKU:</span>
        : <span className="l1">{I(Barcode, 14)}Código de lote</span>}
      <span className="mono">{c.texto}</span>
      {!c.escaneable && <span className="noscan">Se imprime solo como texto</span>}
    </div>
  )
}

/** Paginacion de 25: «a–b de T productos» + anterior/siguiente (44 px). */
export function TkPager({ p }: { p: TkPage }) {
  const total = p.filtrados.length
  const a = total === 0 ? 0 : (p.paginaActual - 1) * 25 + 1
  const b = Math.min(total, p.paginaActual * 25)
  return (
    <div className="pager">
      <span className="num">{total ? `${a}–${b}` : 0} de {total} {pl2(total)}</span>
      <div className="pn">
        <button type="button" className="ib bd" aria-label="Página anterior" aria-disabled={p.paginaActual <= 1 || undefined}
          onClick={() => { if (p.paginaActual > 1) p.setPagina(p.paginaActual - 1) }}>{I(ChevronLeft, 18)}</button>
        <span className="num" style={{ padding: "0 6px" }}>Página {p.paginaActual} de {p.totalPaginas}</span>
        <button type="button" className="ib bd" aria-label="Página siguiente" aria-disabled={p.paginaActual >= p.totalPaginas || undefined}
          onClick={() => { if (p.paginaActual < p.totalPaginas) p.setPagina(p.paginaActual + 1) }}>{I(ChevronRight, 18)}</button>
      </div>
    </div>
  )
}
const pl2 = (n: number) => (n === 1 ? "producto" : "productos")

const ANCHOS = { desk: [44, 0, 116, 90, 90, 52, 80, 140], lap: [44, 0, 118, 90, 88, 46, 80, 126] }

/** Tabla de escritorio: las 8 columnas visibles sin scroll horizontal (Producto se lleva el resto). */
export function TkTable({ p, compacto }: { p: TkPage; compacto: boolean }) {
  const rows = p.enPagina
  const marcados = rows.filter(x => p.seleccion.has(x.id_producto)).length
  const cabecera = rows.length > 0 && marcados === rows.length
  const mezcla = !cabecera && marcados > 0
  const anchos = compacto ? ANCHOS.lap : ANCHOS.desk
  return (
    <table className="tb">
      <colgroup>{anchos.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
      <thead>
        <tr>
          <th><Cb checked={cabecera} indeterminate={mezcla} label="Seleccionar la página actual" onToggle={() => p.marcarPagina(!cabecera)} /></th>
          <th>Producto</th><th>SKU</th><th>Categoría</th><th className="r">Precio con IGV</th><th className="r">Stock</th><th>Oferta</th><th>Código en el ticket</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(x => {
          const on = p.seleccion.has(x.id_producto)
          const precio = precioEfectivo(x)
          return (
            <tr key={x.id_producto} className={on ? "on" : ""}>
              <td><Cb checked={on} label={`Seleccionar ${x.nombre}`} onToggle={() => p.alternar(x.id_producto)} /></td>
              <td><div className="nm">{x.nombre}</div></td>
              <td><span className="mono">{x.sku}</span></td>
              <td><span className="cat">{nombreCategoria(x)}</span></td>
              <td className="r"><span className="pr">{money(precio.actual)}</span>
                {precio.antes !== null && <div className="num mut" style={{ fontSize: 11.5, textDecoration: "line-through" }}>{money(precio.antes)}</div>}</td>
              <td className="r num">{num(x.stock)}</td>
              <td>{x.es_oferta ? <span className="st acc">{I(Percent, 13)}Oferta</span> : <span className="mut" aria-label="Sin oferta">—</span>}</td>
              <td><CodigoTicketCelda p={x} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
