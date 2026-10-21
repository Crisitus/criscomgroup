// Entrada fina de /catalogo (port criscom-ecom-catalogo): la pantalla vive en
// components/catalogo/CatalogoClient.tsx. Suspense por useSearchParams (?categoria, ?ofertas).
import type { Metadata } from "next"
import { Suspense } from "react"
import CatalogoClient from "@/components/catalogo/CatalogoClient"

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Laptops, componentes, accesorios, monitores y más. Filtra por categoría, precio y ofertas vigentes en Criscom Group.",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CatalogoClient />
    </Suspense>
  )
}
