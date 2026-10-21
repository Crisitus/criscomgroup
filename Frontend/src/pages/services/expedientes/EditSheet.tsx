import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import {
  listTechnicalAssets, listTechnicalClients, updateWorkOrder, type TechnicalAsset, type TechnicalClient, type WorkOrder,
} from "../../../services/workOrderService"
import { CameraCodeScanner } from "../../../components/scanner/CameraCodeScanner"
import { I, errMsg, money } from "./shared"

const SUB: [string, string][] = [["preventivo", "Preventivo"], ["correctivo", "Correctivo"], ["optimizacion", "Optimización"], ["limpieza_profunda", "Limpieza profunda"]]
const str = (v: unknown) => (v == null ? "" : String(v))
const day = (v: unknown) => str(v).slice(0, 10)

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <label className="fld"><span>{label}{req && <> <i>*</i></>}</span>{children}</label>
}

export function EditSheet({ order, onClose, onSaved }: { order: WorkOrder; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState<Record<string, string>>(() => ({
    cliente_servicio_id: str(order.cliente_servicio_id), activo_tecnico_id: str(order.activo_tecnico_id), cliente: str(order.cliente), telefono: str(order.telefono),
    documento: str(order.documento), equipo: str(order.equipo), numero_serie: str(order.numero_serie), subtipo_trabajo: str(order.subtipo_trabajo),
    detalle: str(order.detalle), diagnostico_configuracion: str(order.diagnostico_configuracion), trabajo_realizado: str(order.trabajo_realizado),
    moneda: str(order.moneda || "PEN"), costo_mano_obra: str(order.costo_mano_obra), descuento: str(order.descuento), recargo: str(order.recargo),
    fecha_ingreso: day(order.fecha_ingreso), fecha_entrega_estimada: day(order.fecha_entrega_estimada), garantia_dias: str(order.garantia_dias),
    garantia_cobertura: str(order.garantia_cobertura), garantia_exclusiones: str(order.garantia_exclusiones), notas: str(order.notas),
  }))
  const [clients, setClients] = useState<TechnicalClient[]>([])
  const [assets, setAssets] = useState<TechnicalAsset[]>([])
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF(c => ({ ...c, [k]: v }))
  useEffect(() => {
    Promise.all([listTechnicalClients(), listTechnicalAssets()]).then(([c, a]) => { setClients(c); setAssets(a) }).catch(() => undefined)
  }, [])
  const locked = !!order.venta_id
  const total = useMemo(() => Math.max(0, Number(order.costo_repuestos) + Number(f.costo_mano_obra || 0) + Number(f.recargo || 0) - Number(f.descuento || 0)), [order.costo_repuestos, f.costo_mano_obra, f.recargo, f.descuento])
  const saldo = total - Number(order.adelanto)
  const clientAssets = assets.filter(a => !f.cliente_servicio_id || String(a.id_cliente_servicio) === f.cliente_servicio_id)

  const pickClient = (v: string) => {
    if (v === "") return setF(c => ({ ...c, cliente_servicio_id: "", activo_tecnico_id: "" }))
    const cl = clients.find(x => String(x.id_cliente_servicio) === v)
    if (cl) setF(c => ({ ...c, cliente_servicio_id: v, activo_tecnico_id: "", cliente: cl.nombre, documento: cl.documento || "", telefono: cl.telefono || "" }))
  }
  const pickAsset = (v: string) => {
    if (v === "") return set("activo_tecnico_id", "")
    const a = assets.find(x => String(x.id_activo_tecnico) === v)
    if (a) setF(c => ({ ...c, activo_tecnico_id: v, cliente_servicio_id: String(a.id_cliente_servicio), equipo: [a.tipo, a.marca, a.modelo].filter(Boolean).join(" . "), numero_serie: a.numero_serie || a.imei || "" }))
  }
  const err = !f.cliente.trim() ? "Falta el cliente" : !f.equipo.trim() ? "Falta el equipo" : !f.detalle.trim() ? "Falta el detalle de la falla" : Number(f.descuento || 0) > Number(order.costo_repuestos) + Number(f.costo_mano_obra || 0) + Number(f.recargo || 0) ? "El descuento supera el subtotal más el recargo" : ""

  const save = async () => {
    if (err) return toast.error(err)
    setSaving(true)
    try {
      await updateWorkOrder(order.id_orden_servicio, { ...order, ...f })
      toast.success("Orden actualizada correctamente")
      await onSaved()
      onClose()
    } catch (e) { toast.error(errMsg(e, "No se pudo guardar la orden")) } finally { setSaving(false) }
  }
  const num = (k: string, ro?: boolean) => <input className="in num" inputMode="decimal" value={f[k]} readOnly={ro || locked} onChange={e => set(k, e.target.value.replace(/[^\d.]/g, ""))} />

  return (
    <div className="sheet" role="region" aria-label={`Editar expediente ${order.codigo}`}>
      <div className="ra" style={{ minHeight: 44, marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 650 }}>Editar expediente . {order.codigo}</h2>
        <span className="sp" />
        <button type="button" className="btn out sq" onClick={onClose} aria-label="Cerrar">{I(X, 18)}</button>
      </div>
      <div className="sb">
        <div className="col">
          <section className="card sec"><h3>Identificación</h3>
            <div className="g2">
              <Field label="Código"><input className="in" value={order.codigo} readOnly /></Field>
              <Field label="Cliente registrado"><select className="sl" value={f.cliente_servicio_id} onChange={e => pickClient(e.target.value)}><option value="">Ingreso manual</option>{clients.map(c => <option key={c.id_cliente_servicio} value={c.id_cliente_servicio}>{c.nombre}</option>)}</select></Field>
              <Field label="Activo técnico registrado"><select className="sl" value={f.activo_tecnico_id} onChange={e => pickAsset(e.target.value)}><option value="">Sin asignar</option>{clientAssets.map(a => <option key={a.id_activo_tecnico} value={a.id_activo_tecnico}>{[a.tipo, a.marca, a.modelo].filter(Boolean).join(" . ")}</option>)}</select></Field>
              <Field label="Cliente" req><input className="in" value={f.cliente} onChange={e => set("cliente", e.target.value)} /></Field>
              <Field label="WhatsApp"><input className="in" inputMode="tel" value={f.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
              <Field label="DNI / RUC"><input className="in" inputMode="numeric" value={f.documento} onChange={e => set("documento", e.target.value.replace(/\D/g, "").slice(0, 11))} /></Field>
              <Field label="Equipo" req><input className="in" value={f.equipo} onChange={e => set("equipo", e.target.value)} /></Field>
              <Field label="Número de serie">
                <div style={{ display: "flex", gap: 8 }}><input className="in" style={{ flex: 1 }} value={f.numero_serie} onChange={e => set("numero_serie", e.target.value)} /><CameraCodeScanner label="Escanear" onDetected={c => set("numero_serie", c)} className="btn out" /></div>
              </Field>
              {order.tipo === "mantenimiento" && (
                <Field label="Modalidad de mantenimiento"><select className="sl" value={f.subtipo_trabajo} onChange={e => set("subtipo_trabajo", e.target.value)}>{SUB.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              )}
            </div>
          </section>
          <section className="card sec"><h3>Diagnóstico y trabajo</h3>
            <Field label="Detalle de la falla" req><textarea className="ta" value={f.detalle} onChange={e => set("detalle", e.target.value)} /></Field>
            <Field label="Diagnóstico / configuración"><textarea className="ta" value={f.diagnostico_configuracion} onChange={e => set("diagnostico_configuracion", e.target.value)} /></Field>
            <Field label="Trabajo realizado"><textarea className="ta" value={f.trabajo_realizado} onChange={e => set("trabajo_realizado", e.target.value)} /></Field>
          </section>
          <section className="card sec"><h3>Notas internas</h3><Field label="Notas"><textarea className="ta" value={f.notas} onChange={e => set("notas", e.target.value)} /></Field></section>
        </div>
        <div className="col">
          <section className="card sec"><h3>Importes</h3>
            <div className="g2">
              <Field label="Moneda"><select className="sl" value={f.moneda} disabled={locked} onChange={e => set("moneda", e.target.value)}><option>PEN</option><option>USD</option></select></Field>
              <Field label="Costo repuestos (desde Repuestos)"><input className="in num" readOnly value={Number(order.costo_repuestos).toFixed(2)} /></Field>
              <Field label="Mano de obra">{num("costo_mano_obra")}</Field>
              <Field label="Descuento">{num("descuento")}</Field>
              <Field label="Recargo">{num("recargo")}</Field>
              <Field label="Pagado mediante movimientos"><input className="in num" readOnly value={Number(order.adelanto).toFixed(2)} /></Field>
            </div>
            <span className="hint">{locked ? "La orden ya generó su venta contable: los importes no pueden modificarse. " : ""}Los pagos se registran en la pestaña Pagos. El descuento no puede superar el subtotal más el recargo.</span>
          </section>
          <section className="card sec"><h3>Fechas y garantía</h3>
            <div className="g2">
              <Field label="Fecha de ingreso"><input className="in" type="date" value={f.fecha_ingreso} onChange={e => set("fecha_ingreso", e.target.value)} /></Field>
              <Field label="Entrega estimada"><input className="in" type="date" value={f.fecha_entrega_estimada} onChange={e => set("fecha_entrega_estimada", e.target.value)} /></Field>
              <Field label="Garantía del trabajo (días)"><input className="in num" inputMode="numeric" value={f.garantia_dias} onChange={e => set("garantia_dias", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Cobertura de la garantía"><input className="in" value={f.garantia_cobertura} onChange={e => set("garantia_cobertura", e.target.value)} /></Field>
            </div>
            <Field label="Exclusiones de la garantía"><textarea className="ta" value={f.garantia_exclusiones} onChange={e => set("garantia_exclusiones", e.target.value)} /></Field>
          </section>
        </div>
      </div>
      <div className="sf">
        <div className="t"><span>TOTAL</span><b className="num">{money(total)}</b></div>
        <div className="t"><span>Pagado</span><b className="num" style={{ fontSize: 18 }}>{money(order.adelanto)}</b></div>
        <div className="t"><span>SALDO</span><b className="num">{money(saldo)}</b></div>
        <span className="sp" />
        {err && <span className="why bad" style={{ margin: 0 }}>{I(X, 14)}{err}</span>}
        <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn" disabled={saving || !!err} onClick={save}>{saving ? "Guardando..." : "Guardar cambios"}</button>
      </div>
    </div>
  )
}
