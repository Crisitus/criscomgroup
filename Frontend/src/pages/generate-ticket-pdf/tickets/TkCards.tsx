import { Barcode, Percent, TriangleAlert } from "lucide-react"
import { money } from "../../../components/erp/format"
import { codigoTicket, nombreCategoria, num } from "../productData"
import { Cb } from "./tkCommon"
import { I } from "./tkIcon"
import { precioEfectivo } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Movil: una tarjeta por producto con los mismos datos de la tabla (sin scroll horizontal). */
export function TkCards({ p }: { p: TkPage }) {
  return (
    <div className="mlist">
      {p.enPagina.map(x => {
        const on = p.seleccion.has(x.id_producto)
        const c = codigoTicket(x)
        const precio = precioEfectivo(x)
        return (
          <article key={x.id_producto} className={`pc${on ? " on" : ""}`}>
            <Cb checked={on} label={`Seleccionar ${x.nombre}`} onToggle={() => p.alternar(x.id_producto)} />
            <div className="nm">{x.nombre}</div>
            <div className="pr">{money(precio.actual)}</div>
            <div className="meta">
              <span className="mono">{x.sku}</span>
              <span className="tag">{nombreCategoria(x)}</span>
              <span className="num">Stock {num(x.stock)}</span>
              {x.es_oferta && <span className="st acc">{I(Percent, 13)}Oferta</span>}
            </div>
            <div className="cl">
              {c.origen === "sku"
                ? <><span className="st warn">{I(TriangleAlert, 13)}SKU:</span><span className="mono">{c.texto}</span></>
                : <><span className="l1" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "hsl(var(--nav-fg-2))" }}>{I(Barcode, 14)}Código de lote</span><span className="mono">{c.texto}</span></>}
              {!c.escaneable && <span className="noscan">Se imprime solo como texto</span>}
            </div>
          </article>
        )
      })}
    </div>
  )
}
