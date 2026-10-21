// Entrada fina: la vista vive en components/checkout/PaymentErrorView.
// useSearchParams requiere Suspense boundary para el prerender (Next 16).
import type { Metadata } from "next"
import { Suspense } from "react"
import PaymentErrorView from "@/components/checkout/PaymentErrorView"

export const metadata: Metadata = {
  title: "Error en el pago",
  description: "No se pudo completar el pago de tu pedido en Criscom Group.",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentErrorView />
    </Suspense>
  )
}
