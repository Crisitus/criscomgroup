import { ArrowDownToLine, ArrowUpFromLine, History, Lock, LockOpen, type LucideIcon } from "lucide-react"
import type { Movement, MovType } from "./types"
import { I, MINUS, SEP, fd, ftime, plural } from "./shared"

export const TIPO: Record<MovType, [string, LucideIcon, 1 | -1]> = {
  compra: ["Compra", ArrowDownToLine, 1],
  venta: ["Venta", ArrowUpFromLine, -1],
  ajuste_entrada: ["Ajuste de entrada", ArrowDownToLine, 1],
  ajuste_salida: ["Ajuste de salida", ArrowUpFromLine, -1],
  reserva: ["Reserva", Lock, -1],
  liberacion: ["Liberación", LockOpen, 1],
}
const FALLBACK: [string, LucideIcon, 1 | -1] = ["Movimiento", ArrowDownToLine, 1]
export const tipoOf = (t: string) => TIPO[t as MovType] ?? FALLBACK
export const signed = (m: Movement) => `${tipoOf(m.tipo)[2] > 0 ? "+" : MINUS}${m.cantidad}`

export function MovRow({ m, full }: { m: Movement; full?: boolean }) {
  const [label, Icon] = tipoOf(m.tipo)
  return (
    <div className="hr">
      <div>
        <div className="l1"><span className="st neu">{I(Icon, 14)}{label}</span><span>{fd(m.creado_en)}{full ? `${SEP}${ftime(m.creado_en)}` : ""}</span></div>
        <div className="l2">{m.motivo || "Sin motivo registrado"}</div>
        {full && m.costo_unitario != null && <div className="hint">Costo unitario S/ {Number(m.costo_unitario).toFixed(2)}</div>}
      </div>
      <div className="q"><b>{signed(m)}</b><span>{m.stock_anterior} {"\u2192"} {m.stock_nuevo}</span></div>
    </div>
  )
}

export function HistoryCard({ items, loading, onAll }: { items: Movement[]; loading: boolean; onAll: () => void }) {
  return (
    <section className="card" aria-labelledby="h-historial">
      <div className="ch">
        <h2 id="h-historial">Historial</h2>
        {items.length > 0 && <button type="button" className="lnk" onClick={onAll}>{I(History)}Ver todo ({items.length})</button>}
      </div>
      {loading ? <div className="empty" role="status">Cargando movimientos…</div>
        : items.length ? items.slice(0, 5).map(m => <MovRow key={m.id_movimiento} m={m} />)
        : <div className="empty">Sin movimientos registrados.</div>}
      {items.length > 5 && <div className="tot"><span>Últimos 5 de {plural(items.length, "movimiento", "movimientos")}</span></div>}
    </section>
  )
}
