"use client"

// Galeria del detalle: imagen principal 4:3 (16:10 en movil via CSS) + miniaturas de 44px+.
// Imagen rota o ausente -> placeholder plano con el icono de la categoria (D4); nunca alt roto.
import { useMemo, useState } from "react"
import type { Product } from "@/services/ecommerceApi"
import { catIcon } from "@/components/home/homeShared"
import { buildImageUrl, cleanTexto } from "../catalogo/catShared"

const ProductoGallery = ({ product }: { product: Product }) => {
  const urls = useMemo(() => {
    const todas = [product.imagen, ...(product.images ?? []).slice().sort((a, b) => a.order - b.order).map((i) => i.image_path)]
      .map((p) => buildImageUrl(p))
      .filter(Boolean)
    return Array.from(new Set(todas))
  }, [product])
  const [idx, setIdx] = useState(0)
  const [rotas, setRotas] = useState<Record<number, boolean>>({})
  const Icon = catIcon(product.category?.name || "")
  const src = urls[idx] || ""
  const sinImg = !src || rotas[idx]
  const nombre = cleanTexto(product.name)

  return (
    <div className="gal">
      <div className={`pim${sinImg ? " ph2" : ""}`}>
        {!sinImg ? (
          <img src={src} alt={nombre} loading="eager" onError={() => setRotas((r) => ({ ...r, [idx]: true }))} />
        ) : (
          <Icon className="ic" aria-hidden />
        )}
      </div>
      {urls.length > 1 && (
        <div className="thumbs" role="group" aria-label="Imágenes del producto">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              className={`th${i === idx ? " on" : ""}`}
              aria-label={`Ver imagen ${i + 1} de ${urls.length}`}
              aria-pressed={i === idx}
              onClick={() => setIdx(i)}
            >
              {rotas[i] ? (
                <Icon className="ic s16" aria-hidden />
              ) : (
                <img src={u} alt="" loading="lazy" onError={() => setRotas((r) => ({ ...r, [i]: true }))} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductoGallery
