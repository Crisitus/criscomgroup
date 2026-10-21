// Mis pedidos vive como pestaña dentro de /mi-cuenta (port criscom-ecom-cuenta).
// Original respaldado en odd/backup/ecommerce/cuenta/mis-pedidos-page.tsx.
import { redirect } from "next/navigation"

export default function MisPedidosPage() {
  redirect("/mi-cuenta?tab=pedidos")
}
