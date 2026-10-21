// Entrada fina: la vista vive en components/checkout/PaymentSuccessView.
// useSearchParams requiere Suspense boundary para el prerender (Next 16).
import type { Metadata } from "next"
import { Suspense } from "react"
import PaymentSuccessView from "@/components/checkout/PaymentSuccessView"

export const metadata: Metadata = {
  title: "Pago exitoso",
  description: "Tu pago fue procesado correctamente en Criscom Group.",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessView />
    </Suspense>
  )
}
