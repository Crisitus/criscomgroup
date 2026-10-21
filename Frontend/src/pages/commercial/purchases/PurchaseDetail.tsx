import { Ban, Info, X } from "lucide-react"
import { EstChip, I, SEP, TIMES, fd, ft, money, pl, type Purchase } from "./purchasesShared"

export function PurchaseDetail({ p, onClose, onVoid }: { p: Purchase; onClose: () => void; onVoid: () => void }) {
  const anu = p.estado !== "recibida"
  const usd = p.moneda === "USD"
  const lines = p.detalles.map(d => {
    const q = Number(d.cantidad)
    const right = usd ? q * Number(d.costo_unitario) : Number(d.subtotal)
    return (
      <div className="dline" key={d.id_compra_detalle}>
        <div><div style={{ fontWeight: 600, lineHeight: 1.35 }}>{d.producto?.nombre || `Producto ${d.producto_id}`}</div><div className="sub num">{d.producto?.sku}</div></div>
        <div className="rg"><b className="num">{money(right, p.moneda)}</b>
          <span className="sub num">{q} {TIMES} {money(d.costo_unitario, p.moneda)}{SEP}asignado {money(d.costo_asignado, "PEN")}</span></div>
      </div>
    )
  })
  return (
    <aside className="pnl" data-testid="purchase-detail">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 className="num">{p.numero}</h2><EstChip e={p.estado} /></div>
        <button type="button" className="ib" aria-label="Cerrar detalle" onClick={onClose}>{I(X, 20)}</button>
      </div>
      <div className="pb2">
        <div className="meta">
          <div><div className="k">Proveedor</div><div className="v">{p.proveedor?.razon_social}</div></div>
          <div><div className="k">Documento</div><div className="v num">{p.documento || "Sin documento"}</div></div>
          <div><div className="k">Fecha y hora</div><div className="v num">{fd(p.fecha)}{SEP}{ft(p.fecha)}</div></div>
          <div><div className="k">Moneda</div><div className="v">{p.moneda}{usd && <span className="num"> (TC {Number(p.tipo_cambio).toFixed(4)})</span>}</div></div>
          {p.notas && <div style={{ gridColumn: "1/-1" }}><div className="k">Notas</div><div className="v" style={{ fontWeight: 500, whiteSpace: "pre-line" }}>{p.notas}</div></div>}
        </div>
        <div><div className="k" style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>{pl(p.detalles.length, "línea", "líneas")}</div>{lines}</div>
        <div className="dtot">
          <div className="ln"><span>Costos adicionales</span><b className="num">{money(p.costos_adicionales, p.moneda)}</b></div>
          <div className="big"><span>Total</span><b className="num">{money(p.total, p.moneda)}</b></div>
        </div>
        {anu && <div className="why" id="why-anular">{I(Info)}<span>Solo se pueden anular compras en estado Recibida; esta ya está Anulada.</span></div>}
      </div>
      <div className="pf">
        <button type="button" className="btn out" aria-disabled={anu} aria-describedby={anu ? "why-anular" : undefined} onClick={() => { if (!anu) onVoid() }}>{I(Ban)}Anular compra</button>
        <button type="button" className="btn out" onClick={onClose}>Cerrar</button>
      </div>
    </aside>
  )
}
