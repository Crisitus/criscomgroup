"use client"

// Resumen del pedido: el servidor recalcula TODO; aqui solo se informa.
// Nunca muestra "GRATIS" sin cotizacion: sin direccion dice "Se calcula con tu direccion".
import { ChevronDown, Loader, MessageCircle, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { money, r2, type Quote } from "./checkoutShared"
import type { CartItem } from "@/services/cartService"
import type { MetodoPago } from "./checkoutShared"

export interface Totals {
  subtotal: number
  envio: number | null // null = pendiente de cotizar
  recargo: number
  total: number
}

export const calcTotals = (items: CartItem[], tipoEntrega: string, quote: Quote | null, metodo: MetodoPago): Totals => {
  const subtotal = r2(items.reduce((a, i) => a + i.price * i.quantity, 0))
  const envio = tipoEntrega !== "domicilio" ? 0 : quote ? r2(quote.amount) : null
  const recargo = metodo === "tarjeta"
    ? r2(items.filter((i) => i.affiliate_business_id).reduce((a, i) => a + i.price * i.quantity, 0) * 0.05)
    : 0
  return { subtotal, envio, recargo, total: r2(subtotal + (envio || 0) + recargo) }
}

const Lines = ({ items }: { items: CartItem[] }) => (
  <ul className="lines">
    {items.map((i) => (
      <li key={i.productId}>
        <div><b>{i.name}</b><span className="q tn">{i.quantity} × {money(i.price)}</span></div>
        <span className="amt tn">{money(i.price * i.quantity)}</span>
      </li>
    ))}
  </ul>
)

const TotalsRows = ({ totals, quoteLoading, recojo }: { totals: Totals; quoteLoading: boolean; recojo: boolean }) => (
  <dl className="tot">
    <div><dt>Subtotal</dt><dd className="tn">{money(totals.subtotal)}</dd></div>
    <div>
      <dt>Envío{recojo ? " · recojo en tienda" : ""}</dt>
      {quoteLoading
        ? <dd><i className="sk" style={{ width: 90, marginTop: 6 }} /></dd>
        : totals.envio === null
          ? <dd className="calc">Se calcula con tu dirección</dd>
          : <dd className="tn">{money(totals.envio)}</dd>}
    </div>
    {totals.recargo > 0
      ? <div><dt>Recargo por tarjeta (5 %)</dt><dd className="tn">{money(totals.recargo)}</dd></div>
      : null}
  </dl>
)

const ConfirmButton = ({ busy, className }: { busy: boolean; className?: string }) => (
  <button className={`btn btn-p ${className || ""}`} type="submit" disabled={busy} aria-busy={busy}>
    {busy ? <Loader className="ck-ic spin" aria-hidden /> : null}
    {busy ? "Creando tu pedido…" : "Confirmar pedido"}
  </button>
)

interface SummaryProps {
  items: CartItem[]
  totals: Totals
  quoteLoading: boolean
  recojo: boolean
  busy: boolean
  waUrl: string | null
  onSubmit: () => void
}

// Desktop: tarjeta fija; el form real la envuelve (submit nativo).
export const SummaryAside = ({ items, totals, quoteLoading, recojo, busy, waUrl }: SummaryProps) => (
  <aside className="card sum" aria-label="Resumen del pedido">
    <div className="sumh">
      <h2>Resumen del pedido</h2>
      <Link className="lnk" href="/catalogo">Editar carrito</Link>
    </div>
    <Lines items={items} />
    <TotalsRows totals={totals} quoteLoading={quoteLoading} recojo={recojo} />
    <div className="totrow"><span>Total</span><strong className="tn">{money(totals.total)}</strong></div>
    <p className="fine">
      {totals.envio === null ? "Total sin envío: se suma al cotizarlo con tu dirección. " : ""}
      El servidor confirma el total final al crear el pedido.
    </p>
    <ConfirmButton busy={busy} className="w100" />
    {busy ? <p className="fine" role="status" style={{ margin: "12px 0 0" }}>No cierres esta ventana. Un solo envío por pedido.</p> : null}
    {waUrl
      ? <a className="wa-l" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="ck-ic" aria-hidden />¿Dudas? Escríbenos por WhatsApp</a>
      : null}
  </aside>
)

// Movil: resumen plegado arriba + barra fija abajo con el total.
export const SummaryMobile = ({ items, totals, quoteLoading, recojo, busy, onSubmit }: SummaryProps) => (
  <>
    <details className="msum">
      <summary>
        <ShoppingCart className="ck-ic" aria-hidden />
        <span className="t">Resumen del pedido<small>{items.reduce((a, i) => a + i.quantity, 0)} productos</small></span>
        <strong>{money(totals.total)}</strong>
        <ChevronDown className="ck-ic chev" aria-hidden />
      </summary>
      <div className="body">
        <Lines items={items} />
        <TotalsRows totals={totals} quoteLoading={quoteLoading} recojo={recojo} />
      </div>
    </details>
    <div className="sbar">
      <div className="tl">
        <small>Total{totals.envio === null ? " sin envío" : ""}</small>
        <strong className="tn">{money(totals.total)}</strong>
      </div>
      <button className="btn btn-p" type="button" disabled={busy} aria-busy={busy} onClick={onSubmit}>
        {busy ? <Loader className="ck-ic spin" aria-hidden /> : null}
        {busy ? "Creando…" : "Confirmar pedido"}
      </button>
    </div>
  </>
)
