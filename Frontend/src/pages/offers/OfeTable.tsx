import { useEffect, useRef, type ReactNode } from "react"
import { CircleAlert } from "lucide-react"
import { SEP, money, type OfeRow } from "./ofeCalc"
import { I } from "./ofeShared"
import { MarginCell, OfferCell, RowAction, Stock } from "./OfeCells"
import { rowView, type RowCtx } from "./ofeRow"

const COLS = ["k0", "", "k2", "k3", "k4", "k5", "k6"]

export function OfeColgroup() {
  return <colgroup>{COLS.map((c, i) => <col key={i} className={c} />)}</colgroup>
}

export function OfeTable({ rows, x, footer, onAllPage }: { rows: OfeRow[]; x: RowCtx; footer: ReactNode; onAllPage: (on: boolean) => void }) {
  const last = useRef<number | null>(null)
  const head = useRef<HTMLInputElement>(null)
  const usable = rows.filter(r => r.normal > 0)
  const nSel = usable.filter(r => x.sel.includes(r.id)).length
  const all = usable.length > 0 && nSel === usable.length
  useEffect(() => { if (head.current) head.current.indeterminate = nSel > 0 && !all }, [nSel, all])

  const pick = (r: OfeRow, i: number, shift: boolean) => {
    if (shift && last.current !== null) {
      const a = Math.min(last.current, i), b = Math.max(last.current, i)
      x.setMany(rows.slice(a, b + 1).filter(y => y.normal > 0).map(y => y.id), !x.sel.includes(r.id))
    } else x.onPick(r)
    last.current = i
  }
  return (
    <div className="tcard">
      <table className="tb">
        <OfeColgroup />
        <thead>
          <tr>
            <th><input ref={head} className="cbx" type="checkbox" checked={all} disabled={!usable.length} aria-label={`Seleccionar los ${usable.length} de esta página`} onChange={() => onAllPage(!all)} /></th>
            <th>Producto</th><th className="r">Stock</th><th className="r">Precio normal</th><th>Oferta actual</th>
            <th className="r" title="Margen sobre el costo promedio neto">Margen</th><th className="r"><span className="sr">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const v = rowView(r, x)
            return [
              <tr key={r.id} className={v.on ? "sl" : undefined}>
                <td>
                  <input
                    className="cbx" type="checkbox" checked={v.on} disabled={v.dis} aria-label={`Seleccionar ${r.p.nombre}`}
                    aria-describedby={v.dis ? `why-${r.id}` : undefined}
                    onChange={() => undefined} onClick={e => pick(r, i, e.shiftKey)}
                  />
                </td>
                <td><div className="stk"><span className="nm">{r.p.nombre}</span><span className="sub">{r.p.sku}{SEP}{r.p.categoria?.nombre || "—"}</span></div></td>
                <td className="r"><Stock r={r} /></td>
                <td className="r"><div className="stk rt"><span className="a num">{money(r.normal)}</span>{r.mayor !== null && <span className="sub num">May. {money(r.mayor)}</span>}</div></td>
                <td><OfferCell r={r} v={v} x={x} /></td>
                <td className="r"><MarginCell r={r} v={v} x={x} /></td>
                <td className="r"><RowAction r={r} v={v} x={x} /></td>
              </tr>,
              v.c?.err && x.mode === "fix" && !x.hasResult && (
                <tr key={`e${r.id}`} className="er"><td colSpan={7}><span id={`e-${r.id}`}>{I(CircleAlert, 16)}{v.c.err}</span></td></tr>
              ),
            ]
          })}
        </tbody>
      </table>
      {footer}
    </div>
  )
}
