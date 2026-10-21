"use client"

// /seguimiento (port criscom-ecom-cuenta): página unificada de seguimiento.
// Fusiona /seguimiento-solicitud y /mis-solicitudes (quedan como redirects).
import { Suspense } from "react"
import SeguimientoPanel from "@/components/cuenta/SeguimientoPanel"
import "@/styles/cuenta.css"

export default function SeguimientoPage() {
  return (
    <div className="pg-cuenta">
      <main className="wrap">
        <Suspense fallback={null}>
          <SeguimientoPanel />
        </Suspense>
      </main>
    </div>
  )
}
