import { useMemo, useState } from "react"
import { X } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import { ErpDrawer } from "../../../components/erp/ErpDialog"
import type { Movement } from "./types"
import { I, SEP, plural } from "./shared"
import { MovRow } from "./HistoryCard"

type F = "todos" | "compras" | "ventas" | "ajustes" | "reservas"
const OF: Record<F, (t: string) => boolean> = {
  todos: () => true,
  compras: t => t === "compra",
  ventas: t => t === "venta",
  ajustes: t => t.startsWith("ajuste"),
  reservas: t => t === "reserva" || t === "liberacion",
}
const LABEL: Record<F, string> = { todos: "Todos", compras: "Compras", ventas: "Ventas", ajustes: "Ajustes", reservas: "Reservas" }

export function HistoryPanel({ name, sku, items, onClose }: { name: string; sku: string; items: Movement[]; onClose: () => void }) {
  const [f, setF] = useState<F>("todos")
  const counts = useMemo(() => Object.fromEntries((Object.keys(OF) as F[]).map(k => [k, items.filter(m => OF[k](m.tipo)).length])) as Record<F, number>, [items])
  const chips = (Object.keys(OF) as F[]).filter(k => k === "todos" || counts[k] > 0)
  const list = items.filter(m => OF[f](m.tipo))
  return (
    <ErpDrawer open onOpenChange={o => { if (!o) onClose() }} label="Historial de movimientos">
      <div className="pg-ficha dlgw drw">
        <aside className="pnl">
          <div className="ph">
            <div><h2>Historial de movimientos</h2><div className="hint">{name}{SEP}{sku}</div></div>
            <Dialog.Close asChild><button type="button" className="ib" aria-label="Cerrar historial">{I(X, 20)}</button></Dialog.Close>
          </div>
          <div className="chips" role="tablist" aria-label="Filtrar por tipo">
            {chips.map(k => <button key={k} type="button" className="chip" role="tab" aria-selected={f === k} onClick={() => setF(k)}>{LABEL[k]} <b>{counts[k]}</b></button>)}
          </div>
          <div className="body">
            {list.length ? list.map(m => <MovRow key={m.id_movimiento} m={m} full />) : <div className="empty">Sin movimientos de este tipo.</div>}
          </div>
          <div className="ft">{plural(list.length, "movimiento", "movimientos")}</div>
        </aside>
      </div>
    </ErpDrawer>
  )
}
