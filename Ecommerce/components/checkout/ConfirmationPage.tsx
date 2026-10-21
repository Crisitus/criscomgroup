"use client"

// Confirmacion de pedido (port criscom-ecom-checkout): numero grande + copiar,
// chips icono+palabra, que sigue, detalle, entrega y acciones.
// Privacidad: el seguimiento publico NO devuelve direccion ni contacto.
import { useCallback, useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle, Check, Clock, Copy, Loader, MessageCircle, Package, ShoppingBag,
} from "lucide-react"
import { orderService } from "@/services/orderService"
import { useConfigPublica } from "@/hooks/useSocialLinks"
import { chipOf, ESTADO_PAGO, ESTADO_PEDIDO, fechaLarga, money, r2, waAyuda } from "./checkoutShared"
import "@/styles/checkout.css"

interface Detalle {
  id_detalle?: number
  producto_nombre: string
  cantidad: number
  precio_unitario_con_igv: number | string
  subtotal_con_igv: number | string
  condicion?: string
  garantia_meses?: number
}

interface PedidoPublico {
  numero_pedido: string
  estado: string
  estado_pago: string
  total_final: number | string
  tipo_entrega: string
  fecha_creacion: string
  detalles: Detalle[]
}

const Chip = ({ mapKey, map }: { mapKey: string; map: typeof ESTADO_PEDIDO }) => {
  const def = chipOf(map, mapKey)
  const Icon = def.icon
  return <span className={`chip ${def.kind}`}><Icon className="ck-ic" aria-hidden />{def.label}</span>
}

// Que sigue, segun lo que el backend sabe (sin inventar validacion de Yape en pantalla).
const nextStep = (p: PedidoPublico): { icon: typeof Clock; title: string; body: React.ReactNode } => {
  if (p.estado === "entregado") {
    return { icon: Package, title: "Pedido entregado", body: "Tu pedido ya fue entregado. Si algo no está bien, escríbenos por WhatsApp con tu número de pedido." }
  }
  if (p.estado_pago === "pendiente" || p.estado === "pendiente_pago") {
    return {
      icon: Clock,
      title: "Qué sigue",
      body: <>Te contactaremos por WhatsApp para validar tu pago. Tu pedido sigue en <strong>«Pendiente de pago»</strong> hasta que el ERP lo valide.</>,
    }
  }
  return {
    icon: Check,
    title: "Qué sigue",
    body: <>Recibimos tu pago. Ahora preparamos tu pedido; puedes seguir su estado con tu número de pedido.</>,
  }
}

