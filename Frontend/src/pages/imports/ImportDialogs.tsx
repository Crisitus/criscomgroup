import { useState } from "react"
import { CircleAlert, CircleX, PackageCheck, Trash2 } from "lucide-react"
import { ErpDialog } from "../../components/erp/ErpDialog"
import type { Product } from "../../services/productService"
import type { ImportRecord } from "../../services/importService"
import { I, SEP, enSoles, ft, sol, unit, uds } from "./importsShared"

export type DlgKind = "recibir" | "cancelar" | "eliminar" | "bloq"
const ARROW = "\u2192"

export function ImportDialog({ kind, o, products, busy, msg, onClose, onReceive, onCancel, onDelete }: {
  kind: DlgKind; o: ImportRecord; products: Product[]; busy: boolean; msg?: string
  onClose: () => void; onReceive: (productoId: number) => void; onCancel: () => void; onDelete: () => void
}) {
  const [pick, setPick] = useState("")
  const close = (open: boolean) => { if (!open) onClose() }
  const wrap = (children: React.ReactNode) => <div className="pg-importaciones dlgw"><div className="dlg">{children}</div></div>
  const ft2 = (ok: React.ReactNode) => <div className="ft"><button type="button" className="btn out" onClick={onClose}>Cancelar</button>{ok}</div>

  if (kind === "recibir") {
    const p = o.producto || null
    if (!p) {
      const chosen = products.find(x => String(x.id_producto) === pick)
      return (
        <ErpDialog open onOpenChange={close} title={`Marcar ${o.referencia} como recibida`}>
          {wrap(<>
            <div className="why bad" role="alert">{I(CircleAlert)}<span>No se puede recibir: esta importación no tiene producto, y el stock necesita saber qué producto ingresa. Asígnalo para continuar.</span></div>
            <label className="fld"><span>Producto que ingresa <i>*</i></span>
              <select className="sl" value={pick} onChange={e => setPick(e.target.value)}>
                <option value="">Elige un producto</option>
                {products.map(x => <option key={x.id_producto} value={x.id_producto}>{x.nombre}{SEP}{x.sku}{SEP}stock {x.stock}</option>)}
              </select></label>
            <span className="hint" id="rc-hint">{chosen ? `Se asignará ${chosen.nombre} y entrarán ${uds(o.cantidad)} al stock: ${chosen.stock} ${ARROW} ${chosen.stock + o.cantidad}.` : "Elige un producto para habilitar la acción."}</span>
            {ft2(<button type="button" className="btn" aria-disabled={!chosen || busy} aria-describedby="rc-hint" onClick={() => { if (chosen && !busy) onReceive(chosen.id_producto) }}>{I(PackageCheck)}Marcar recibida</button>)}
          </>)}
        </ErpDialog>
      )
    }
    return (
      <ErpDialog open onOpenChange={close} title={`Marcar ${o.referencia} como recibida`}>
        {wrap(<>
          <div className="cons">
            <span>Suma <b>{uds(o.cantidad)}</b> al stock de <b>{p.nombre}</b> ({p.sku}): <b className="num">{p.stock} {ARROW} {p.stock + o.cantidad}</b>.</span>
            <span>Actualiza su costo promedio con <b className="num">{sol(unit(o))}</b> por unidad ({sol(enSoles(o))} {"\u00f7"} {o.cantidad}) y lo marca como importado.</span>
            <span>No se puede deshacer: ya no cambian producto, cantidad, moneda, TC, costos ni estado.</span>
          </div>
          {ft2(<button type="button" className="btn" aria-disabled={busy} onClick={() => { if (!busy) onReceive(p.id_producto) }}>{I(PackageCheck)}Marcar recibida</button>)}
        </>)}
      </ErpDialog>
    )
  }
  if (kind === "cancelar") return (
    <ErpDialog open onOpenChange={close} title={`Cancelar ${o.referencia}`}>
      {wrap(<>
        <div className="cons">
          <span>El expediente <b>{o.referencia}</b> ({o.descripcion}, {uds(o.cantidad)}) pasa a <b>Cancelada</b>.</span>
          <span>El stock no cambia. Una importación cancelada no se reabre: si el embarque sigue, registra una nueva.</span>
        </div>
        {ft2(<button type="button" className="btn dng" aria-disabled={busy} onClick={() => { if (!busy) onCancel() }}>{I(CircleX)}Cancelar importación</button>)}
      </>)}
    </ErpDialog>
  )
  if (kind === "eliminar") return (
    <ErpDialog open onOpenChange={close} title={`Eliminar ${o.referencia}`}>
      {wrap(<>
        <div className="cons">
          <span>Se borra el expediente <b>{o.referencia}</b> ({o.descripcion}, {uds(o.cantidad)}) con su costo de <b className="num">{sol(enSoles(o))}</b>.</span>
          <span>El stock no cambia: la mercancía no ingresó.</span><span>No se puede deshacer.</span>
        </div>
        {ft2(<button type="button" className="btn dng" aria-disabled={busy} onClick={() => { if (!busy) onDelete() }}>{I(Trash2)}Eliminar</button>)}
      </>)}
    </ErpDialog>
  )
  return (
    <ErpDialog open onOpenChange={close} title={`No se puede eliminar ${o.referencia}`}>
      {wrap(<>
        <div className="why bad" role="alert">{I(CircleAlert)}<span>{msg || "No se puede eliminar una importación que ya generó stock"}{o.inventario_registrado_en ? ` (ingresó el ${ft(o.inventario_registrado_en)}, +${uds(o.cantidad)}).` : "."}</span></div>
        <div className="ft"><button type="button" className="btn" onClick={onClose}>Entendido</button></div>
      </>)}
    </ErpDialog>
  )
}
