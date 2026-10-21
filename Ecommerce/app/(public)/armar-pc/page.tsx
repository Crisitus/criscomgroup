// Entrada fina de /armar-pc (port criscom-ecom-servicios): el asistente de 3
// pasos vive en components/servicios/ArmarPcWizard.
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ArmarPcWizard from "@/components/servicios/ArmarPcWizard"

export const metadata: Metadata = {
  title: "Arma tu PC",
  description: "Pide tu cotización de ensamble: elige productos del catálogo, déjate guiar por tu presupuesto o trae tus propias piezas.",
}

export default function ArmarPcPage() {
  return (
    <div className="pg-servicios">
      <div className="cx">
        <header className="hd">
          <h1>Arma tu PC</h1>
          <Link className="btn out" href="/seguimiento">
            <span>Consultar estado</span>
            <ArrowRight size={18} className="ic" aria-hidden />
          </Link>
        </header>
        <ArmarPcWizard />
      </div>
    </div>
  )
}
