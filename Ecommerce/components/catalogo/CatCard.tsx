"use client"

// Tarjeta de producto del catalogo (tambien usada en relacionados del detalle).
// Imagen rota o ausente -> placeholder plano con el icono de la categoria (D4).
import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Ban, CircleCheck, Eye, ShoppingCart, Store } from "lucide-react"
import type { Product } from "@/services/ecommerceApi"
import { catIcon, money, pctOferta } from "@/components/home/homeShared"
import { buildImageUrl, cleanTexto, stockInfo } from "./catShared"

// Media: imagen con placeholder plano si falta o falla (sin alt roto visible).
export const CatMedia = ({ product, detail }: { product: Product; detail?: boolean }) => {
  const [rota, setRota] = useState(false)
  const src = buildImageUrl(product.imagen)
  const Icon = catIcon(product.category?.name || "")
  const sinImg = !src || rota
  return (
    <div className={`pim${sinImg ? " ph2" : ""}`}>
      {!sinImg ? (
        <img src={src} alt={cleanTexto(product.name)} loading={detail ? "eager" : "lazy"} onError={() => setRota(true)} />
      ) : (
        <Icon className="ic" aria-hidden />
      )}
      {product.precio_de_oferta != null && !detail && (
        <span className="off">−{pctOferta(String(product.price), String(product.precio_de_oferta))} %</span>
      )}
    </div>
  )
}

export const StockLabel = ({ stock }: { stock: number }) => {
  const st = stockInfo(stock)
  const Icon = st.kind === "no" ? Ban : st.kind === "lw" ? AlertTriangle : CircleCheck
  return (
    <span className={`st ${st.kind}`}>
      <Icon className="ic s16" aria-hidden />
      {st.label}
    </span>
  )
}

export const PriceRow = ({ product, big }: { product: Product; big?: boolean }) => {
  const oferta = product.precio_de_oferta != null
  const pct = oferta ? pctOferta(String(product.price), String(product.precio_de_oferta)) : 0
  return (
    <div className="prow">
      <span className={`${big ? "big" : "pr-now"} num`}>{money(oferta ? Number(product.precio_de_oferta) : Number(product.price))}</span>
      {oferta && (
        <span className="pr-old num">
          <span className="sr">Precio antes: </span>
          {money(Number(product.price))}
        </span>
      )}
      {oferta && big && pct > 0 && <span className="off">−{pct} %</span>}
    </div>
  )
}

interface CatCardProps {
  product: Product
  selected?: boolean
  onQuickView: (p: Product) => void
  onAdd: (p: Product) => void
}

const CatCard = ({ product: p, selected, onQuickView, onAdd }: CatCardProps) => {
  const agotado = p.stock <= 0
  const nombre = cleanTexto(p.name)
  const cat = p.category?.name?.trim()
  return (
    <article className={`pc${selected ? " sel" : ""}`} data-id={p.id}>
      <CatMedia product={p} />
      <div className="pb">
        <div className="chips">
          {cat && (
            <span className="chip" title={cat}>
              <span>{cat}</span>
            </span>
          )}
          {p.affiliate_business_id != null && (
            <span className="chip">
              <Store className="ic" aria-hidden />
              <span>Vendido por socio</span>
            </span>
          )}
        </div>
        <Link className="pn" href={`/producto/${p.id}`} title={nombre}>
          {nombre}
        </Link>
        <PriceRow product={p} />
        <StockLabel stock={p.stock} />
        <div className="pa">
          {agotado ? (
            <button type="button" className="btn btn-outline" disabled aria-disabled="true">
              <Ban className="ic" aria-hidden />
              Sin stock
            </button>
          ) : (
            <button type="button" className="btn btn-primary" aria-label={`Agregar ${nombre} al carrito`} onClick={() => onAdd(p)}>
              <ShoppingCart className="ic" aria-hidden />
              Agregar
            </button>
          )}
          <button type="button" className="icon-btn" aria-label={`Vista rápida de ${nombre}`} onClick={() => onQuickView(p)}>
            <Eye className="ic" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}

export default CatCard
