// Entrada fina: la pantalla vive en components/checkout/CheckoutPage.
import type { Metadata } from "next"
import CheckoutPage from "@/components/checkout/CheckoutPage"

export const metadata: Metadata = {
  title: "Finalizar compra",
  description: "Confirma tu contacto, entrega y método de pago para completar tu pedido en Criscom Group.",
}

export default function Page() {
  return <CheckoutPage />
}
