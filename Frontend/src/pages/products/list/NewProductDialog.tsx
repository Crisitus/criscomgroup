import { useState } from "react"
import { CircleAlert, Info, Plus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import type { CodigoBarrasItem } from "../../../services/codigoBarrasService"
import { CodesEditor } from "./CodesEditor"
import { EMPTY, NewProductFields, type NewForm } from "./NewProductFields"
import { submitNew } from "./newProductSubmit"
import { I, errMsg, type Cat } from "./prodShared"

export function NewProductDialog({ cats, onClose, onCreated }: { cats: Cat[]; onClose: () => void; onCreated: (id: number) => void }) {
  const [f, setF] = useState<NewForm>(EMPTY)
  const [codes, setCodes] = useState<CodigoBarrasItem[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [ask, setAsk] = useState(false)
  const precio = Number(f.precio.replace(",", "."))
  const mayor = f.mayor.trim() ? Number(f.mayor.replace(",", ".")) : 0
  const garantia = Number(f.garantia)
  const why = !f.nombre.trim() ? "Escribe el nombre del producto." : !f.cat ? "Elige la categoría." : !f.sku.trim() ? "Escribe o genera el SKU."
    : !(precio > 0) ? "Indica el precio con IGV." : Number.isNaN(mayor) || mayor < 0 ? "El precio mayorista no es válido."
      : !Number.isInteger(garantia) || garantia < 0 || garantia > 120 ? "La garantía debe ser de 0 a 120 meses." : ""
  const close = (o: boolean) => { if (!o && !busy) onClose() }
  const save = async () => {
    setAsk(false); setBusy(true); setErr("")
    try {
      const p = await submitNew({ sku: f.sku, nombre: f.nombre, descripcion: f.desc, id_categoria: Number(f.cat), precio, mayor, condicion: f.cond, origen: f.origen, garantia, obs: f.obs }, codes, image)
      toast.success("Producto creado exitosamente")
      onCreated(p.id_producto)
    } catch (e) { setErr(errMsg(e, "Error al crear el producto")) } finally { setBusy(false) }
  }
  const submit = () => {
    if (why || busy) return
    if (!codes.reduce((s, c) => s + c.cantidad, 0)) setAsk(true); else void save()
  }
  if (ask) return (
    <ErpDialog open onOpenChange={o => { if (!o) setAsk(false) }} title="¿Guardar sin códigos de barras?" icon={I(TriangleAlert, 22)}>
      <div className="pg-prod dlgw"><div className="dlg">
        <p>Este producto no se podrá encontrar escaneando hasta que le añadas un código. <b>Seguirá apareciendo en la lista</b> con el filtro «Todos». Su stock inicial será 0.</p>
        <div className="acts"><button type="button" className="btn out" onClick={() => setAsk(false)}>Añadir código</button><button type="button" className="btn" onClick={() => void save()}>Guardar sin códigos</button></div>
      </div></div>
    </ErpDialog>
  )
  return (
    <ErpDialog open onOpenChange={close} title="Nuevo producto" description="Completa los datos; el stock inicial es la suma de las cantidades de sus códigos.">
      <div className="pg-prod dlgw wide"><div className="dlg">
        <NewProductFields f={f} set={p => setF({ ...f, ...p })} cats={cats} image={image} setImage={setImage} onErr={setErr} />
        <div className="frm" style={{ marginTop: 14 }}><CodesEditor codes={codes} setCodes={setCodes} /></div>
        {err && <div className="alert" role="alert">{I(CircleAlert, 18)}<span>{err}</span></div>}
        <div className="acts">
          {why && <span className="why" id="np-why">{I(Info, 16)}{why}</span>}
          <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn" aria-disabled={!!why || busy} aria-describedby={why ? "np-why" : undefined} onClick={submit}>{I(Plus)}{busy ? "Guardando..." : "Guardar producto"}</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
