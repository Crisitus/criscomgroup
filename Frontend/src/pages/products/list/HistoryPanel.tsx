import { useQuery } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowDownUp, ArrowUpFromLine, CircleAlert, X } from "lucide-react"
import { commercialApi } from "../../../services/commercialService"
import { I, MINUS, SEP, errMsg, fdt, pl, type Row } from "./prodShared"

interface Mov { id_movimiento: number; tipo: string; cantidad: number; stock_anterior: number; stock_nuevo: number; motivo: string | null; creado_en: string }
const LABEL: Record<string, string> = {
  compra: "Compra", venta: "Venta", ajuste_entrada: "Ajuste de entrada", ajuste_salida: "Ajuste de salida", reserva: "Reserva", liberacion: "Liberación",
}

export function HistoryPanel({ r, ro, onClose, onAdjust }: { r: Row; ro: boolean; onClose: () => void; onAdjust: () => void }) {
  const q = useQuery({ queryKey: ["product-movements", r.id], queryFn: () => commercialApi.movements({ producto_id: r.id, limit: 100 }), gcTime: 0 })
  const movs = (q.data || []) as Mov[]
  return (
    <div className="pg-prod dlgw drw">
      <aside className="pnl">
        <div className="dh">
          <div><h3>Historial de movimientos</h3><div className="sk"><span className="sku">{r.p.sku}</span>{SEP}{r.p.nombre}</div></div>
          <button type="button" className="ib" aria-label="Cerrar historial" onClick={onClose}>{I(X, 20)}</button>
        </div>
        <div className="db">
          <div className="rowx sb" style={{ marginBottom: 12 }}>
            <div><span className="mut" style={{ fontSize: 13 }}>Stock actual</span><div style={{ fontSize: 24, fontWeight: 650, lineHeight: 1.2 }} className="num">{r.p.stock}</div></div>
            <button type="button" className="btn out sm" aria-disabled={ro} aria-describedby={ro ? "why-off" : undefined} onClick={() => { if (!ro) onAdjust() }}>{I(ArrowDownUp)}Ajustar stock</button>
          </div>
          {q.isLoading && <p className="mut" role="status">Cargando movimientos...</p>}
          {q.isError && <div className="err-box" role="alert">{I(CircleAlert, 18)}<span>{errMsg(q.error, "No se pudo cargar el historial")}</span><button type="button" className="btn out sm" style={{ marginLeft: "auto" }} onClick={() => void q.refetch()}>Reintentar</button></div>}
          {q.isSuccess && !movs.length && <p className="mut">Este producto aún no tiene movimientos de inventario.</p>}
          {movs.length > 0 && (
            <>
              <div className="lst" role="list">
                {movs.map(m => {
                  const d = m.stock_nuevo - m.stock_anterior
                  return (
                    <div className="lr" role="listitem" key={m.id_movimiento}>
                      <span className="thumb" style={{ borderRadius: "50%" }}>{I(d >= 0 ? ArrowDownToLine : ArrowUpFromLine, 16)}</span>
                      <div className="t"><b>{LABEL[m.tipo] || m.tipo}</b><span>{m.motivo ? `${m.motivo}${SEP}` : ""}{fdt(m.creado_en)}</span></div>
                      <div className="u num">{d > 0 ? "+" : d < 0 ? MINUS : ""}{m.cantidad}<small>queda en {m.stock_nuevo}</small></div>
                    </div>
                  )
                })}
              </div>
              <div className="tfoot num" style={{ border: 0, paddingLeft: 0 }}>Mostrando {pl(movs.length, "movimiento", "movimientos")}</div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
