// Entrada fina de /servicio-tecnico/seguimiento (port criscom-ecom-servicios):
// la consulta por token vive en components/servicios/SeguimientoOrden.
import type { Metadata } from "next"
import SeguimientoOrden from "@/components/servicios/SeguimientoOrden"

export const metadata: Metadata = {
  title: "Seguimiento de servicio",
  description: "Consulta el estado de tu orden de servicio técnico con tu token privado: avances, fechas y evidencias con fotos.",
}

export default function SeguimientoServicioPage() {
  return (
    <div className="pg-servicios">
      <div className="cx">
        <header className="hd">
          <h1>Seguimiento de servicio</h1>
        </header>
        <SeguimientoOrden />
      </div>
    </div>
  )
}
