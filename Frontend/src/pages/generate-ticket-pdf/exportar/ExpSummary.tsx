import { useState } from "react"
import { CircleCheck, Info, TriangleAlert } from "lucide-react"
import type { Product } from "../../../services/productService"
import { I } from "./expCommon"
import { pl } from "./expFormat"
import { sumaLotes } from "./expLogic"
import type { ExpPage } from "./useExpPage"

/** Resumen de seleccion en una linea + «Seleccionar todos / Deseleccionar todos» + aviso de fuera del filtro. */
export function ExpSummary({ p }: { p: ExpPage }) {
  const n = p.aExportar.length
  const m = p.filtrados.length
  return (
    <>
      <div className="sbar">
        <div className="sum">
          <span className="a num">{I(n ? CircleCheck : Info, 16)}{n} {pl(n, "seleccionado", "seleccionados")}</span>
          <span className="b num">{m} {pl(m, "filtrado", "filtrados")} · {p.datos.productos.length} en total · <b>{p.avisos.unidades} {pl(p.avisos.unidades, "unidad", "unidades")}</b></span>
        </div>
        <div className="sa">
          <button type="button" className="btn out sm" aria-disabled={m ? undefined : true} onClick={() => { if (m) p.marcarTodos() }}>Seleccionar todos ({m})</button>
          <button type="button" className="btn out sm" aria-disabled={p.seleccion.size ? undefined : true} onClick={() => { if (p.seleccion.size) p.deseleccionar() }}>Deseleccionar todos</button>
        </div>
      </div>
      {p.fuera > 0 && (
        <div className="avs" role="status">{I(Info, 16)}
          <span className="t num">{p.fuera} {pl(p.fuera, "seleccionado fuera del filtro no se exporta", "seleccionados fuera del filtro no se exportan")}. «Deseleccionar todos» {pl(p.fuera, "lo quita", "los quita")} también.</span>
        </div>
      )}
    </>
  )
}

function Aviso({ texto, lista, items }: { texto: React.ReactNode; lista: (p: Product) => React.ReactNode; items: Product[] }) {
  const [ver, setVer] = useState(false)
  return (
    <>
      <div className="avs">{I(TriangleAlert, 16)}<span className="t num">{texto}</span>
        <button type="button" className="lk" aria-expanded={ver} onClick={() => setVer(v => !v)}>{ver ? "Ocultar" : "Ver cuáles"}</button>
      </div>
      {ver && <div className="vc"><ul>{items.map(x => <li key={x.id_producto} title={x.nombre}>{lista(x)}</li>)}</ul></div>}
    </>
  )
}

/** Avisos compactos pegados a la lista: sin codigo de barras y lotes que no suman el stock. */
export function ExpAvisos({ p }: { p: ExpPage }) {
  const { sinCodigo, lotes } = p.avisos
  const n = p.aExportar.length
  if (n === 0) return null
  return (
    <>
      {sinCodigo.length > 0 && (
        <Aviso items={sinCodigo} lista={x => <><b>{x.sku}</b> · {x.nombre}</>}
          texto={<><b>{sinCodigo.length} de {n}</b> {pl(sinCodigo.length, "seleccionado no tiene", "seleccionados no tienen")} código de barras: en el Excel aparecerá su SKU.</>} />
      )}
      {lotes.length > 0 && (
        <Aviso items={lotes} lista={x => <><b>{x.sku}</b> · lotes {sumaLotes(x)} ≠ stock {x.stock}</>}
          texto={<><b>{lotes.length}</b> {pl(lotes.length, "producto", "productos")}: los lotes no suman el stock; Cantidad usa el stock.</>} />
      )}
    </>
  )
}
