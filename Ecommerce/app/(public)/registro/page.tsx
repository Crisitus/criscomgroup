"use client"

// /registro (port criscom-ecom-cuenta): 3 campos como el backend.
import { Suspense } from "react"
import RegistroPanel from "@/components/cuenta/RegistroPanel"
import "@/styles/cuenta.css"

export default function RegisterPage() {
  return (
    <div className="pg-cuenta">
      <main className="wrap">
        <Suspense fallback={null}>
          <RegistroPanel />
        </Suspense>
      </main>
    </div>
  )
}
