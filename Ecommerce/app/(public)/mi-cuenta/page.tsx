"use client"

// /mi-cuenta (port criscom-ecom-cuenta): pestañas Datos - Mis pedidos - Mis solicitudes.
import { Suspense } from "react"
import MiCuentaPanel from "@/components/cuenta/MiCuentaPanel"
import "@/styles/cuenta.css"

export default function MiCuentaPage() {
  return (
    <div className="pg-cuenta">
      <main className="wrap">
        <Suspense fallback={null}>
          <MiCuentaPanel />
        </Suspense>
      </main>
    </div>
  )
}
