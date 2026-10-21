import { lazy, Suspense } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

const PurchasesPage = lazy(() => import("./purchases/PurchasesPage"))
const QuotesPage = lazy(() => import("./quotes/QuotesPage"))

export default function CommercialControlPage() {
  const [params] = useSearchParams()
  const tab = params.get("tab") || "inventory"
  if (tab === "inventory") return <Navigate to="/products" replace />
  return (
    <Suspense fallback={null}>
      {tab === "quotes" ? <QuotesPage /> : <PurchasesPage />}
    </Suspense>
  )
}
