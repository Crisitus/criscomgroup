"use client"

import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { toast } from "react-toastify"

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Mostrar mensaje cuando se intenta acceder a una ruta protegida sin autenticación
    if (!loading && !isAuthenticated) {
      toast.error("Debes iniciar sesión para acceder a esta sección")
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [loading, isAuthenticated, router, pathname])

  // Si está cargando, mostrar un spinner
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          className="spinner"
          style={{
            width: "50px",
            height: "50px",
            border: "5px solid rgba(255, 0, 0, 0.3)",
            borderRadius: "50%",
            borderTop: "5px solid #FF0000",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <p>Verificando autenticación...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Si no está autenticado, no renderizar nada (la redirección se maneja en useEffect)
  if (!isAuthenticated) {
    return null
  }

  // Si está autenticado, mostrar el contenido protegido
  return <>{children}</>
}

export default ProtectedRoute
