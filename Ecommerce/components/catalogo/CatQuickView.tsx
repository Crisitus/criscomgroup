"use client"

// Quick-view: panel lateral plano (hoja inferior en movil), SIN backdrop-blur (D6).
// Escape y X de 44px cierran; el grid no se mueve. Se monta en portal (fixed real).
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { ArrowRight, Ban, MessageCircle, Minus, Plus, ShoppingCart, Store, X } from "lucide-react"
import type { Product } from "@/services/ecommerceApi"
import { addToCartHome, waHref } from "@/components/home/homeShared"
import { addToCartQty, cleanTexto, descVisible, precioEfectivo } from "./catShared"
import { CatMedia, PriceRow, StockLabel } from "./CatCard"

interface QuickViewProps {
  product: Product
  whatsapp: string | null // numero crudo de config_publica (null = ocultar CTA)
  onClose: () => void
}

const CatQuickView = ({ product: p, whatsapp, onClose }: QuickViewProps) => {
  const agotado = p.stock <= 0
  const [qty, setQty] = useState(1)
  const closeRef = useRef<HTMLButtonElement>(null)
  const nombre = cleanTexto(p.name)
  const cat = p.category?.name?.trim()
  const desc = descVisible(p.description)
  const waUrl = waHref(whatsapp)
  const waMsg = waUrl ? `${waUrl}?text=${encodeURIComponent(`Hola, me interesa: ${nombre}`)}` : null
  const whyId = `why-qv-${p.id}`

  useEffect(() => {
    setQty(1)
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [p.id, onClose])

  const agregar = () => {
    const item = {
      productId: p.id,
      name: nombre,
      price: precioEfectivo(p),
      imagen: p.imagen || undefined,
      affiliate_business_id: p.affiliate_business_id ?? null,
    }
    if (qty <= 1) addToCartHome(item)
    else addToCartQty(item, qty, p.stock)
  }

  return createPortal(
    <div className="pg-catalogo">
      <div className="scrim only-m" onClick={onClose} aria-hidden="true" />
      <aside className="qv" role="dialog" aria-modal="false" aria-label={`Vista rápida: ${nombre}`}>
        <div className="qv-hd">
          <span>Vista rápida</span>
          <button type="button" className="icon-btn" aria-label="Cerrar vista rápida" onClick={onClose} ref={closeRef}>
            <X className="ic" aria-hidden />
          </button>
        </div>
        <div className="qv-bd">
          <CatMedia product={p} />
          <div className="chips">
            {cat && (
              <span className="chip">
                <span>{cat}</span>
              </span>
            )}
            <span className={`chip${p.condicion === "segunda_mano" ? " pr" : ""}`}>
              {p.condicion === "segunda_mano" ? "Segunda mano" : "Nuevo"}
            </span>
            {p.affiliate_business_id != null && (
              <span className="chip">
                <Store className="ic" aria-hidden />
                <span>Vendido por socio</span>
              </span>
            )}
          </div>
          <h2>{nombre}</h2>
          <PriceRow product={p} />
          <StockLabel stock={p.stock} />
          {desc && <p className="ds">{desc}</p>}
          <div className="buy">
            <div className="qty" role="group" aria-label="Cantidad">
              <button type="button" disabled={agotado || qty <= 1} aria-label="Quitar una unidad" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                <Minus className="ic" aria-hidden />
              </button>
              <output className="num" aria-live="polite">
                {agotado ? 0 : qty}
              </output>
              <button type="button" disabled={agotado || qty >= p.stock} aria-label="Agregar una unidad" onClick={() => setQty((v) => Math.min(p.stock, v + 1))}>
                <Plus className="ic" aria-hidden />
              </button>
            </div>
            {agotado ? (
              <button type="button" className="btn btn-outline" disabled aria-disabled="true" aria-describedby={whyId}>
                <ShoppingCart className="ic" aria-hidden />
                Agregar al carrito
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={agregar}>
                <ShoppingCart className="ic" aria-hidden />
                Agregar al carrito
              </button>
            )}
          </div>
          {agotado && (
            <p className="why" id={whyId}>
              <Ban className="ic s16" aria-hidden />
              Sin stock: no se puede agregar al carrito.
            </p>
          )}
        </div>
        <div className="qv-ft">
          <Link className="btn btn-outline btn-block" href={`/producto/${p.id}`} onClick={onClose}>
            Ver detalle <ArrowRight className="ic s16" aria-hidden />
          </Link>
          {waMsg && (
            <a className="btn btn-wa btn-block" href={waMsg} target="_blank" rel="noopener noreferrer" aria-label="Preguntar por WhatsApp">
              <MessageCircle className="ic" aria-hidden />
              Preguntar por WhatsApp
            </a>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}

export default CatQuickView
