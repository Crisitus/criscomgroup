import type { Metadata } from "next"
import { cache, type ReactNode } from "react"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://criscomgroup.com.pe").replace(/\/$/, "")
const API_URL = (process.env.BACKEND_INTERNAL_URL || process.env.INTERNAL_API_URL || SITE_URL).replace(/\/$/, "")

type BackendProduct = {
  id_producto: number
  nombre: string
  descripcion?: string | null
  precio: number | string
  precio_de_oferta?: number | string | null
  stock?: number | null
  condicion?: "nuevo" | "segunda_mano" | null
  imagen_url?: string | null
  categoria?: { nombre?: string | null } | null
}

const getProduct = cache(async (id: string): Promise<BackendProduct | null> => {
  if (!/^\d+$/.test(id)) return null
  try {
    const response = await fetch(`${API_URL}/api/ecommerce/productos/${id}`, { next: { revalidate: 300 } })
    if (!response.ok) return null
    return (await response.json()) as BackendProduct
  } catch {
    return null
  }
})

function absoluteImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  const cleanPath = path.replace(/^\/+/, "")
  const normalizedPath = cleanPath.startsWith("storage/") ? cleanPath : `storage/${cleanPath}`
  return `${SITE_URL}/${normalizedPath}`
}

function shortDescription(product: BackendProduct): string {
  const fallback = `Compra ${product.nombre} en CRISCOM con asesoría especializada, garantía y atención en Perú.`
  const description = product.descripcion?.replace(/\s+/g, " ").trim() || fallback
  return description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  const canonical = `/producto/${id}`
  if (!product) return { title: "Producto | CRISCOM", alternates: { canonical }, robots: { index: false, follow: true } }

  const description = shortDescription(product)
  const image = absoluteImageUrl(product.imagen_url)
  return {
    title: `${product.nombre} | CRISCOM`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "es_PE", siteName: "CRISCOM", url: `${SITE_URL}${canonical}`, title: product.nombre, description, images: image ? [{ url: image, alt: product.nombre }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: product.nombre, description, images: image ? [image] : undefined },
  }
}

export default async function ProductLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return children

  const price = Number(product.precio_de_oferta ?? product.precio)
  const productUrl = `${SITE_URL}/producto/${id}`
  const image = absoluteImageUrl(product.imagen_url)
  const availability = Number(product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.nombre,
        description: shortDescription(product),
        image: image ? [image] : undefined,
        category: product.categoria?.nombre || undefined,
        itemCondition: product.condicion === "segunda_mano" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
        offers: Number.isFinite(price) && price > 0 ? { "@type": "Offer", url: productUrl, priceCurrency: "PEN", price: price.toFixed(2), availability, seller: { "@id": `${SITE_URL}/#organization` } } : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Catálogo", item: `${SITE_URL}/catalogo` },
          { "@type": "ListItem", position: 3, name: product.nombre, item: productUrl },
        ],
      },
    ],
  }
  const safeJson = JSON.stringify(structuredData).replace(/</g, "\\u003c")
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />{children}</>
}
