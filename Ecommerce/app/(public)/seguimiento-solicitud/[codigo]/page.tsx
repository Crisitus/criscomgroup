// Redirige a /seguimiento conservando el código (port criscom-ecom-cuenta).
// Original respaldado en odd/backup/ecommerce/cuenta/seguimiento-solicitud-codigo-page.tsx.
import { redirect } from "next/navigation"

export default async function SeguimientoSolicitudCodigoPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  redirect(`/seguimiento?codigo=${encodeURIComponent(codigo)}`)
}