const ConfirmationPage = () => {
  const config = useConfigPublica()
  const params = useParams()
  const searchParams = useSearchParams()
  const numeroPedido = String(params.numeroPedido || "")
  const [order, setOrder] = useState<PedidoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const pagoFlag = searchParams.get("pago")

  const loadOrder = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true)
    try {
      const response = await orderService.trackOrder(numeroPedido)
      if (response.success) { setOrder(response.pedido); setNotFound(false) }
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [numeroPedido])

  useEffect(() => { void loadOrder(true) }, [loadOrder])

  const copyNumero = async () => {
    try {
      await navigator.clipboard.writeText(numeroPedido)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* portapapeles bloqueado: el numero queda visible igual */ }
  }

  const waUrl = waAyuda(config?.whatsapp_number, numeroPedido)

  if (loading) {
    return (
      <div className="pg-checkout">
        <div className="empty" role="status">
          <span className="big"><Loader className="ck-ic spin" aria-hidden /></span>
          <p>Cargando tu pedido…</p>
        </div>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="pg-checkout">
        <main className="empty">
          <span className="big"><AlertCircle className="ck-ic" aria-hidden /></span>
          <h1>No encontramos este pedido</h1>
          <p>El número «{numeroPedido}» no existe o está mal escrito. Revisa el número que recibiste al confirmar.</p>
          <div className="acts" style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
            <Link className="btn btn-p" href="/catalogo"><ShoppingBag className="ck-ic" aria-hidden />Continuar comprando</Link>
            {waUrl ? <a className="btn btn-wa" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="ck-ic" aria-hidden />¿Necesitas ayuda?</a> : null}
          </div>
        </main>
      </div>
    )
  }

  const nx = nextStep(order)
  const NxIcon = nx.icon
  const sumaItems = r2((order.detalles || []).reduce((a, d) => a + Number(d.subtotal_con_igv), 0))
  const envioYCargos = r2(Number(order.total_final) - sumaItems)
  const recojo = order.tipo_entrega === "recojo_tienda"
  const esEntregado = order.estado === "entregado"

  return (
    <div className="pg-checkout">
      <main className="ck-wrap">
        <div className="ck-titlebar">
          <h1>{esEntregado ? "Detalle de tu pedido" : "Pedido recibido"}</h1>
          <p className="sub">Realizado el {fechaLarga(order.fecha_creacion)}</p>
        </div>

        {pagoFlag === "verificacion" ? (
          <p className="note" role="status" style={{ marginBottom: 16 }}>
            <Clock className="ck-ic" aria-hidden />
            <span><b>Pago recibido y en verificación.</b> No vuelvas a realizar el pago. Actualizaremos el pedido automáticamente cuando Culqi confirme la operación.</span>
          </p>
        ) : null}
        {pagoFlag === "pendiente" ? (
          <p className="note" role="status" style={{ marginBottom: 16 }}>
            <Clock className="ck-ic" aria-hidden />
            <span>Tu pedido quedó guardado como <strong>pendiente de pago</strong>. Puedes completarlo cuando quieras.</span>
          </p>
        ) : null}

        <section className="card ohead" aria-label="Número de pedido y estados">
          <div>
            <span className="lab">Número de pedido</span>
            <div className="numrow">
              <strong className="onum tn">{order.numero_pedido}</strong>
              <button className="btn btn-s sm" type="button" onClick={copyNumero}>
                {copied ? <Check className="ck-ic" aria-hidden /> : <Copy className="ck-ic" aria-hidden />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <div className="chips">
            <div><span className="lab">Estado</span><Chip mapKey={order.estado} map={ESTADO_PEDIDO} /></div>
            <div><span className="lab">Pago</span><Chip mapKey={order.estado_pago} map={ESTADO_PAGO} /></div>
          </div>
        </section>

        <div className="grid">
          <div className="col">
            <section className="card next" aria-label="Qué sigue">
              <span className="qi"><NxIcon className="ck-ic" aria-hidden /></span>
              <div><h2>{nx.title}</h2><p>{nx.body}</p></div>
            </section>

            <section className="card" aria-label="Detalle del pedido">
              <h2 className="sh" style={{ marginBottom: 12 }}>Detalle</h2>
              <div className="itm h" aria-hidden>
                <span>Producto</span><span className="q">Cant.</span>
                <span className="r pu">P. unitario</span><span className="r">Subtotal</span>
              </div>
              {(order.detalles || []).map((d, i) => (
                <div className="itm" key={d.id_detalle ?? i}>
                  <div>
                    <b>{d.producto_nombre}</b>
                    <small>
                      {d.condicion === "segunda_mano" ? "Segunda mano" : "Nuevo"}
                      {d.garantia_meses ? ` · ${d.garantia_meses} meses de garantía` : ""}
                    </small>
                  </div>
                  <span className="q tn">{d.cantidad}<span className="qmul"> × {money(d.precio_unitario_con_igv)}</span></span>
                  <span className="r pu tn">{money(d.precio_unitario_con_igv)}</span>
                  <span className="r tn"><b style={{ fontWeight: 600 }}>{money(d.subtotal_con_igv)}</b></span>
                </div>
              ))}
            </section>
          </div>

          <aside className="col">
            <section className="card" aria-label="Entrega y total">
              <h2 className="cn">{recojo ? "Recojo en tienda" : "Envío a domicilio"}</h2>
              <p className="ck-sub" style={{ margin: "0 0 16px" }}>
                {recojo && config?.direccion
                  ? <>{config.direccion}{config?.horario?.inicio && config?.horario?.fin ? <><br />Horario {config.horario.inicio}–{config.horario.fin}</> : null}</>
                  : "Por privacidad, aquí no mostramos la dirección ni los datos de contacto."}
              </p>
              <dl className="kv">
                <div><dt>Productos</dt><dd className="tn">{money(sumaItems)}</dd></div>
                <div><dt>Envío y cargos</dt><dd className="tn">{money(envioYCargos)}</dd></div>
                <div className="tt"><dt>Total</dt><dd className="tn">{money(order.total_final)}</dd></div>
              </dl>
            </section>

            <div className="acts">
              <button className="btn btn-p" type="button" onClick={() => void loadOrder()} disabled={refreshing} aria-busy={refreshing}>
                {refreshing ? <Loader className="ck-ic spin" aria-hidden /> : <Package className="ck-ic" aria-hidden />}
                Ver seguimiento
              </button>
              <Link className="btn btn-s" href="/catalogo"><ShoppingBag className="ck-ic" aria-hidden />Continuar comprando</Link>
              {waUrl
                ? <a className="btn btn-wa" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="ck-ic" aria-hidden />¿Necesitas ayuda con tu pedido?</a>
                : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default ConfirmationPage
