import { TriangleAlert } from "lucide-react"
import type { Product } from "../../../services/productService"
import { codigosDe, nombreCategoria, num, sinCodigoBarras, lotesNoCuadran } from "../productData"
import { Cb } from "./ExpControls"
import { I } from "./expCommon"
import { sumaLotes } from "./expLogic"

interface Props {
  productos: Product[]
  seleccion: Set<number>
  compacto: boolean
  onAlternar: (id: number) => void
  onLista: (marcar: boolean) => void
}

export const Codigo = ({ p }: { p: Product }) =>
  sinCodigoBarras(p) ? <><span className="tag sku">SKU</span><span>{p.sku}</span></> : <span>{codigosDe(p).join(", ")}</span>

/** Tabla de seleccion (escritorio): una fila de 48 px por producto, sin scroll horizontal. */
export function ExpTable({ productos, seleccion, compacto, onAlternar, onLista }: Props) {
  const marcados = productos.filter(p => seleccion.has(p.id_producto)).length
  const cabecera = marcados === 0 ? false : marcados === productos.length ? true : "mixed"
  const anchos = compacto ? [52, 0, 96, 150, 56] : [52, 0, 118, 190, 64]
  return (
    <table className="tb">
      <colgroup>{anchos.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
      <thead>
        <tr>
          <th className="cbc"><Cb st={cabecera} label="Seleccionar todos los productos del filtro" onToggle={() => onLista(cabecera !== true)} /></th>
          <th>Producto</th><th>Categoría</th><th>Código de barras</th><th className="r">Stock</th>
        </tr>
      </thead>
      <tbody>
        {productos.map(p => {
          const on = seleccion.has(p.id_producto)
          return (
            <tr key={p.id_producto} className={on ? "on" : ""}>
              <td className="cbc"><Cb st={on} label={`Seleccionar ${p.nombre}`} onToggle={() => onAlternar(p.id_producto)} /></td>
              <td><div className="stk"><span className="nm" title={p.nombre}>{p.nombre}</span><span className="sk">{p.sku}</span></div></td>
              <td>{nombreCategoria(p)}</td>
              <td><div className="cd"><div className="l1"><Codigo p={p} /></div>
                {lotesNoCuadran(p) && <div className="l2">{I(TriangleAlert, 13)}Lotes suman {sumaLotes(p)}</div>}</div></td>
              <td className="r num">{num(p.stock)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
