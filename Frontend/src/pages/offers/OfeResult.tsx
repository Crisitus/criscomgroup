import { CircleCheck, CircleMinus, CircleX, RefreshCw, TriangleAlert } from "lucide-react"
import type { OfferItemState } from "../../services/offerService"
import { SEP, plu, type OfeRow } from "./ofeCalc"
import { Chip, I, type Tone } from "./ofeShared"
import type { Result } from "./useOfeActions"

const E: Record<OfferItemState, [Tone, typeof CircleCheck, string]> = {
  aplicada: ["ok", CircleCheck, "Aplicada"],
  omitida: ["warn", CircleMinus, "Omitida"],
  error: ["bad", CircleX, "Error"],
}

function texts(r: Result, a: number, o: number, e: number) {
  const q = r.kind === "quit"
  if (r.fatal) return { head: q ? "No se quitó ninguna oferta" : "No se aplicó ninguna oferta", sub: r.fatal }
  const parts = [plu(a, q ? "oferta quitada" : "aplicada", q ? "ofertas quitadas" : "aplicadas")]
  if (e) parts.push(plu(e, "error", "errores"))
  if (o) parts.push(e && !q ? `${plu(o, "omitida", "omitidas")} por el error` : plu(o, "omitida", "omitidas"))
  const head = parts.join(SEP)
  if (!q) {
    return {
      head,
      sub: r.ok ? "Los precios ya cambiaron en la tienda web y en caja."
        : "No se aplicó ninguna (atómico): los precios no cambiaron. Corrige la fila con error y reintenta el lote completo.",
    }
  }
  if (r.ok) return { head, sub: "Los productos vuelven a su precio normal en la tienda web y en caja." }
  if (a > 0) return { head, sub: `Resultado parcial: se ${a === 1 ? "quitó 1 oferta" : `quitaron ${a} ofertas`}; ${plu(o + e, "producto sin cambios", "productos sin cambios")}.` }
  return { head, sub: r.message || "No se quitó ninguna oferta." }
}

export function OfeResult({ res, byId, onClose, onRetry }: { res: Result; byId: Map<number, OfeRow>; onClose: () => void; onRetry: () => void }) {
  const cnt = (k: OfferItemState) => res.items.filter(i => i.estado === k).length
  const a = cnt("aplicada"), o = cnt("omitida"), e = cnt("error")
  const { head, sub } = texts(res, a, o, e)
  const bad = !!res.fatal || e > 0 || (res.kind === "apply" && !res.ok)
  const icon: [Tone, typeof CircleCheck] = bad ? ["bad", CircleX] : o ? ["warn", TriangleAlert] : ["ok", CircleCheck]
  return (
    <section className="rcard" aria-live="polite" aria-label="Resultado del lote">
      <div className="rhd">
        <div className="tt"><b><span className={`st ${icon[0]}`} style={{ padding: 0, background: "none" }}>{I(icon[1], 20)}</span>{head}</b><p>{sub}</p></div>
        <div className="acts">
          {res.kind === "apply" && bad && <button type="button" className="btn" onClick={onRetry}>{I(RefreshCw, 16)}{res.fatal ? "Reintentar" : "Corregir el error y reintentar"}</button>}
          <button type="button" className="btn out" onClick={onClose}>Cerrar</button>
        </div>
      </div>
      {res.items.map(i => {
        const r = byId.get(i.id)
        const k = E[i.estado]
        return (
          <div key={i.id} className="rr">
            <div className="stk"><span className="nm">{r?.p.nombre || `Producto #${i.id}`}</span><span className="sub">{r?.p.sku || ""}</span></div>
            <Chip k={k[0]} icon={k[1]} t={k[2]} />
            {i.estado === "aplicada" ? <span className="why num">{i.txt || ""}</span> : <span className={`why${i.estado === "error" ? " bad" : ""}`}>{i.motivo}</span>}
          </div>
        )
      })}
    </section>
  )
}
