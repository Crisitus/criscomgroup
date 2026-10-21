"use client"

// payment-success: tarjeta centrada con numero de pedido y que sigue.
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Package, ShoppingBag } from "lucide-react"
import { orderService } from "@/services/orderService"
import { chipOf, ESTADO_PAGO, ESTADO_PEDIDO } from "./checkoutShared"
import "@/styles/checkout.css"

const PaymentSuccessView = () => {
  const searchParams = useSearchParams()
  const numero = searchParams.get("pedido") || searchParams.get("order") || ""
  const [chips, setChips] = useState<{ estado: string; estado_pago: string } | null>(null)

  useEffect(() => {
    if (!numero) return
    orderService.trackOrder(numero)
      .then((r) => { if (r?.success) setChips({ estado: r.pedido.estado, estado_pago: r.pedido.estado_pago }) })
      .catch(() => setChips(null))
  }, [numero])

  const renderChip = (mapKey: string, map: typeof ESTADO_PEDIDO) => {
    const def = chipOf(map, mapKey)
    const Icon = def.icon
    return <span className={`chip ${def.kind}`}><Icon className="ck-ic" aria-hidden />{def.label}</span>
  }

  return (
    <div className="pg-checkout">
      <main className="narrow">
        <section className="card">
          <span className="st ok"><CheckCircle2 className="ck-ic" aria-hidden /></span>
          <h1>Pago exitoso</h1>
          {numero ? (
            <div>
              <span className="lab" style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>Pedido</span>
              <div className="onum tn">{numero}</div>
            </div>
          ) : null}
          {chips ? (
            <div className="chips">
              <div><span className="lab">Estado</span>{renderChip(chips.estado, ESTADO_PEDIDO)}</div>
              <div><span className="lab">Pago</span>{renderChip(chips.estado_pago, ESTADO_PAGO)}</div>
            </div>
          ) : null}
          <p>Recibimos tu pago. Ahora preparamos tu pedido; puedes seguir su estado con tu número de pedido.</p>
          <div className="acts">
            {numero ? (
              <Link className="btn btn-p" href={`/order-confirmation/${encodeURIComponent(numero)}`}>
                <Package className="ck-ic" aria-hidden />Ver mi pedido
              </Link>
            ) : null}
            <Link className="btn btn-s" href="/catalogo"><ShoppingBag className="ck-ic" aria-hidden />Seguir comprando</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default PaymentSuccessView
