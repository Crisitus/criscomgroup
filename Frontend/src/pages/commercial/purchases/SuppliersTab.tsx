import { useMemo, useState } from "react"
import { Ban, CircleAlert, CircleCheck, Pencil, RefreshCw, Search, Truck } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { ActChip, I, errMsg, norm, pl, type Supplier } from "./purchasesShared"

type F = "todos" | "activos" | "inactivos"
type Status = "load" | "ok" | "error"

export function SuppliersTab({ suppliers, status, mob, onEdit, onChanged, onRetry }: {
  suppliers: Supplier[]; status: Status; mob: boolean; onEdit: (s: Supplier) => void; onChanged: () => void; onRetry: () => void
}) {
  const [q, setQ] = useState("")
  const [f, setF] = useState<F>("todos")
  const [busy, setBusy] = useState<number | null>(null)
  const base = useMemo(() => {
    const t = norm(q.trim())
    return suppliers.filter(s => !t || norm(`${s.razon_social} ${s.ruc_documento || ""} ${s.contacto || ""}`).includes(t))
  }, [suppliers, q])
  const cnt = { todos: base.length, activos: base.filter(s => s.activo).length, inactivos: base.filter(s => !s.activo).length }
  const list = f === "todos" ? base : base.filter(s => s.activo === (f === "activos"))
  const off = status !== "ok"

  const toggle = async (s: Supplier) => {
    if (busy) return
    setBusy(s.id_proveedor)
    try {
      await commercialApi.updateSupplier(s.id_proveedor, { activo: !s.activo })
      toast.success(`${s.razon_social}: ${s.activo ? "desactivado, ya no admite compras" : "activado, vuelve a admitir compras"}`)
      onChanged()
    } catch (e) { toast.error(errMsg(e, "No se pudo cambiar el estado del proveedor")) } finally { setBusy(null) }
  }
  const edBtn = (s: Supplier, cls = "") => <button type="button" className={`btn out sm ${cls}`} aria-label={`Editar a ${s.razon_social}`} onClick={() => onEdit(s)}>{I(Pencil)}Editar</button>
  const tgBtn = (s: Supplier, cls = "") => (
    <button type="button" className={`btn out sm ${cls}`} aria-disabled={busy === s.id_proveedor} aria-label={`${s.activo ? "Desactivar" : "Activar"} a ${s.razon_social}`} onClick={() => void toggle(s)}>
      {I(s.activo ? Ban : CircleCheck)}{s.activo ? "Desactivar" : "Activar"}</button>
  )
  const chip = (k: F, l: string) => (
    <button type="button" key={k} className="chp" aria-pressed={f === k} aria-label={`${l} (${off ? "cargando" : cnt[k]})`} onClick={() => setF(k)}>{l}<span className="n">{off ? "-" : cnt[k]}</span></button>
  )
  let body: React.ReactNode
  if (status === "error") body = (
    <div className="tcard"><div className="empty bad" role="alert"><div className="ei">{I(CircleAlert, 22)}</div><h2>No se pudieron cargar los proveedores</h2><p>Revisa tu conexión e inténtalo de nuevo.</p>
      <button type="button" className="btn out" onClick={onRetry}>{I(RefreshCw)}Reintentar</button></div></div>
  )
  else if (status === "load") body = <div className="tcard" aria-busy="true"><div className="empty"><p>Cargando proveedores…</p></div></div>
  else if (!suppliers.length) body = <div className="tcard"><div className="empty" role="status"><div className="ei">{I(Truck, 22)}</div><h2>Aún no hay proveedores</h2><p>Registra el primero con «Nuevo proveedor».</p></div></div>
  else if (!list.length) body = <div className="tcard"><div className="empty" role="status"><div className="ei">{I(Search, 22)}</div><h2>Ningún proveedor coincide</h2><p>Prueba con otra razón social, RUC o contacto.</p></div></div>
  else if (mob) body = (
    <div className="mlist">{list.map(s => (
      <article className={`mc${s.activo ? "" : " off"}`} key={s.id_proveedor} style={{ cursor: "default" }}>
        <div className="m1"><span className="a" style={{ whiteSpace: "normal" }}>{s.razon_social}</span></div>
        <div className="m2"><div><div className="nm">{s.contacto || "Sin contacto"}</div><div className="num">{s.ruc_documento || "Sin documento"}</div></div>
          <span style={{ textAlign: "right" }}>{s.ciudad}<br />{pl(s.dias_credito, "día", "días")} de crédito</span></div>
        <div className="m3"><ActChip on={s.activo} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{edBtn(s, "blk")}{tgBtn(s, "blk")}</div>
      </article>
    ))}</div>
  )
  else body = (
    <div className="tcard"><table className="tb">
      <colgroup><col style={{ width: "27%" }} /><col style={{ width: 140 }} /><col style={{ width: "20%" }} /><col style={{ width: 100 }} /><col style={{ width: 120 }} /><col /></colgroup>
      <thead><tr><th scope="col">Proveedor</th><th scope="col">RUC / documento</th><th scope="col">Contacto</th><th scope="col" className="r">Crédito</th><th scope="col">Estado</th><th scope="col" className="r">Acciones</th></tr></thead>
      <tbody>{list.map(s => (
        <tr key={s.id_proveedor} className={s.activo ? "" : "off"}>
          <td><div className="stk"><span className="nm" style={{ fontWeight: 600 }}>{s.razon_social}</span><span className="sub">{s.ciudad || ""}</span></div></td>
          <td className="num">{s.ruc_documento || <span className="mut">Sin documento</span>}</td>
          <td><div className="stk"><span className="nm">{s.contacto || "Sin contacto"}</span><span className="sub num">{s.telefono || "Sin teléfono"}</span></div></td>
          <td className="r num">{pl(s.dias_credito, "día", "días")}</td><td><ActChip on={s.activo} /></td>
          <td><div className="ac">{edBtn(s)}{tgBtn(s)}</div></td>
        </tr>
      ))}</tbody>
    </table><div className="pgf"><span className="num">{list.length} de {suppliers.length} proveedores</span></div></div>
  )
  return (
    <>
      <div className="fbar">
        <label className="fld q">{I(Search, 18)}<input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por razón social, RUC o contacto" aria-label="Buscar proveedores" disabled={off} /></label>
        <div className="chips" role="group" aria-label="Estado">{chip("todos", "Todos")}{chip("activos", "Activos")}{chip("inactivos", "Inactivos")}</div>
      </div>
      {body}
    </>
  )
}
