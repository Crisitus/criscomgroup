import { redirect } from "next/navigation"

// La pagina se movio a /importaciones (port criscom-ecom-servicios).
export default function SolicitudImportacionPage() {
  redirect("/importaciones")
}
