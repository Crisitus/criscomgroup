import { useState } from "react"
import { ArrowDownToLine, CircleAlert } from "lucide-react"
import { ErpDialog } from "../../components/erp/ErpDialog"
import type { Product } from "../../services/productService"
import type { Acquisition } from "../../services/acquisitionService"
import { ARROW, I, PRUEBA, Q, SEP, sol } from "./acqShared"
import { ProductPicker, elegibles } from "./AcqPick"

export function IngresarDialog({ a, products, busy, error, onClose, onConfirm }: {
  a: Acquisition; products: Product[]; busy: boolean; error: string; onClose: () => void; onConfirm: (productoId: number) => void
}) {
  const [pick, setPick] = useState<number | null>(a.producto_id ?? null)
  const list = elegibles(products)
  const p = products.find(x => x.id_producto === pick)
  const name = [a.marca, a.modelo].filter(Boolean).join(" ") || a.numero_serie
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title="Asignar producto e ingresar al stock">
      <div className="pg-adquisiciones dlgw"><div className="dlg">
        <div className="r2">{name}{SEP}Serie {a.numero_serie}{SEP}Prueba {PRUEBA[a.prueba_funcional][0]}</div>
        <ProductPicker products={list} value={pick} onChange={setPick} label="Producto del inventario" err={!!error} />
        {p
          ? <div className="cons" role="status">Se sumará <b>1 unidad</b> al stock de <b>{Q(p.nombre)}</b> ({p.stock} {ARROW} {p.stock + 1}) con costo <b>{sol(a.monto_adquisicion)}</b>. Después no se podrán cambiar el producto, el monto, el tipo ni la serie.</div>
          : <span className="hint" id="ing-h">Elige un producto para habilitar la acción.</span>}
        {error && <span className="why bad" role="alert">{I(CircleAlert, 16)}<span>{error}</span></span>}
        <div className="ft">
          <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn" aria-disabled={!p || busy} aria-describedby={p ? undefined : "ing-h"} onClick={() => { if (p && !busy) onConfirm(p.id_producto) }}>{I(ArrowDownToLine)}Ingresar al stock</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
