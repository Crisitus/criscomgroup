import { useMemo, useState } from "react"
import { ChevronDown, Save, X } from "lucide-react"
import { toast } from "sonner"
import type { Product } from "../../services/productService"
import { createImport, updateImport, type ImportRecord } from "../../services/importService"
import { COST_LABEL, COSTS, DASH, ELL, I, ST, SEP, errMsg, mon, r2, sol, toPayload, type Estado } from "./importsShared"

const EMPTY: Record<string, string> = {
  producto_id: "", cantidad: "", tipo_cambio: "", referencia: "", proveedor: "", pais_origen: "", descripcion: "", tracking: "", regimen_aduanero: "",
  dam_dua: "", notas_contables: "", moneda: "USD", costo_mercancia: "", flete: "", seguro: "", tributos: "", otros_costos: "", estado: "planificada",
  fecha_embarque: "", fecha_llegada_estimada: "",
}
const fromRecord = (o: ImportRecord) => Object.fromEntries(Object.keys(EMPTY).map(k => [k, (o as unknown as Record<string, unknown>)[k] == null ? "" : String((o as unknown as Record<string, unknown>)[k])]))

export function ImportSheet({ record, products, onClose, onSaved }: { record: ImportRecord | null; products: Product[]; onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState<Record<string, string>>(() => (record ? fromRecord(record) : EMPTY))
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF(c => ({ ...c, [k]: v }))
  const pen = f.moneda === "PEN"
  const calc = useMemo(() => {
    const tt = COSTS.reduce((s, k) => s + (parseFloat(f[k]) || 0), 0)
    const tc = pen ? 1 : parseFloat(f.tipo_cambio) || 0
    const cn = Math.floor(parseFloat(f.cantidad) || 0)
    return { tt, so: tt && tc > 0 ? r2(tt * tc) : null, un: tt && tc > 0 && cn >= 1 ? r2((tt * tc) / cn) : null }
  }, [f, pen])
  const estados: Estado[] = record ? [record.estado] : ["planificada", "en_transito", "en_aduanas", "liberada"]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = toPayload({ ...f, tipo_cambio: pen ? "1" : f.tipo_cambio })
      const saved: ImportRecord = record ? await updateImport(record.id_importacion, body) : await createImport(body)
      toast.success(record ? `Importación ${saved.referencia} actualizada` : `Importación ${saved.referencia} registrada`)
      onSaved(saved.id_importacion)
    } catch (err) { toast.error(errMsg(err, "No se pudo guardar la importación")) } finally { setBusy(false) }
  }
  const fld = (label: string, k: string, req = false, type = "text", cls = "") => (
    <label className={`fld${cls ? ` ${cls}` : ""}`}><span>{label}{req && <> <i>*</i></>}</span>
      <input className={`in${type === "num" ? " num" : ""}`} type={type === "num" ? "text" : type} inputMode={type === "num" ? "decimal" : undefined} required={req} value={f[k]} onChange={ev => set(k, ev.target.value)} placeholder={type === "num" ? "0.00" : undefined} /></label>
  )
  const id = record ? "sheet-edit" : "sheet-new"

  return (
    <form className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} onSubmit={submit} onKeyDown={e => { if (e.key === "Escape") onClose() }}>
      <div className="shd"><h2 id={id}>{record ? `Editar ${record.referencia}` : "Nueva importación"}</h2><span className="sp" /><button type="button" className="btn out sq" onClick={onClose} aria-label="Cerrar">{I(X, 18)}</button></div>
      <div className="sb">
        <div className="col">
          <section className="card sec"><h3>Qué se importa</h3><div className="g2">
            <label className="fld full"><span>Producto</span>
              <select className="sl" value={f.producto_id} onChange={e => set("producto_id", e.target.value)}>
                <option value="">Sin asignar{SEP}obligatorio al recibir</option>
                {products.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}{SEP}{p.sku}{SEP}stock {p.stock}</option>)}
              </select></label>
            {fld("Cantidad", "cantidad", true, "num")}{fld("Referencia", "referencia", true)}
            {fld("Descripción", "descripcion", true, "text", "full")}{fld("Proveedor", "proveedor", true)}{fld("País de origen", "pais_origen", true)}
          </div></section>
          <details className="fold-d" open={!!record}>
            <summary>{I(ChevronDown)}Aduanas y notas<span className="mut" style={{ fontWeight: 400, marginLeft: "auto" }}>Opcional</span></summary>
            <div className="bd">
              {fld("Tracking", "tracking")}{fld("DAM / DUA", "dam_dua")}{fld("Régimen aduanero", "regimen_aduanero", false, "text", "full")}
              <label className="fld full"><span>Notas contables</span><textarea className="ta sm" value={f.notas_contables} onChange={e => set("notas_contables", e.target.value)} /></label>
            </div>
          </details>
        </div>
        <div className="col">
          <section className="card sec"><h3>Costos</h3><div className="g2">
            <div className="fld full"><span>Moneda</span><div className="opts" role="radiogroup" aria-label="Moneda">
              {["USD", "PEN", "EUR"].map(m => <button type="button" key={m} className="opt" role="radio" aria-checked={f.moneda === m} onClick={() => set("moneda", m)}>{m}</button>)}
            </div></div>
            <label className="fld full"><span>Tipo de cambio a soles <i>*</i></span>
              <input className="in num" inputMode="decimal" required={!pen} readOnly={pen} value={pen ? "1.000000" : f.tipo_cambio} onChange={e => set("tipo_cambio", e.target.value)} placeholder="3.745000" aria-describedby={`${id}-tc`} />
              <span className="hint" id={`${id}-tc`}>Mayor que 0. Con PEN el tipo de cambio es 1.</span></label>
            {COSTS.map(k => <span key={k}>{fld(COST_LABEL[k], k, false, "num")}</span>)}
          </div></section>
          <section className="card sec"><h3>Embarque</h3><div className="g3">
            <label className="fld"><span>Estado</span>
              <select className="sl" value={f.estado} disabled={!!record} onChange={e => set("estado", e.target.value)} aria-describedby={record ? `${id}-st` : undefined}>
                {estados.map(k => <option key={k} value={k}>{ST[k][0]}</option>)}</select></label>
            {fld("Fecha de embarque", "fecha_embarque", false, "date")}{fld("Llegada estimada", "fecha_llegada_estimada", false, "date")}
          </div>{record && <span className="hint" id={`${id}-st`}>El estado se avanza desde el expediente, un paso a la vez.</span>}</section>
        </div>
      </div>
      <div className="sf">
        <div className="t"><span>Total ({f.moneda})</span><b className="num m">{calc.tt ? mon(f.moneda, calc.tt) : DASH}</b></div>
        <div className="t"><span>Costo en soles</span><b className="num m">{calc.so != null ? sol(calc.so) : DASH}</b></div>
        <div className="t"><span>Costo unitario puesto en almacén</span><b className="num">{calc.un != null ? sol(calc.un) : DASH}</b></div>
        <span className="sp" />
        <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn" aria-disabled={busy}>{I(Save)}{busy ? `Guardando${ELL}` : record ? "Guardar cambios" : "Guardar importación"}</button>
      </div>
    </form>
  )
}
