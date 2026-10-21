// Entrada fina: la pantalla vive en components/checkout/ConfirmationPage.
import type { Metadata } from "next"
import ConfirmationPage from "@/components/checkout/ConfirmationPage"

export const metadata: Metadata = {
  title: "Confirmación de pedido",
  description: "Estado y detalle de tu pedido en Criscom Group.",
}

export default function Page() {
  return <ConfirmationPage />
}
