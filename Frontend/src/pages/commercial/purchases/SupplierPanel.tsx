import { useState } from "react"
import { ChevronDown, CircleX, Info, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { I, errMsg, type Supplier } from "./purchasesShared"

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type V = { razon_social: string; ruc_documento: string; contacto: string; telefono: string; email: string; ciudad: string; dias_credito: string; direccion: string; activo: boolean }
const from = (s: Supplier | null): V => ({
  razon_social: s?.razon_social || "", ruc_documento: s?.ruc_documento || "", contacto: s?.contacto || "", telefono: s?.telefono || "", email: s?.email || "",
  ciudad: s?.ciudad || "", dias_credito: String(s?.dias_credito ?? 0), direccion: s?.direccion || "", activo: s ? s.activo : true,
})

export function SupplierPanel({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<V>(() => from(supplier))
  const [more, setMore] = useState(!!supplier?.direccion)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const set = (p: Partial<V>) => setV(c => ({ ...c, ...p }))
  const days = Number(v.dias_credito)
  const errs = {
    razon_social: v.razon_social.trim() ? "" : "Escribe la razón social.",
    email: v.email.trim() && !MAIL.test(v.email.trim()) ? "Escribe un correo válido, por ejemplo nombre@empresa.com." : "",
    dias_credito: v.dias_credito.trim() !== "" && (!Number.isInteger(days) || days < 0 || days > 365) ? "Debe ser un entero entre 0 y 365." : "",
  }
  const bad = Object.values(errs).some(Boolean)
  const show = (k: keyof typeof errs) => (tried || (k === "email" && v.email.trim())) && errs[k]

  const save = async () => {
    setTried(true)
    if (bad || busy) return
    setBusy(true)
    const body = { ...v, dias_credito: v.dias_credito.trim() === "" ? 0 : days }
    try {
      if (supplier) await commercialApi.updateSupplier(supplier.id_proveedor, body)
      else await commercialApi.createSupplier({ ...body, activo: true })
      toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado")
      onSaved()
    } catch (e) { toast.error(errMsg(e, "No se pudo guardar el proveedor")) } finally { setBusy(false) }
  }
  const fld = (k: keyof V, label: string, o: { req?: boolean; ph?: string; right?: boolean; hint?: string; type?: string } = {}) => {
    const err = k in errs ? show(k as keyof typeof errs) : ""
    return (
      <div className="ff"><label htmlFor={`sp-${k}`}>{label}{o.req && <> <i>*</i></>}</label>
        <input id={`sp-${k}`} className={`in${o.right ? " r num" : ""}${err ? " bad" : ""}`} type={o.type || "text"} value={String(v[k])} placeholder={o.ph}
          inputMode={o.right ? "numeric" : undefined} aria-invalid={err ? true : undefined} aria-describedby={err ? `sp-${k}-e` : undefined} onChange={e => set({ [k]: e.target.value } as Partial<V>)} />
        {err ? <div className="err" id={`sp-${k}-e`}>{I(CircleX)}<span>{err}</span></div> : o.hint ? <div className="sub" style={{ whiteSpace: "normal" }}>{o.hint}</div> : null}
      </div>
    )
  }
  return (
    <aside className="pnl">
      <div className="ph"><h2>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</h2><button type="button" className="ib" aria-label="Cerrar" onClick={onClose}>{I(X, 20)}</button></div>
      <div className="pb2" style={{ gap: 12 }}>
        {fld("razon_social", "Razón social", { req: true })}
        {fld("ruc_documento", "RUC / documento", { ph: "11 dígitos" })}
        <div className="row2">{fld("contacto", "Contacto")}{fld("telefono", "Teléfono", { type: "tel" })}</div>
        {fld("email", "Email", { ph: "nombre@empresa.com", type: "email" })}
        <div className="row2">{fld("ciudad", "Ciudad")}{fld("dias_credito", "Días de crédito", { right: true, hint: "De 0 a 365 días." })}</div>
        {more ? fld("direccion", "Dirección")
          : <div><button type="button" className="lnk" onClick={() => setMore(true)}>{I(ChevronDown)}Más datos: dirección</button></div>}
        {supplier && (
          <div>
            <button type="button" className="sw" role="switch" aria-checked={v.activo} aria-describedby="sw-h" onClick={() => set({ activo: !v.activo })}><span className="trk" /><span>{v.activo ? "Activo" : "Inactivo"}</span></button>
            <div className="hnt" id="sw-h" style={{ marginTop: 2 }}>{I(Info)}<span>{v.activo ? "Si lo desactivas, no podrás registrar compras con este proveedor." : "Mientras esté inactivo no admite compras. Actívalo para volver a recibir mercadería."}</span></div>
          </div>
        )}
        {tried && bad && <div className="why" id="why-save" style={{ marginTop: 0 }}>{I(TriangleAlert)}<span>Corrige los campos marcados para guardar.</span></div>}
      </div>
      <div className="pf"><span /><div className="gp">
        <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn" aria-disabled={busy} onClick={() => void save()}>{supplier ? "Guardar cambios" : "Guardar proveedor"}</button>
      </div></div>
    </aside>
  )
}
