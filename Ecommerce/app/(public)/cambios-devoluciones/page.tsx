import type { Metadata } from "next"
import CambiosPage from "@/components/contenido/CambiosPage"

export const metadata: Metadata = {
  title: "Cambios, devoluciones y garantías | Criscom Group",
  description: "Registra tu caso de cambio, devolución o garantía, conserva el código POS y consulta su avance.",
  alternates: { canonical: "/cambios-devoluciones" },
}

export default function Page() {
  return <CambiosPage />
}
