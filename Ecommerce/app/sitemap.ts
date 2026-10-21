import type { MetadataRoute } from "next"

export const dynamic = "force-dynamic"

const canonicalUrl = "https://criscomgroup.com.pe"

// Solo rutas vivas tras el port del home (murieron: servicios, soluciones,
// especialidades, acerca-de, contacto, social). /importaciones es la nueva ruta
// del writer de servicios; /solicitud-importacion sigue viva y enlazada desde la
// nav. El seguimiento público es /servicio-tecnico/seguimiento: /seguimiento no
// existe y /seguimiento-solicitud solo tiene página por código, sin índice.
const staticRoutes = [
  "",
  "/catalogo",
  "/armar-pc",
  "/importaciones",
  "/servicio-tecnico",
  "/servicio-tecnico/seguimiento",
  "/seguimiento",
  "/blog",
  "/libro-reclamaciones",
  "/cambios-devoluciones",
  "/terminos",
  "/privacidad",
]

type BackendProduct = { id_producto?: number; updatedAt?: string; fecha_actualizacion?: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${canonicalUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/catalogo" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/catalogo" ? 0.9 : 0.6,
  }))

  try {
    const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://criscomgroup-backend:3000").replace(/\/$/, "")
    const response = await fetch(`${backendUrl}/api/ecommerce/productos`, { cache: "no-store" })
    if (!response.ok) return entries

    const products = (await response.json()) as BackendProduct[]
    for (const product of products) {
      if (!product.id_producto) continue
      entries.push({
        url: `${canonicalUrl}/producto/${product.id_producto}`,
        lastModified: product.updatedAt || product.fecha_actualizacion || now,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }

    const blogResponse = await fetch(`${backendUrl}/api/blog/public`, { cache: "no-store" })
    if (blogResponse.ok) {
      const posts = (await blogResponse.json()) as Array<{ slug?: string; actualizado_en?: string; publicado_en?: string }>
      for (const post of posts) if (post.slug) entries.push({ url: `${canonicalUrl}/blog/${post.slug}`, lastModified: post.actualizado_en || post.publicado_en || now, changeFrequency: "monthly", priority: 0.7 })
    }
  } catch {
    // El sitemap estático sigue siendo válido si la API está temporalmente indisponible.
  }

  return entries
}
