import type { KeyboardEvent } from "react"
import { Dash, Margin, Price, StockCell, Tags, Thumb } from "./prodParts"
import { ProdMenu, type MenuActs } from "./ProdMenu"
import { money, type Row } from "./prodShared"

export interface ListProps {
  rows: Row[]; hl: number | null; ro: boolean; acts: MenuActs
  menuId: number | null; setMenuId: (id: number | null) => void; onView: (url: string, name: string) => void
}

const COLS = (
  <colgroup><col className="c-img" /><col /><col className="c-cat" /><col className="c-cos" /><col className="c-mar" /><col className="c-pre" /><col className="c-may" /><col className="c-stk" /><col className="c-act" /></colgroup>
)

export function ProdTable({ rows, hl, ro, acts, menuId, setMenuId, onView }: ListProps) {
  const key = (r: Row) => (e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); acts.open(r) } }
  return (
    <table className="tb">
      {COLS}
      <thead>
        <tr>
          <th scope="col"><span className="sr">Imagen</span></th><th scope="col">Producto</th><th scope="col">Categoría</th>
          <th scope="col" className="r">Costo promedio</th><th scope="col" className="r">Margen</th><th scope="col" className="r">Precio con IGV</th>
          <th scope="col" className="r">Mayorista</th><th scope="col">Stock</th><th scope="col"><span className="sr">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className={`rw${hl === r.id ? " hl" : ""}`} tabIndex={0} aria-label={`Abrir ficha de ${r.p.nombre}`} onClick={() => acts.open(r)} onKeyDown={key(r)}>
            <td><Thumb r={r} onView={onView} /></td>
            <td><div className="pn"><div className="l1"><span className="sku">{r.p.sku}</span><Tags r={r} /></div><div className="nm" title={r.p.nombre}>{r.p.nombre}</div></div></td>
            <td>{r.p.categoria?.nombre || "Sin categoría"}</td>
            <td className="r num">{r.costo > 0 ? money(r.costo) : <Dash label="Sin costo" />}</td>
            <td className="r"><Margin r={r} /></td>
            <td className="r"><Price r={r} /></td>
            <td className="r num">{r.mayor !== null ? money(r.mayor) : <Dash label="Sin precio mayorista" />}</td>
            <td><StockCell r={r} /></td>
            <td><ProdMenu r={r} ro={ro} acts={acts} openId={menuId} setOpenId={setMenuId} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
