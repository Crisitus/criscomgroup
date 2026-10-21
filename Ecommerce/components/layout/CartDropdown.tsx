"use client"

// Carrito del invitado (localStorage "catalogo_cart_items") como desplegable del navbar.
// Misma logica de siempre; visual plana del sistema morado (port criscom-ecom-home).
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ImageIcon, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { useConfigPublica } from "@/hooks/useSocialLinks"
import { buildWhatsAppUrl } from "@/services/configPublicaService"
import { money } from "@/components/home/homeShared"

interface CartItem {
  productId: number
  name: string
  price: number
  imagen?: string
  quantity: number
}

interface CartDropdownProps {
  cartCount: number
  onCartUpdate?: () => void
}

const CartDropdown = ({ cartCount, onCartUpdate }: CartDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const configPublica = useConfigPublica()

  const loadCart = useCallback(() => {
    try {
      const saved = localStorage.getItem("catalogo_cart_items")
      setCartItems(saved ? JSON.parse(saved) : [])
    } catch {
      setCartItems([])
    }
  }, [])

  useEffect(() => {
    loadCart()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "catalogo_cart_items" || e.key === null) loadCart()
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("catalogo_cart_items_updated", loadCart as EventListener)
    window.addEventListener("focus", loadCart)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("catalogo_cart_items_updated", loadCart as EventListener)
      window.removeEventListener("focus", loadCart)
    }
  }, [loadCart])

  // Cerrar con Escape y clic fuera
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [isOpen])

  const persist = (next: CartItem[]) => {
    setCartItems(next)
    localStorage.setItem("catalogo_cart_items", JSON.stringify(next))
    window.dispatchEvent(new Event("catalogo_cart_items_updated"))
    if (onCartUpdate) onCartUpdate()
  }

  const updateQuantity = (productId: number, delta: number) =>
    persist(
      cartItems
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    )

  const removeFromCart = (productId: number) => persist(cartItems.filter((item) => item.productId !== productId))

  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems])

  const whatsappUrl = (() => {
    if (cartItems.length === 0) {
      return buildWhatsAppUrl(configPublica, "Hola, quisiera recibir asesoría de Criscom Group para comprar o armar una computadora. ¿Podrían orientarme?")
    }
    const lines = cartItems.map((item) => `- ${item.name} x${item.quantity} — ${money(item.price)} c/u = ${money(item.price * item.quantity)}`)
    const header = "Hola, quisiera comprar estos productos de Criscom Group. ¿Podrían confirmar disponibilidad y garantía?\n\n"
    return buildWhatsAppUrl(configPublica, `${header}${lines.join("\n")}\nTotal: ${money(cartTotal)}`)
  })()

  const cartLabel = cartCount > 0 ? `Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : "Carrito vacío"

  return (
    <div className="pos" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={cartLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((v) => !v)}
      >
        <ShoppingCart className="pg-ic" aria-hidden />
        {cartCount > 0 && <span className="badge-n num">{cartCount}</span>}
      </button>

      {isOpen && (
        <div className="cart-panel" role="dialog" aria-label="Mi carrito">
          <div className="cart-hd">
            <h3>Mi carrito ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})</h3>
            <button type="button" className="icon-btn" aria-label="Cerrar carrito" onClick={() => setIsOpen(false)}>
              <X className="pg-ic" aria-hidden />
            </button>
          </div>

          {cartItems.length > 0 ? (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div className="cart-row" key={`cart-item-${item.productId}`}>
                    <div className="thumb">
                      {item.imagen ? (
                                      <img src={item.imagen} alt="" />
                      ) : (
                        <ImageIcon className="pg-ic" aria-hidden />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4>{item.name}</h4>
                      <p className="pr num" style={{ margin: 0 }}>{money(item.price)}</p>
                      <div className="cart-qty">
                        <button type="button" aria-label={`Quitar una unidad de ${item.name}`} onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus style={{ width: 14, height: 14 }} aria-hidden />
                        </button>
                        <span className="num">{item.quantity}</span>
                        <button type="button" aria-label={`Agregar una unidad de ${item.name}`} onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus style={{ width: 14, height: 14 }} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-del"
                      aria-label={`Quitar ${item.name} del carrito`}
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="pg-ic" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-ft">
                <div className="cart-total">
                  <span>Total:</span>
                  <b className="num">{money(cartTotal)}</b>
                </div>
                <Link className="btn btn-primary btn-block" href="/checkout" onClick={() => setIsOpen(false)}>
                  Finalizar compra
                </Link>
                {whatsappUrl && (
                  <a className="btn btn-wa btn-block" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Ordenar por WhatsApp
                  </a>
                )}
                <Link className="btn btn-outline btn-block" href="/catalogo" onClick={() => setIsOpen(false)}>
                  Seguir comprando
                </Link>
                <button type="button" className="cart-clear" onClick={() => persist([])}>
                  Vaciar carrito
                </button>
              </div>
            </>
          ) : (
            <div className="cart-empty">
              <ShoppingCart className="pg-ic" aria-hidden />
              <p style={{ margin: 0 }}>Tu carrito está vacío</p>
              <Link className="more" href="/catalogo" onClick={() => setIsOpen(false)}>
                Explorar productos →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CartDropdown
