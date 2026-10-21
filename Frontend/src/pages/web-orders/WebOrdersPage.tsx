"use client"

import "../../styles/pedidos.css"
import "../../styles/pedidos-overrides.css"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { toast } from "sonner"
import { ArrowLeft, Banknote, CheckCheck, CircleAlert, CircleCheck, ClipboardList, Clock, Info, Inbox, List, Lock, MessageCircle, Package, Phone, Search, Store, Trash2, TriangleAlert, Truck, X, ChevronRight } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { dateTimeLima, money, norm } from "../../components/erp/format"
import { confirmManualPayment, deleteOrder, errorMessage, fetchAdminOrders, fetchAdminPayments, hoursSince, hoursToExpire, updateOrderStatus, type Order, type OrderPayment, type OrderStatus } from "../../services/orderService"

const stroke = { strokeWidth: 1.75, "aria-hidden": true } as const
const EST: Record<string, [string, typeof Clock]> = {
  pendiente_pago: ["Pendiente de pago", Clock], confirmado: ["Confirmado", CircleCheck], preparando: ["Preparando", Package], enviado: ["Enviado", Truck], entregado: ["Entregado", CheckCheck], cancelado: ["Cancelado", X],
}
const MET: Record<string, string> = { yape: "Yape", plin: "Plin", transferencia: "Transferencia", tarjeta: "Tarjeta", contraentrega: "Contraentrega" }
const MANUAL = ["yape", "plin", "transferencia"]
const TABS: Array<[string, typeof Clock, (o: Order) => boolean]> = [
  ["Por cobrar", Banknote, o => o.estado === "pendiente_pago"],
  ["Por preparar", ClipboardList, o => o.estado === "confirmado"],
  ["Preparando", Package, o => o.estado === "preparando"],
  ["En camino", Truck, o => o.estado === "enviado"],
  ["Entregados", CheckCheck, o => o.estado === "entregado"],
  ["Todos", List, () => true],
]
const COND: Record<string, string> = { nuevo: "Nuevo", segunda_mano: "Segunda mano" }
const PROV: Record<string, string> = { culqi: "Tarjeta en línea (Culqi)", manual: "Validado a mano" }
const PEST: Record<string, [string, string, typeof Clock]> = { creado: ["Creado, sin cobrar", "warn", Clock], pagado: ["Pagado", "ok", CircleCheck], fallido: ["Fallido", "bad", CircleAlert], devuelto: ["Devuelto", "neu", CircleAlert] }

