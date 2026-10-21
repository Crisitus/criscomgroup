"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useBusinessHours } from "../hooks/useBusinessHours"
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: number[]
  requiresBusinessHours?: boolean
  showBusinessHoursError?: boolean
}

const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requiresBusinessHours = false,
  showBusinessHoursError = true 
}: ProtectedRouteProps) => {
  const { user } = useAuth()
  const { isWithinBusinessHours } = useBusinessHours()
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar si el usuario está autenticado
    if (!user) {
      navigate("/login")
      return
    }    // Verificar si el rol está autorizado
    if (!allowedRoles.includes(user.id_role || 4)) {
      toast.error("No tienes permisos para acceder a esta página")
      navigate("/")
      return
    }

    // Para rol 3 (vendedores), verificar horario laboral si es requerido
    if ((user.id_role || 4) === 3 && requiresBusinessHours && !isWithinBusinessHours) {
      if (showBusinessHoursError) {
        toast.error("Acceso denegado. Fuera del horario laboral permitido (8:50 AM - 9:15 PM)")
      }
      navigate("/")
      return
    }
  }, [user, allowedRoles, requiresBusinessHours, isWithinBusinessHours, navigate, showBusinessHoursError])
  // Si no está autenticado o no tiene permisos, no mostrar nada
  if (!user || !allowedRoles.includes(user.id_role || 4)) {
    return null
  }

  // Si es rol 3 y requiere horario laboral pero está fuera de horario
  if ((user.id_role || 4) === 3 && requiresBusinessHours && !isWithinBusinessHours) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
