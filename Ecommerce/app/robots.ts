import type { MetadataRoute } from "next"

const canonicalUrl = "https://criscomgroup.com.pe"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/erp/",
        "/admin/",
        "/checkout",
        "/mi-cuenta",
        "/mis-pedidos",
        "/mis-solicitudes",
        "/iniciar-sesion",
        "/login",
        "/registro",
      ],
    },
    sitemap: `${canonicalUrl}/sitemap.xml`,
    host: canonicalUrl,
  }
}
