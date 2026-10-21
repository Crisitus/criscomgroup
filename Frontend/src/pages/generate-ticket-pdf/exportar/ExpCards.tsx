import { TriangleAlert } from "lucide-react"
import type { Product } from "../../../services/productService"
import { lotesNoCuadran, nombreCategoria, num } from "../productData"
import { Cb } from "./ExpControls"
import { Codigo } from "./ExpTable"
import { I } from "./expCommon"
import { sumaLotes } from "./expLogic"

/** Movil: una tarjeta por producto con los mismos datos de la tabla. */
export function ExpCards({ productos, seleccion, onAlternar }: { productos: Product[]; seleccion: Set<number>; onAlternar: (id: number) => void }) {
  return (
    <div className="cards">
      {productos.map(p => {
        const on = seleccion.has(p.id_producto)
        return (
          <article key={p.id_producto} className={`tcard mc${on ? " on" : ""}`}>
            <div className="cbw"><Cb st={on} label={`Seleccionar ${p.nombre}`} onToggle={() => onAlternar(p.id_producto)} /></div>
            <div><div className="nm">{p.nombre}</div><div className="rw"><span>{p.sku}</span><span className="tag">{nombreCategoria(p)}</span></div></div>
            <div className="stc"><b className="num">{num(p.stock)}</b><span>Stock</span></div>
            <div className="cds"><span className="mut">Código</span><Codigo p={p} /></div>
            {lotesNoCuadran(p) && <div className="wr">{I(TriangleAlert, 13)}Lotes suman {sumaLotes(p)}, stock {num(p.stock)}</div>}
          </article>
        )
      })}
    </div>
  )
}
