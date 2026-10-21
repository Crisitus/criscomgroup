// Entrada fina de /importaciones (port criscom-ecom-servicios): la pantalla vive
// en components/servicios/ImportacionesForm. Reemplaza a /solicitud-importacion.
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ImportacionesForm from "@/components/servicios/ImportacionesForm"

export const metadata: Metadata = {
  title: "Importaciones",
  description: "Pide ese producto que no está en el catálogo y Criscom lo trae del extranjero. Cotización en dólares con código de seguimiento.",
}

export default function ImportacionesPage() {
  return (
    <div className="pg-servicios">
      <div className="cx">
        <header className="hd">
          <h1>Importaciones</h1>
          <Link className="btn out" href="/seguimiento">
            <span>Consultar estado</span>
            <ArrowRight size={18} className="ic" aria-hidden />
          </Link>
        </header>
        <ImportacionesForm />
      </div>
    </div>
  )
}
