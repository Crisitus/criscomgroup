"use client"

// /iniciar-sesion (port criscom-ecom-cuenta): tarjeta plana, errores inline.
import { Suspense } from "react"
import LoginPanel from "@/components/cuenta/LoginPanel"
import "@/styles/cuenta.css"

export default function CustomerLoginPage() {
  return (
    <div className="pg-cuenta">
      <main className="wrap">
        <Suspense fallback={null}>
          <LoginPanel />
        </Suspense>
      </main>
    </div>
  )
}
