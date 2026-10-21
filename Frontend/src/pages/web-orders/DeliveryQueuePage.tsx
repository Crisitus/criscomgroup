"use client"

import "../../styles/entregas.css"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Banknote, CircleCheck, ClipboardList, Clock, Ellipsis, Inbox, MapPin, MessageCircle, MessageSquare, Package, Phone, Search, Truck, Undo2, X, ChevronRight } from "lucide-react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { dateTimeLima, money, norm, phoneFmt } from "../../components/erp/format"
import { confirmManualPayment, errorMessage, fetchDeliveries, hoursSince, hoursToExpire, updateOrderStatus, type Order, type OrderStatus } from "../../services/orderService"

type Stage = "confirmado" | "preparando" | "enviado"
const STAGES: Array<{ key: Stage; label: string; icon: typeof Package }> = [
  { key: "confirmado", label: "Por preparar", icon: ClipboardList },
  { key: "preparando", label: "Preparando", icon: Package },
  { key: "enviado", label: "En camino", icon: Truck },
]
const stroke = { strokeWidth: 1.75, "aria-hidden": true } as const
const isPendingCollection = (o: Order) => o.metodo_pago === "contraentrega" && o.estado_pago === "pendiente"
const mapUrl = (o: Order) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([o.direccion_envio, o.direccion_distrito, o.direccion_provincia, o.direccion_departamento].filter(Boolean).join(", "))
const digits = (o: Order) => o.cliente_telefono.replace(/\D/g, "")
const age = (o: Order) => {
  const h = hoursSince(o.fecha_creacion)
  return h >= 48 ? { text: `Lleva ${Math.floor(h / 24)} días`, late: true } : h >= 24 ? { text: "Lleva 1 día", late: false } : { text: `Hace ${h} h`, late: false }
}
const nextAction = (o: Order) => {
  if (o.estado === "confirmado") return { label: "Empezar a preparar", icon: Package, to: "preparando" as OrderStatus }
  if (o.estado === "preparando") return { label: "Marcar en camino", icon: Truck, to: "enviado" as OrderStatus }
  if (isPendingCollection(o)) return { label: "Cobrar y entregar", icon: Banknote, to: "entregado" as OrderStatus }
  return { label: "Confirmar entrega", icon: CircleCheck, to: "entregado" as OrderStatus }
}
const previousOf = (o: Order): { label: string; to: OrderStatus } | null =>
  o.estado === "preparando" ? { label: "Por preparar", to: "confirmado" } : o.estado === "enviado" ? { label: "Preparando", to: "preparando" } : null

function PaymentBand({ order }: { order: Order }) {
  const envio = Number(order.costo_envio), total = Number(order.total_final)
  if (isPendingCollection(order)) {
    const hours = hoursToExpire(order)
    return (
      <div className="bd cob">
        <div><span className="s"><Banknote size={16} {...stroke} />Cobrar al entregar</span><span className="big">{money(total)}</span></div>
        <div className="r"><span><Clock size={14} {...stroke} />Se elimina en {hours} h</span><span>Incluye envío {money(envio)}</span></div>
      </div>
    )
  }
  return <div className="bd ok"><span className="s"><CircleCheck size={16} {...stroke} />Pagado · envío {money(envio)}</span><span className="t">{money(total)}</span></div>
}

