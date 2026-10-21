import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, CircleX, Info, Plus, TriangleAlert, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { todayLima } from "../../../components/erp/format"
import { ProductPicker } from "./ProductPicker"
import { ReceiveLines } from "./ReceiveLines"
import { calc, costOf, qtyOf, toNum, type DraftLine } from "./receiveCalc"
import { I, errMsg, money, pl, type Purchase, type StockProduct, type Supplier } from "./purchasesShared"

const isoFor = (date: string) => (date === todayLima() ? new Date().toISOString() : `${date}T12:00:00-05:00`)

export function ReceiveForm({ suppliers, products, mob, onCancel, onDone }: {
  suppliers: Supplier[]; products: StockProduct[]; mob: boolean; onCancel: () => void; onDone: (p: Purchase) => void
}) {
  const [prov, setProv] = useState("")
  const [doc, setDoc] = useState("")
  const [fecha, setFecha] = useState(todayLima())
  const [usd, setUsd] = useState(false)
  const [tc, setTc] = useState("")
  const [flete, setFlete] = useState("")
  const [notas, setNotas] = useState("")
  const [showNotas, setShowNotas] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [busy, setBusy] = useState(false)

  const sup = suppliers.find(s => String(s.id_proveedor) === prov)
  const inactive = !!sup && !sup.activo
  const fl = toNum(flete), rate = usd ? toNum(tc) : 1
  const R = useMemo(() => calc(lines, fl, usd, rate), [lines, fl, usd, rate])
  const cur = usd ? "USD" : "PEN"

  const add = (p: StockProduct) => setLines(ls => {
    const i = ls.findIndex(l => l.producto_id === p.id_producto)
    if (i >= 0) return ls.map((l, n) => (n === i ? { ...l, q: String(qtyOf(l) + 1) } : l))
    const avg = Number(p.costo_promedio) || 0
    return [...ls, { key: `${p.id_producto}-${Date.now()}`, producto_id: p.id_producto, nombre: p.nombre, sku: p.sku, stock: p.stock, q: "1", c: avg > 0 ? avg.toFixed(2) : "" }]
  })
  const change = (key: string, patch: Partial<DraftLine>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))
  const remove = (key: string) => setLines(ls => ls.filter(l => l.key !== key))

  const miss: string[] = []
  if (!sup) miss.push("proveedor")
  if (!doc.trim()) miss.push("documento")
  if (!lines.length) miss.push("al menos una línea")
  if (usd && rate <= 0) miss.push("tipo de cambio")
  const badLine = lines.some(l => qtyOf(l) < 1 || costOf(l) <= 0)
  const ok = !miss.length && !inactive && !badLine && !busy
  const reason = inactive ? "Proveedor inactivo: no admite compras. Elige un proveedor activo para confirmar."
    : miss.length ? `Falta: ${miss.join(", ").replace(/, ([^,]*)$/, " y $1")}.`
    : badLine ? "Cada línea necesita cantidad mínima 1 y costo mayor que 0." : ""

  const submit = async () => {
    if (!ok || !sup) return
    setBusy(true)
    try {
      const created = await commercialApi.createPurchase({
        proveedor_id: sup.id_proveedor, documento: doc.trim(), fecha: isoFor(fecha), moneda: cur, tipo_cambio: usd ? rate : 1,
        costos_adicionales: fl, notas: notas.trim() || undefined,
        items: lines.map(l => ({ producto_id: l.producto_id, cantidad: qtyOf(l), costo_unitario: costOf(l) })),
      })
      toast.success(`Compra ${created.numero} recibida: stock y costo promedio actualizados`)
      onDone(created)
    } catch (e) { toast.error(errMsg(e, "No se pudo registrar la compra")) } finally { setBusy(false) }
  }

  const provField = (
    <div className="ff"><div className="lb">Proveedor</div>
      <span className="sel" style={{ width: "100%" }}>
        <select value={prov} onChange={e => setProv(e.target.value)} aria-label="Proveedor" aria-invalid={inactive || undefined} aria-describedby={inactive ? "e-prov" : undefined}
          style={inactive ? { borderColor: "hsl(var(--destructive-text))", outline: "1px solid hsl(var(--destructive-text))" } : undefined}>
          <option value="">Elegir proveedor</option>
          {suppliers.map(s => <option key={s.id_proveedor} value={s.id_proveedor}>{s.razon_social}{s.activo ? "" : " — inactivo"}</option>)}
        </select>{I(ChevronDown)}
      </span>
      {inactive && <div className="err" id="e-prov">{I(CircleX)}<span>Proveedor inactivo: no admite compras.</span></div>}
    </div>
  )
  const fields = [
    <div className="ff" key="d"><div className="lb">Documento</div><input className="in" value={doc} onChange={e => setDoc(e.target.value)} placeholder="F001-000000" aria-label="Documento" /></div>,
    <div className="ff" key="f"><div className="lb">Fecha</div><input className="in" type="date" value={fecha} max={todayLima()} onChange={e => setFecha(e.target.value || todayLima())} aria-label="Fecha" /></div>,
    <div className="ff" key="m"><div className="lb">Moneda</div>
      <div className="seg" role="group" aria-label="Moneda"><button type="button" aria-pressed={!usd} onClick={() => setUsd(false)}>PEN</button><button type="button" aria-pressed={usd} onClick={() => setUsd(true)}>USD</button></div></div>,
  ]
  if (usd) fields.push(
    <div className="ff" key="t"><div className="lb">Tipo de cambio</div><input className="in r num" value={tc} inputMode="decimal" placeholder="3.7500" aria-label="Tipo de cambio" onChange={e => setTc(e.target.value.replace(/[^0-9.]/g, ""))} /></div>,
  )
  const cols = mob ? "1fr 1fr" : usd ? "1.6fr 1fr 1fr 150px 110px" : "1.7fr 1fr 1fr 150px"
  const confirmBtn = (cls = "btn") => (
    <button type="button" className={cls} aria-disabled={!ok} aria-describedby={ok ? undefined : "why-conf"} onClick={() => void submit()}>{I(Truck, 18)}Confirmar compra</button>
  )
  const why = (
    <div className="why" id="why-conf">{I(ok ? Info : TriangleAlert)}<span>{ok ? "Al confirmar se suma el stock y se actualiza el costo promedio." : reason}</span></div>
  )
  const summary = (
    <div className="card"><h2>Resumen</h2>
      <div className="sum">
        <div className="ln"><span>Líneas</span><b className="num">{lines.length}</b></div>
        <div className="ln"><span>Unidades</span><b className="num">{R.uni}</b></div>
        <div className="ln"><span>Mercadería</span><b className="num">{money(R.val, cur)}</b></div>
        <div className="ln"><label htmlFor="rc-flete">Flete (costos adicionales)</label><input className="in r num" id="rc-flete" value={flete} inputMode="decimal" placeholder="0.00" onChange={e => setFlete(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
        <div className="tot"><span>Total</span><b className="num">{money(R.total, cur)}</b></div>
        {usd && rate > 0 && <div className="sub" style={{ textAlign: "right" }}>Equivale a <b className="num">{money(R.pen, "PEN")}</b> al TC {rate.toFixed(4)}</div>}
      </div>
      {!mob && <><div className="acts">{confirmBtn()}<button type="button" className="btn out" onClick={onCancel}>Cancelar</button></div>{why}</>}
    </div>
  )
  return (
    <>
    <div className={mob ? "pg rcs" : "pg"}>
      <div className="hd"><h1>Recibir compra</h1>
        {mob ? <button type="button" className="ib bd" aria-label="Cerrar y volver a Compras" onClick={onCancel}>{I(X, 20)}</button>
          : <button type="button" className="btn out" onClick={onCancel}>{I(ChevronLeft)}Volver a compras</button>}
      </div>
      <div className="rc">
        <div className="col">
          <div className="card"><div className="doc4" style={{ gridTemplateColumns: cols }}>
            {mob ? <><div style={{ gridColumn: "1/-1" }}>{provField}</div>{fields}</> : <>{provField}{fields}</>}
          </div></div>
          <div className="card"><h2>Productos recibidos{lines.length ? ` · ${pl(lines.length, "línea", "líneas")}` : ""}</h2>
            <ProductPicker products={products} onPick={add} mob={mob} />
            <ReceiveLines lines={lines} rows={R.rows} usd={usd} mob={mob} onChange={change} onRemove={remove} />
            {fl > 0 && lines.length > 0 && <div className="hnt" style={{ marginTop: 8 }}>{I(Info)}<span>El flete se reparte por valor entre las líneas: costo asignado = costo + su parte del flete.{usd && rate > 0 ? ` El inventario se valoriza en soles a TC ${rate.toFixed(4)}.` : ""}</span></div>}
          </div>
          {showNotas
            ? <div className="card ff"><label htmlFor="rc-notas" className="lb">Notas</label><textarea className="in" id="rc-notas" value={notas} onChange={e => setNotas(e.target.value)} /></div>
            : <div><button type="button" className="lnk" onClick={() => setShowNotas(true)}>{I(Plus)}Agregar notas</button></div>}
        </div>
        {summary}
      </div>
    </div>
      {mob && (
        <div className="foot-fix">
          <div className="tl"><span style={{ fontWeight: 600 }}>Total</span><b className="num">{money(R.total, cur)}</b></div>
          {confirmBtn("btn blk")}
          {!ok && <div className="why" id="why-conf" style={{ marginTop: 6 }}>{I(TriangleAlert)}<span>{reason}</span></div>}
        </div>
      )}
    </>
  )
}