const ago = (h: number) => (h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`)
const entrega = (o: Order) => (o.tipo_entrega === "domicilio" ? `Delivery · ${o.direccion_distrito}` : "Recojo en tienda")
const unpaid = (o: Order) => o.estado_pago !== "pagado" && !o.venta_id
const expiresIn = (o: Order) => hoursToExpire(o)
const soon = (o: Order) => unpaid(o) && (expiresIn(o) ?? 99) <= 6
const units = (o: Order) => (o.detalles ?? []).reduce((s, d) => s + d.cantidad, 0)
const firstItem = (o: Order) => ({ name: o.detalles?.[0]?.producto_nombre ?? "—", more: Math.max(0, (o.detalles?.length ?? 0) - 1) })

interface Perms { state: boolean; pay: boolean; del: boolean; afiliado: boolean }
type Action = { kind: "pay" | "wait" | "view" | "prep" | "ship" | "deliver" | "cod"; label: string; primary?: boolean; disabled?: boolean; why?: string }
function actionFor(o: Order, p: Perms): Action {
  if (o.estado === "pendiente_pago") {
    if (MANUAL.includes(o.metodo_pago)) return p.pay ? { kind: "pay", label: "Confirmar pago", primary: true } : { kind: "pay", label: "Confirmar pago", disabled: true, why: "Tu rol no confirma pagos" }
    if (o.metodo_pago === "tarjeta") return { kind: "wait", label: "Esperando pago del cliente", disabled: true }
    return { kind: "view", label: "Ver detalle" }
  }
  if (!p.state) return { kind: "view", label: "Ver detalle" }
  if (o.estado === "confirmado") return { kind: "prep", label: "Empezar a preparar" }
  if (o.estado === "preparando") return { kind: "ship", label: "Marcar enviado" }
  if (o.estado === "enviado") {
    if (o.estado_pago === "pagado") return { kind: "deliver", label: "Marcar entregado" }
    return p.pay ? { kind: "cod", label: "Cobrar y entregar", primary: true } : { kind: "cod", label: "Cobrar y entregar", disabled: true, why: "Tu rol no confirma pagos" }
  }
  return { kind: "view", label: "Ver detalle" }
}

const PaymentChip = ({ o }: { o: Order }) => o.estado_pago === "pagado"
  ? <span className="st ok"><CircleCheck size={16} {...stroke} />Pagado</span>
  : <span className="st warn"><Clock size={16} {...stroke} />Pago pendiente</span>
const StatePill = ({ o }: { o: Order }) => { const [label, Icon] = EST[o.estado]; return <span className={`pill${o.estado === "entregado" ? " ok" : ""}`}><Icon size={14} {...stroke} />{label}</span> }
const Countdown = ({ o }: { o: Order }) => {
  if (!unpaid(o)) return null
  const h = expiresIn(o)
  return soon(o)
    ? <div className="cd warn"><TriangleAlert size={14} {...stroke} /><span>Por vencer · <span className="nw">se elimina en {h}&nbsp;h</span></span></div>
    : <div className="cd"><Clock size={14} {...stroke} /><span>Se elimina en {h} h</span></div>
}

type Dialog = { kind: "pay" | "cancel" | "delete"; order: Order } | null

const WebOrdersPage = () => {
  useDocumentTitle("Pedidos y pagos web")
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const role = user?.id_role ?? 4
  const perms: Perms = { state: [1, 2, 5].includes(role), pay: [1, 5].includes(role) || (role === 3 && user?.tipo_vendedor === "afiliado"), del: [1, 2].includes(role), afiliado: role === 3 }

  const { data: orders = [], isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: fetchAdminOrders })
  const { data: payments = [] } = useQuery({ queryKey: ["admin-order-payments"], queryFn: fetchAdminPayments })
  const paymentsOf = (o: Order): OrderPayment[] => payments.filter(p => p.id_pedido === o.id_pedido)

  const [tab, setTab] = useState(0)
  const [q, setQ] = useState("")
  const [flags, setFlags] = useState({ unpaid: false, soon: false, delivery: false, pickup: false })
  const [openId, setOpenId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [ref, setRef] = useState("")
  const [rowError, setRowError] = useState<number | null>(null)

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); void queryClient.invalidateQueries({ queryKey: ["admin-order-payments"] }); void queryClient.invalidateQueries({ queryKey: ["deliveries"] }) }
  const run = useMutation({
    mutationFn: async (job: () => Promise<unknown>) => job(),
    onSuccess: refresh,
  })
  const exec = async (order: Order, job: () => Promise<unknown>, ok: string) => {
    try { await run.mutateAsync(job); toast.success(ok); return true } catch (error) {
      const message = errorMessage(error, "No se pudo completar la acción")
      if (/pago pendiente/i.test(message)) setRowError(order.id_pedido)
      toast.error(message); return false
    }
  }

  const visible = orders
  const counts = TABS.map(t => visible.filter(t[2]).length)
  const nSoon = visible.filter(soon).length
  const firstSoon = visible.find(soon)
  const rows = useMemo(() => visible.filter(TABS[tab][2]).filter(o =>
    (!q || [o.numero_pedido, o.cliente_nombre, o.cliente_telefono].some(s => norm(s).includes(norm(q)))) &&
    (!flags.unpaid || unpaid(o)) && (!flags.soon || soon(o)) && (!flags.delivery || o.tipo_entrega === "domicilio") && (!flags.pickup || o.tipo_entrega === "recojo_tienda")),
  [visible, tab, q, flags])
  const open = orders.find(o => o.id_pedido === openId) ?? null

  const doAction = async (o: Order, kind: Action["kind"]) => {
    setRowError(null)
    if (kind === "view") return setOpenId(o.id_pedido)
    if (kind === "pay" || kind === "cod") { setRef(""); return setDialog({ kind: "pay", order: o }) }
    const next: Record<string, OrderStatus> = { prep: "preparando", ship: "enviado", deliver: "entregado" }
    await exec(o, () => updateOrderStatus(o.id_pedido, next[kind]), `Pedido ${o.numero_pedido} actualizado`)
  }

  const ActionButton = ({ o, block }: { o: Order; block?: boolean }) => {
    const a = actionFor(o, perms)
    if (a.disabled) return <><button type="button" className={`btn${block ? " blk" : ""}`} aria-disabled="true" aria-describedby={a.why ? `w${o.id_pedido}` : undefined}>{a.label}</button>{a.why && <div className="ago" id={`w${o.id_pedido}`} style={{ marginTop: 3, textAlign: "center" }}>{a.why}</div>}</>
    const cls = a.primary ? "btn" : a.kind === "view" ? "btn out" : "btn adv"
    return <button type="button" className={`${cls}${block ? " blk" : ""}`} onClick={e => { e.stopPropagation(); void doAction(o, a.kind) }}>{a.label}</button>
  }
  const RowError = ({ o }: { o: Order }) => rowError === o.id_pedido ? (
    <div className="rerr" role="alert"><CircleAlert size={18} {...stroke} /><span>No se puede entregar un pedido con pago pendiente<small>El pago de contraentrega aún no está cobrado: usa «Cobrar y entregar» para registrar el cobro y cerrar el pedido.</small></span><button type="button" className="ib" aria-label="Cerrar aviso" onClick={() => setRowError(null)}><X size={18} {...stroke} /></button></div>
  ) : null

  const confirmPay = async () => {
    if (!dialog) return
    const o = dialog.order, cod = o.metodo_pago === "contraentrega"
    const ok = await exec(o, async () => { await confirmManualPayment(o.id_pedido, ref.trim()); if (cod) await updateOrderStatus(o.id_pedido, "entregado") }, cod ? `Cobro registrado y pedido ${o.numero_pedido} entregado` : `Pago confirmado: se creó la venta de ${o.numero_pedido}`)
    if (ok) setDialog(null)
  }
  const confirmDelete = async () => {
    if (!dialog) return
    const o = dialog.order
    const ok = await exec(o, () => (dialog.kind === "cancel" ? updateOrderStatus(o.id_pedido, "cancelado") : deleteOrder(o.id_pedido)), `Pedido ${o.numero_pedido} eliminado`)
    if (ok) { setDialog(null); setOpenId(null) }
  }

  // ---------- panel de detalle ----------
  const stateControl = (o: Order) => {
    if (!perms.state) return <div className="why"><Lock size={14} {...stroke} /><span>Tu rol no cambia el estado de los pedidos.</span></div>
    if (o.estado === "entregado") return <div className="why"><CircleCheck size={14} {...stroke} /><span>Pedido cerrado: ya no admite cambios de estado.</span></div>
    const order: OrderStatus[] = ["pendiente_pago", "confirmado", "preparando", "enviado", "entregado"]
    const segs = o.estado === "pendiente_pago"
      ? [{ v: o.estado as string, cur: true }, { v: "confirmado", dis: true }, { v: "cancel", label: "Cancelar y eliminar", cx: true, dis: !perms.del }]
      : order.slice(order.indexOf(o.estado)).map((v, i) => (i === 0 ? { v: v as string, cur: true } : v === "entregado" && o.estado_pago !== "pagado" ? { v: v as string, dis: true } : { v: v as string }))
    const reason = o.estado === "pendiente_pago" ? (o.metodo_pago === "tarjeta" ? "«Confirmado» se habilita cuando el cliente pague con tarjeta." : "«Confirmado» se habilita al confirmar el pago.") : o.estado_pago !== "pagado" && segs.some(s => s.v === "entregado") ? "«Entregado» exige pago pagado: usa «Cobrar y entregar»." : ""
    return (
      <>
        <div className="lg" id={`lg${o.id_pedido}`}>Cambiar estado</div>
        <div className="seg" role="radiogroup" aria-labelledby={`lg${o.id_pedido}`}>
          {segs.map(s => (
            <button key={s.v} type="button" role="radio" aria-checked={!!s.cur} aria-disabled={s.dis || undefined} className={"cx" in s && s.cx ? "cx" : undefined}
              onClick={() => { if (s.dis || s.cur) return; if (s.v === "cancel") setDialog({ kind: "cancel", order: o }); else void exec(o, () => updateOrderStatus(o.id_pedido, s.v as OrderStatus), `Pedido ${o.numero_pedido} actualizado`) }}>
              {"label" in s && s.label ? s.label : EST[s.v]?.[0]}
            </button>
          ))}
        </div>
        {reason && <div className="why"><Info size={14} {...stroke} /><span>{reason}</span></div>}
      </>
    )
  }
  const deleteZone = (o: Order) => {
    if (!unpaid(o)) return <div className="dz"><button type="button" className="btn out" aria-disabled="true"><Trash2 size={16} {...stroke} />Eliminar pedido</button><div className="why"><Lock size={14} {...stroke} /><span>Un pedido pagado se conserva por trazabilidad.</span></div></div>
    if (!perms.del) return <div className="dz"><button type="button" className="btn out" aria-disabled="true"><Trash2 size={16} {...stroke} />Eliminar pedido</button><div className="why"><Lock size={14} {...stroke} /><span>Tu rol no elimina pedidos.</span></div></div>
    return <div className="dz"><button type="button" className="btn dout" onClick={() => setDialog({ kind: "delete", order: o })}><Trash2 size={16} {...stroke} />Eliminar pedido</button></div>
  }

  const detail = (o: Order) => {
    const a = actionFor(o, perms)
    const doc = o.cliente_documento_tipo === "RUC" ? <><div className="kv"><b>Factura</b></div><div className="kv m erp-num">RUC {o.cliente_documento_numero}</div><div className="kv m">{o.razon_social}</div></> : <div className="kv"><b>{o.tipo_comprobante === "boleta" ? "Boleta" : o.tipo_comprobante === "factura" ? "Factura" : "Nota de venta"}</b></div>
    const pays = paymentsOf(o)
    return (
      <aside className="dp" aria-label={`Detalle del pedido ${o.numero_pedido}`}>
        <div className="dph">
          <button type="button" className="ib erp-only-mob" aria-label="Volver a la lista" onClick={() => setOpenId(null)}><ArrowLeft size={22} {...stroke} /></button>
          <div className="tt2"><h2 className="num">{o.numero_pedido}</h2><div className="chips"><StatePill o={o} /><PaymentChip o={o} /></div><div className="sub num">Creado {dateTimeLima(o.fecha_creacion)} · {ago(hoursSince(o.fecha_creacion))}</div></div>
          <button type="button" className="ib" aria-label="Cerrar detalle" onClick={() => setOpenId(null)}><X size={20} {...stroke} /></button>
        </div>
        <div className="dpb">
          <section className="sec"><h3>Cliente y comprobante</h3><div className="g2"><div><div className="kv"><b>{o.cliente_nombre}</b></div><div className="kv m">{o.cliente_email}</div><div className="kv m num">{o.cliente_telefono}</div></div><div>{doc}</div></div></section>
          <section className="sec"><h3>Entrega</h3>
            <div className="kv" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ color: "hsl(var(--vivo))" }}>{o.tipo_entrega === "domicilio" ? <Truck size={16} {...stroke} /> : <Store size={16} {...stroke} />}</span><b>{o.tipo_entrega === "domicilio" ? "Delivery" : "Recojo en tienda"}</b></div>
            {o.tipo_entrega === "domicilio" ? <><div className="kv">{o.direccion_envio}, {o.direccion_distrito}</div><div className="kv m">{o.direccion_provincia}, {o.direccion_departamento}</div>{o.direccion_referencia && <div className="kv m">Referencia: {o.direccion_referencia}</div>}</> : <div className="kv m">El cliente recoge el pedido en la tienda.</div>}
            <div className="acts2"><a className="btn out" href={`tel:${o.cliente_telefono}`}><Phone size={16} {...stroke} />Llamar</a><a className="btn out" href={`https://wa.me/51${o.cliente_telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} {...stroke} />WhatsApp</a></div>
          </section>
          <section className="sec"><h3>Productos</h3>
            {(o.detalles ?? []).map((d, i) => <div key={i} className="pl"><div><div className="a">{d.producto_nombre}</div><div className="b num">{d.cantidad} × {money(Number(d.precio_unitario_con_igv))} · {COND[d.condicion ?? "nuevo"]} · Garantía {d.garantia_meses} meses</div></div><div className="a num" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{money(Number(d.subtotal_con_igv))}</div></div>)}
            <div style={{ marginTop: 8 }}>
              <div className="tl"><span>Subtotal</span><span className="num">{money(Number(o.subtotal))}</span></div>
              <div className="tl"><span>Envío</span><span className="num">{money(Number(o.costo_envio))}</span></div>
              {o.metodo_pago === "tarjeta" && <div className="tl"><span>Recargo tarjeta</span><span className="num">{money(Number(o.recargo_tarjeta))}</span></div>}
              <div className="tl t"><span>Total</span><b className="num">{money(Number(o.total_final))}</b></div>
            </div>
          </section>
          <section className="sec"><h3>Pagos</h3>
            {pays.length ? pays.map(g => { const [label, tone, Icon] = PEST[g.estado] ?? PEST.creado; return (
              <div key={g.id_pago} className="pl"><div><div className="a">{PROV[g.proveedor]}</div><div className="b num">{g.proveedor === "manual" ? `Referencia ${g.respuesta_segura?.reference ?? "—"}` : g.proveedor_id ? `Id Culqi ${g.proveedor_id}` : "Sin cargo aprobado todavía"} · {dateTimeLima(g.creado_en)}</div></div>
                <div style={{ textAlign: "right" }}><div className="a num" style={{ fontWeight: 600 }}>{money(g.monto_centimos / 100)}</div><span className={`st ${tone}`}><Icon size={14} {...stroke} />{label}</span></div></div>) }) : <div className="kv m">Sin pagos registrados.</div>}
          </section>
          {o.notas_cliente && <section className="sec"><h3>Notas del cliente</h3><div className="kv">{o.notas_cliente}</div></section>}
          <div className="sec erp-only-mob">{stateControl(o)}<div style={{ marginTop: 12 }}>{deleteZone(o)}</div></div>
        </div>
        <div className="dpf">
          {a.kind !== "view" && <ActionButton o={o} block />}
          {a.disabled && a.why && <div className="why"><Lock size={14} {...stroke} /><span>{a.why}.</span></div>}
          <div className="erp-only-desk">{stateControl(o)}</div>
          <div className="erp-only-desk">{deleteZone(o)}</div>
        </div>
      </aside>
    )
  }

  const searchBox = (
    <div className="srch"><Search className="ic" size={18} {...stroke} /><input className="inp" type="search" placeholder="Buscar n.º de pedido, cliente o teléfono" aria-label="Buscar pedidos por n.º de pedido, cliente o teléfono" value={q} onChange={e => setQ(e.target.value)} /></div>
  )
  const flagBtn = (key: keyof typeof flags, label: string, n: number) => (
    <button key={key} type="button" className="fch" aria-pressed={flags[key]} onClick={() => setFlags(f => ({ ...f, [key]: !f[key] }))}>{label} <span className="cnt num">{n}</span></button>
  )

  return (
    <div className="pg-pedidos">
      <div className="pg" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="hd"><h1>Pedidos y pagos web</h1>{searchBox}</div>
        {!isLoading && nSoon > 0 && (
          <div className="aviso" role="status"><TriangleAlert size={18} {...stroke} /><span><b>{nSoon} pedido{nSoon > 1 ? "s" : ""} sin pagar</b> se elimina{nSoon > 1 ? "n" : ""} en 6 h o menos</span>
            <button type="button" className="lnk" onClick={() => { if (nSoon > 1) { setTab(5); setFlags(f => ({ ...f, soon: true })) } else if (firstSoon) setOpenId(firstSoon.id_pedido) }}>{nSoon > 1 ? "Verlos" : "Ver pedido"}<ChevronRight size={16} {...stroke} /></button></div>
        )}
        <div className="tabs" role="tablist" aria-label="Etapas del pedido">
          {TABS.map(([label, Icon], i) => <button key={label} type="button" role="tab" className="tab" aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)}><Icon size={16} {...stroke} /><span>{label}</span><span className="cnt num">{isLoading ? "–" : counts[i]}</span></button>)}
        </div>
        <div className="fl" role="group" aria-label="Filtros">
          {flagBtn("unpaid", "Sin pagar", visible.filter(unpaid).length)}
          {flagBtn("soon", "Por vencer", nSoon)}
          {flagBtn("delivery", "Delivery", visible.filter(o => o.tipo_entrega === "domicilio").length)}
          {flagBtn("pickup", "Recojo en tienda", visible.filter(o => o.tipo_entrega === "recojo_tienda").length)}
          {perms.afiliado && <span className="tag" style={{ flex: "none", padding: "10px 12px", fontSize: 13 }}>Solo pedidos con productos de tu negocio</span>}
        </div>
        <div role="tabpanel" tabIndex={0}>
          {isLoading ? (
            <div className="card lst" aria-busy="true"><div className="emp"><p>Cargando pedidos…</p></div></div>
          ) : !rows.length ? (
            <div className="card"><div className="emp">{<Inbox size={28} {...stroke} />}<h2>No hay pedidos en «{TABS[tab][0]}»</h2><p>Los pedidos que lleguen a esta etapa aparecerán aquí.</p>{tab !== 5 && <button type="button" className="lnk" onClick={() => setTab(5)}>Ver todos los pedidos<ChevronRight size={16} {...stroke} /></button>}</div></div>
          ) : (
            <>
              <div className="card lst erp-only-desk" role="table" aria-label="Pedidos web">
                <div className="lh" role="row"><div role="columnheader">Pedido</div><div role="columnheader">Cliente</div><div role="columnheader">Entrega y productos</div><div role="columnheader">Pago</div><div className="r" role="columnheader">Total</div><div className="estc" role="columnheader">Estado</div><div role="columnheader">Acción</div></div>
                {rows.map(o => { const f = firstItem(o); return (
                  <div key={o.id_pedido} className="rwx" role="row"><div className="rw">
                    <div className="pd" role="cell"><div className="no num">{o.numero_pedido}</div><div className="ago">{ago(hoursSince(o.fecha_creacion))}</div><div className="estl"><StatePill o={o} /></div></div>
                    <div className="cl" role="cell"><div className="a">{o.cliente_nombre}</div><div className="b num">{o.cliente_telefono}</div></div>
                    <div className="pr" role="cell"><div className="a">{f.name}{f.more > 0 && <> <i>+{f.more} más</i></>}</div><span className="tag">{entrega(o)}</span></div>
                    <div className="pgc" role="cell"><div className="l1"><span className="tag">{MET[o.metodo_pago]}</span><PaymentChip o={o} /></div><Countdown o={o} /></div>
                    <div className="tot num" role="cell">{money(Number(o.total_final))}</div>
                    <div className="estc" role="cell"><StatePill o={o} /></div>
                    <div className="ac" role="cell"><ActionButton o={o} /></div></div>
                    <RowError o={o} />
                    <button type="button" className="rowlk" aria-label={`Ver detalle de ${o.numero_pedido}, ${o.cliente_nombre}`} onClick={() => setOpenId(o.id_pedido)} /></div>) })}
              </div>
              <div className="mlist erp-only-mob">
                {rows.map(o => { const f = firstItem(o); return (
                  <article key={o.id_pedido} className="card mc">
                    <div className="row"><div><span className="no num">{o.numero_pedido}</span> <span className="ago">· {ago(hoursSince(o.fecha_creacion))}</span></div><StatePill o={o} /></div>
                    <div className="row"><div className="nm">{o.cliente_nombre}</div><div className="tt num">{money(Number(o.total_final))}</div></div>
                    <div className="pn">{f.name}{f.more > 0 && ` +${f.more} más`}</div>
                    <div className="tags"><span className="tag tw">{entrega(o)}</span><span className="tag">{MET[o.metodo_pago]}</span><PaymentChip o={o} /></div>
                    <Countdown o={o} /><RowError o={o} />
                    <ActionButton o={o} block />
                    <button type="button" className="rowlk" aria-label={`Ver detalle de ${o.numero_pedido}`} onClick={() => setOpenId(o.id_pedido)} />
                  </article>) })}
              </div>
            </>
          )}
        </div>
      </div>

      <DialogPrimitive.Root open={!!open} onOpenChange={o => !o && setOpenId(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="erp-scrim" />
          <DialogPrimitive.Content className="pg-pedidos pg-drawer" aria-describedby={undefined}>
            <DialogPrimitive.Title className="erp-sr">{open?.numero_pedido}</DialogPrimitive.Title>
            {open && detail(open)}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="erp-scrim" style={{ zIndex: 62 }} />
          <DialogPrimitive.Content className="erp-dlg pg-dlg pg-pedidos" style={{ zIndex: 63 }} aria-describedby={undefined}>
            {dialog && (() => {
              const o = dialog.order, cod = o.metodo_pago === "contraentrega"
              if (dialog.kind === "pay") {
                const label = cod ? "Cobrar y entregar" : "Confirmar pago"
                return (
                  <div className="dlg">
                    <div className="dic"><Banknote size={22} {...stroke} /></div>
                    <DialogPrimitive.Title asChild><h3 className="num">{label} · {o.numero_pedido}</h3></DialogPrimitive.Title>
                    <p className="s">{o.cliente_nombre} · {MET[o.metodo_pago]}</p>
                    <div className="sum"><div className="r1"><span>{cod ? "Monto a cobrar al entregar" : "Monto exacto a validar"}</span><span>{MET[o.metodo_pago]}</span></div><div className="amt">{money(Number(o.total_final))}</div></div>
                    <div className="fld"><label htmlFor={`ref${o.id_pedido}`}>N.º de operación (opcional)</label><input className="inp" id={`ref${o.id_pedido}`} value={ref} onChange={e => setRef(e.target.value)} placeholder="Ej. OP-900105" autoComplete="off" /></div>
                    <div className="eff"><Info size={16} {...stroke} /><span>Al confirmar se creará la venta y se descontará el stock de {o.detalles?.length ?? 0} producto{(o.detalles?.length ?? 0) > 1 ? "s" : ""} ({units(o)} unidades). El pedido pasará a «{cod ? "Entregado" : "Confirmado"}»{cod ? "" : " y dejará de contar las 24 h"}.</span></div>
                    <div className="acts"><button type="button" className="btn out" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="btn" disabled={run.isPending} onClick={() => void confirmPay()}>{label}</button></div>
                  </div>
                )
              }
              const cancel = dialog.kind === "cancel"
              return (
                <div className="dlg">
                  <div className="dic d"><Trash2 size={22} {...stroke} /></div>
                  <DialogPrimitive.Title asChild><h3 className="num">{cancel ? "Cancelar y eliminar" : "Eliminar pedido"} {o.numero_pedido}</h3></DialogPrimitive.Title>
                  <p className="s">{cancel ? "Cancelar un pedido sin pagar lo elimina definitivamente: no queda como cancelado y no se puede recuperar." : "El pedido se elimina definitivamente y no se puede recuperar."}</p>
                  <div className="sum"><div className="r1"><span>{o.cliente_nombre}</span><span className="num"><b>{money(Number(o.total_final))}</b></span></div><div className="r1"><span>{MET[o.metodo_pago]} · {ago(hoursSince(o.fecha_creacion))}</span><span>{EST[o.estado][0]}</span></div></div>
                  <div className="eff"><Info size={16} {...stroke} /><span>No tiene pago ni venta: no se devuelve dinero y no hay stock que restaurar (todavía no se descontó).</span></div>
                  <div className="acts"><button type="button" className="btn out" onClick={() => setDialog(null)}>{cancel ? "Volver" : "Conservar pedido"}</button><button type="button" className="btn dng" disabled={run.isPending} onClick={() => void confirmDelete()}>{cancel ? "Cancelar y eliminar" : "Eliminar definitivamente"}</button></div>
                </div>
              )
            })()}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}

export default WebOrdersPage
