import { CircleCheck, ChevronDown, SlidersHorizontal, TriangleAlert } from "lucide-react"
import { useId, type ReactNode } from "react"
import type { Ficha, Metrics } from "./types"
import { I, SEP, plural, Q } from "./shared"
import { money } from "../../../components/erp/format"

export function StockCard({ p, metrics, minimo, usa, suma, count, recalc, mob, onAdjust }: {
  p: Ficha
  metrics: Metrics | null
  minimo: number
  usa: boolean
  suma: number
  count: number
  recalc: boolean
  mob: boolean
  onAdjust: () => void
}) {
  const so = useId()
  const bajo = minimo > 0 && p.stock <= minimo
  const st = bajo
    ? <span className="st bad">{I(TriangleAlert, 14)}Bajo el mínimo ({minimo})</span>
    : <span className="st ok">{I(CircleCheck, 14)}{minimo > 0 ? `Sobre el mínimo (${minimo})` : "Sin mínimo definido"}</span>
  const blocked = usa
  let note: ReactNode
  if (usa && recalc) note = <div className="note warn" id={so} role="status">{I(TriangleAlert)}<span>El stock ({p.stock}) no coincide con la suma de sus códigos ({suma}). Al guardar la ficha se recalcula a {suma}.</span></div>
  else if (usa && suma !== p.stock) note = <div className="note warn" id={so} role="status">{I(TriangleAlert)}<span>Al guardar, el stock pasará de {p.stock} a {suma} (suma de sus {plural(count, "código", "códigos")}).</span></div>
  else if (usa) note = <p className="hint" id={so} style={{ marginTop: 8 }}>Suma de sus {plural(count, "código", "códigos")}. Para cambiarlo, edita las cantidades de los códigos.</p>
  else note = <p className="hint" id={so} style={{ marginTop: 8 }}>Sin códigos de barras: el stock se cambia solo con {Q("Ajustar stock")} y queda en el historial.</p>
  const quants = metrics?.quants ?? []
  const sinUbicar = metrics?.stock_sin_ubicar ?? p.stock
  const valor = metrics ? metrics.valor_stock : p.stock * (Number(p.costo_promedio) || 0)
  return (
    <section className="card stk" aria-labelledby="h-stock">
      <div className="ch">
        <h2 id="h-stock">Stock</h2>
        <button type="button" className="btn out sm" aria-disabled={blocked} aria-describedby={blocked ? so : undefined} onClick={() => { if (!blocked) onAdjust() }}>
          {I(SlidersHorizontal)}Ajustar stock
        </button>
      </div>
      <div className="big"><div><span className="n">{p.stock}</span><span className="u">unidades</span></div>{st}</div>
      {note}
      <div className="mny" style={{ ["--n" as string]: 3 }}>
        <div><div className="l">Reservado</div><div className="v">{metrics?.stock_reservado ?? 0}</div></div>
        <div><div className="l">Sin ubicar</div><div className="v">{sinUbicar}</div></div>
        <div><div className="l">Valor del stock</div><div className="v">{money(valor)}</div></div>
      </div>
      <details className="ub" open={!mob}>
        <summary>Ubicaciones ({quants.length}){I(ChevronDown)}</summary>
        {quants.length ? quants.map(q => (
          <div className="ur" key={q.id_quant_inventario}>
            <div><div className="u1">{q.ubicacion?.nombre ?? "Ubicación"}</div><div className="hint">{q.lote ? `Lote ${q.lote}` : "Sin lote"}{q.numero_serie ? `${SEP}Serie ${q.numero_serie}` : ""}</div></div>
            <b className="num">{q.disponible} uds.</b>
          </div>
        )) : <div className="ur"><span>Sin ubicaciones asignadas: las {sinUbicar} uds. están sin ubicar.</span></div>}
      </details>
    </section>
  )
}
