import { CircleAlert, Trash2 } from "lucide-react"
import { I, SEP, money, num, type StockProduct } from "./quotesShared"
import type { FormLine } from "./quoteFormCalc"

const Err = ({ id, t }: { id: string; t?: string }) => t ? <span className="err" id={id}>{I(CircleAlert, 14)}{t}</span> : null

export function QuoteFormLines({ lines, products, errs, onAdd, onSet, onDel }: {
  lines: FormLine[]; products: StockProduct[]; errs: Record<string, string>
  onAdd: (id: number) => void; onSet: (id: number, patch: Partial<FormLine>) => void; onDel: (id: number) => void
}) {
  const used = new Set(lines.map(l => l.id))
  return (
    <section className="card sec" aria-labelledby="h-prd">
      <h3 id="h-prd">Productos</h3>
      <label className="fld"><span>Agregar producto</span>
        <select className="sl" value="" aria-invalid={!!errs.lines} onChange={e => { if (e.target.value) onAdd(Number(e.target.value)) }}>
          <option value="">Elegir producto…</option>
          {products.map(p => {
            const u = used.has(p.id_producto), none = Number(p.stock) < 1
            return <option key={p.id_producto} value={p.id_producto} disabled={u || none}>{p.nombre} — {money(p.precio_unitario_con_igv)}{SEP}{none ? "sin stock" : `stock ${p.stock}`}{u ? `${SEP}ya agregado` : ""}</option>
          })}
        </select>
      </label>
      <Err id="e-lines" t={errs.lines} />
      {lines.length > 0 ? (
        <>
          <div className="ln h" aria-hidden="true"><span>Producto</span><span className="r">Cantidad</span><span className="r">Precio con IGV</span><span className="r">Subtotal</span><span /></div>
          {lines.map(l => {
            const p = products.find(x => x.id_producto === l.id)
            if (!p) return null
            const eq = errs[`q${l.id}`], ep = errs[`p${l.id}`]
            return (
              <div className="ln" key={l.id}>
                <div className="nm"><span>{p.nombre}</span><small>{p.sku}{SEP}stock {p.stock}</small><Err id={`e-q${l.id}`} t={eq} /><Err id={`e-p${l.id}`} t={ep} /></div>
                <label className="fld ca"><span className="lb">Cantidad</span>
                  <input className="in num" type="number" min={1} step={1} inputMode="numeric" value={l.cant} aria-label={`Cantidad de ${p.nombre}`}
                    aria-invalid={!!eq} aria-describedby={eq ? `e-q${l.id}` : undefined} onChange={e => onSet(l.id, { cant: e.target.value })} /></label>
                <label className="fld pr"><span className="lb">Precio con IGV (S/)</span>
                  <input className="in num" type="number" min={0} step="0.01" inputMode="decimal" value={l.precio} aria-label={`Precio con IGV de ${p.nombre}`}
                    aria-invalid={!!ep} aria-describedby={ep ? `e-p${l.id}` : undefined} onChange={e => onSet(l.id, { precio: e.target.value })} /></label>
                <div className="su num"><span className="lb">Subtotal&nbsp;</span>{money(num(l.cant) * num(l.precio))}</div>
                <button type="button" className="btn out sq dx" aria-label={`Quitar ${p.nombre}`} onClick={() => onDel(l.id)}>{I(Trash2, 16)}</button>
              </div>
            )
          })}
        </>
      ) : !errs.lines && <p className="mut">Aún no hay productos en la cotización.</p>}
    </section>
  )
}