function DeliveryCard({ order, onAdvance, onBack }: { order: Order; onAdvance: (o: Order) => void; onBack: (o: Order) => void }) {
  const [menu, setMenu] = useState(false)
  const action = nextAction(order), a = age(order), prev = previousOf(order)
  const ActionIcon = action.icon
  return (
    <article className="dc" aria-label={`Pedido ${order.numero_pedido}`}>
      <div className="dc-h"><b>{order.numero_pedido}</b><span className={`age${a.late ? " late" : ""}`} title={`Creado ${dateTimeLima(order.fecha_creacion)}`}><Clock size={14} {...stroke} />{a.text}</span></div>
      <div className="dc-c">
        <div className="nm"><span className="n1">{order.cliente_nombre}</span><span className="n2">{phoneFmt(order.cliente_telefono)}</span></div>
        <a className="ab" href={`tel:+51${digits(order)}`} aria-label={`Llamar a ${order.cliente_nombre}, ${phoneFmt(order.cliente_telefono)}`}><Phone size={16} {...stroke} /><span>Llamar</span></a>
        <a className="ab" href={`https://wa.me/51${digits(order)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp a ${order.cliente_nombre}`}><MessageCircle size={16} {...stroke} /><span>WhatsApp</span></a>
      </div>
      <div className="dc-a">
        <div className="ad">
          <span className="l1">{order.direccion_envio}, {order.direccion_distrito}</span>
          {order.direccion_referencia && <span className="rf"><MapPin size={14} {...stroke} />{order.direccion_referencia}</span>}
        </div>
        <a className="ab" href={mapUrl(order)} target="_blank" rel="noreferrer" aria-label={`Abrir en el mapa: ${order.direccion_envio}, ${order.direccion_distrito}`}><MapPin size={16} {...stroke} /><span>Mapa</span></a>
      </div>
      <div className="dc-p">
        {order.detalles?.map((d, i) => <div key={i} className="pr"><span className="q">{d.cantidad} ×</span> {d.producto_nombre}</div>)}
        {order.notas_cliente && <div className="nt"><MessageSquare size={14} {...stroke} /><span>Nota: {order.notas_cliente}</span></div>}
      </div>
      <PaymentBand order={order} />
      <div className="dc-x">
        <button type="button" className="btn" onClick={() => onAdvance(order)} aria-label={`${action.label}: pedido ${order.numero_pedido}`}><ActionIcon size={16} {...stroke} />{action.label}</button>
        {prev && (
          <>
            <button type="button" className="ib" aria-haspopup="menu" aria-expanded={menu} aria-label={`Más acciones del pedido ${order.numero_pedido}`} onClick={() => setMenu(m => !m)}><Ellipsis size={18} {...stroke} /></button>
            {menu && (
              <div className="mnu" role="menu" aria-label={`Más acciones del pedido ${order.numero_pedido}`}>
                <button type="button" className="mi" role="menuitem" onClick={() => { setMenu(false); onBack(order) }}><Undo2 size={16} {...stroke} />Regresar a {prev.label}</button>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}

const DeliveryQueuePage = () => {
  useDocumentTitle("Entregas por confirmar")
  const queryClient = useQueryClient()
  const { data: deliveries = [], isLoading } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries })
  const [q, setQ] = useState("")
  const [sel, setSel] = useState<Stage | "cobrar" | null>(null)
  const [tab, setTab] = useState<Stage>("confirmado")
  const [confirm, setConfirm] = useState<{ order: Order; kind: "cobrar" | "entrega" } | null>(null)
  const [reference, setReference] = useState("")

  const base = useMemo(() => deliveries.filter(o => !q || [o.numero_pedido, o.cliente_nombre, o.direccion_distrito ?? ""].some(s => norm(s).includes(norm(q)))), [deliveries, q])
  const shown = base.filter(o => !sel || (sel === "cobrar" ? isPendingCollection(o) : o.estado === sel))
  const count = (k: Stage) => base.filter(o => o.estado === k).length
  const toCollect = base.filter(isPendingCollection).reduce((s, o) => s + Number(o.total_final), 0)

  const setStatus = useMutation({
    mutationFn: ({ order, to }: { order: Order; to: OrderStatus }) => updateOrderStatus(order.id_pedido, to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
    onError: (error, vars) => toast.error("No se pudo cambiar el estado", { description: `${vars.order.numero_pedido}: ${errorMessage(error, "Intenta de nuevo.")}` }),
  })

  const move = async (order: Order, to: OrderStatus, message: string, undoTo?: OrderStatus) => {
    await setStatus.mutateAsync({ order, to })
    toast.success(message, undoTo ? { action: { label: "Deshacer", onClick: () => setStatus.mutate({ order, to: undoTo }) } } : undefined)
  }

  const advance = (order: Order) => {
    const a = nextAction(order)
    if (a.to === "entregado") { setReference(""); setConfirm({ order, kind: isPendingCollection(order) ? "cobrar" : "entrega" }); return }
    void move(order, a.to, `Pedido ${order.numero_pedido} ${a.to === "preparando" ? "en preparación" : "marcado en camino"}`, order.estado as OrderStatus).catch(() => {})
  }
  const back = (order: Order) => { const p = previousOf(order); if (p) void move(order, p.to, `Pedido ${order.numero_pedido} regresó a ${p.label}`).catch(() => {}) }

  const finish = async () => {
    if (!confirm) return
    const { order, kind } = confirm
    try {
      if (kind === "cobrar") await confirmManualPayment(order.id_pedido, reference.trim())
      await setStatus.mutateAsync({ order, to: "entregado" })
      toast.success(kind === "cobrar" ? `Cobro registrado y pedido ${order.numero_pedido} entregado` : `Pedido ${order.numero_pedido} entregado`)
      setConfirm(null)
    } catch (error) {
      toast.error("No se pudo completar", { description: errorMessage(error, "Intenta de nuevo.") })
    }
  }

  const cell = (key: Stage | "cobrar", label: string, value: string | number) => (
    <button key={key} type="button" className="cell" aria-pressed={sel === key} onClick={() => setSel(sel === key ? null : key)}>
      <span className="l">{label}</span><span className="v">{value}</span><span className="ver">Ver <ChevronRight size={14} {...stroke} /></span>
    </button>
  )
  const filterLabel = { confirmado: "Por preparar", preparando: "Preparando", enviado: "En camino", cobrar: "Por cobrar al entregar" } as const

  const header = (
    <div className="ph">
      <h1>Entregas por confirmar</h1>
      <div className="sr" role="search">
        <label className="sr-only" htmlFor="entregas-q">Buscar por pedido, cliente o distrito</label>
        <Search className="ic lens" size={18} {...stroke} />
        <input id="entregas-q" type="search" placeholder="Buscar pedido, cliente o distrito" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
        {q && <button type="button" className="clr" aria-label="Borrar búsqueda" onClick={() => setQ("")}><X size={18} {...stroke} /></button>}
      </div>
    </div>
  )

  if (isLoading) return <div className="pg-entregas"><div className="page">{header}<div role="status" className="sr-only">Cargando entregas…</div><div className="board">{STAGES.map(g => <section key={g.key}><div className="chd"><g.icon className="ic" size={18} {...stroke} /><h2>{g.label}</h2></div><div className="cards"><div className="dc skl" aria-hidden="true"><span className="sk" style={{ height: 14, width: "55%" }} /><span className="sk" style={{ height: 44 }} /><span className="sk" style={{ height: 44 }} /><span className="sk" style={{ height: 40 }} /></div></div></section>)}</div></div></div>

  if (!deliveries.length) return (
    <div className="pg-entregas"><div className="page">{header}
      <div className="empty"><div className="eic"><Truck size={22} {...stroke} /></div><h2>No hay entregas pendientes</h2><p>Los pedidos a domicilio pagados o por cobrar al entregar aparecerán aquí, del más antiguo al más nuevo.</p></div>
    </div></div>
  )

  const cards = (list: Order[]) => list.length
    ? list.map(o => <DeliveryCard key={o.id_pedido} order={o} onAdvance={advance} onBack={back} />)
    : <div className="none"><Inbox size={16} {...stroke} />Sin pedidos en esta etapa</div>

  const chips = [q && `Distrito «${q}»`, sel && filterLabel[sel]].filter(Boolean) as string[]

  return (
    <div className="pg-entregas">
      <div className="page">
        {header}
        <div className="strip c4 erp-only-desk">{STAGES.map(g => cell(g.key, g.label, count(g.key)))}{cell("cobrar", "Por cobrar al entregar", money(toCollect))}</div>
        <div className="strip c1 erp-only-mob">{cell("cobrar", "Por cobrar al entregar", money(toCollect))}</div>
        {chips.length > 0 && (
          <div className="flt"><span className="n">{shown.length} {shown.length === 1 ? "resultado" : "resultados"}</span>
            {chips.map((c, i) => <span key={c} className="fc">{c}<button type="button" className="x" aria-label={`Quitar filtro ${c}`} onClick={() => (i === 0 && q ? setQ("") : setSel(null))}><X size={14} {...stroke} /></button></span>)}
          </div>
        )}
        <div className="board erp-only-desk">
          {STAGES.map(g => {
            const col = shown.filter(o => o.estado === g.key)
            return <section key={g.key} aria-label={g.label}><div className="chd"><g.icon className="ic" size={18} {...stroke} /><h2>{g.label}</h2><span className="cnt">{col.length}</span></div><div className="cards">{cards(col)}</div></section>
          })}
        </div>
        <div className="erp-only-mob">
          <div className="tabs" role="tablist" aria-label="Etapa de la entrega">
            {STAGES.map(g => <button key={g.key} type="button" className="tab" role="tab" aria-selected={tab === g.key} onClick={() => setTab(g.key)}>{g.label}<span className="cnt">{count(g.key)}</span></button>)}
          </div>
          <div className="cards" role="tabpanel">{cards(shown.filter(o => o.estado === tab))}</div>
        </div>
      </div>

      <ErpDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)} icon={confirm?.kind === "cobrar" ? <Banknote size={22} {...stroke} /> : <CircleCheck size={22} {...stroke} />}
        title={confirm?.kind === "cobrar" ? "Cobrar y entregar" : "Confirmar entrega"}
        description={confirm ? `Pedido ${confirm.order.numero_pedido} · ${confirm.order.cliente_nombre} · ${confirm.order.direccion_envio}, ${confirm.order.direccion_distrito}` : undefined}>
        {confirm && (confirm.kind === "cobrar" ? (
          <>
            <div className="erp-amt cob"><span className="l"><Banknote size={16} {...stroke} />Monto a cobrar al cliente</span><b>{money(Number(confirm.order.total_final))}</b><span className="n">Productos {money(Number(confirm.order.subtotal))} + envío {money(Number(confirm.order.costo_envio))}</span></div>
            <label htmlFor="entrega-ref">Referencia del cobro (opcional)</label>
            <input className="inp" id="entrega-ref" value={reference} onChange={e => setReference(e.target.value)} placeholder="N.º de operación o nota del cobro" autoComplete="off" />
            <p className="cq">Al confirmar se registra el pago, se crea la venta, se descuenta el stock y el pedido pasa a Entregado y sale de la cola.</p>
          </>
        ) : (
          <>
            <div className="erp-amt ok"><span className="l"><CircleCheck size={16} {...stroke} />Pagado · no hay nada que cobrar</span><b>{money(Number(confirm.order.total_final))}</b><span className="n">{(confirm.order.detalles ?? []).reduce((s, d) => s + d.cantidad, 0)} productos · creado {dateTimeLima(confirm.order.fecha_creacion)}</span></div>
            <p className="cq">El pedido pasa a Entregado y sale de la cola de entregas.</p>
          </>
        ))}
        <div className="acts">
          <button type="button" className="erp-btn out" onClick={() => setConfirm(null)}>Cancelar</button>
          <button type="button" className="erp-btn" onClick={() => void finish()} disabled={setStatus.isPending}>
            {confirm?.kind === "cobrar" ? <><Banknote size={16} {...stroke} />Cobrar {money(Number(confirm.order.total_final))} y entregar</> : <><CircleCheck size={16} {...stroke} />Confirmar entrega</>}
          </button>
        </div>
      </ErpDialog>
    </div>
  )
}

export default DeliveryQueuePage
