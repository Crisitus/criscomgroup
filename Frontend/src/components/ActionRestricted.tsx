"use client"

import { useAuth } from "../contexts/AuthContext"
import { useBusinessHours } from "../hooks/useBusinessHours"

interface ActionRestrictedProps {
  children: React.ReactNode
  allowedRoles?: number[]
  requiresBusinessHours?: boolean
  fallback?: React.ReactNode
}

const ActionRestricted = ({ 
  children, 
  allowedRoles = [1, 2, 3], 
  requiresBusinessHours = false,
  fallback = null 
}: ActionRestrictedProps) => {
  const { user } = useAuth()
  const { isWithinBusinessHours } = useBusinessHours()
  
  const userRole = user?.id_role || 4
  
  // Verificar si el usuario tiene permisos para realizar la acción
  const hasPermission = allowedRoles.includes(userRole)
  
  if (!hasPermission) {
    return fallback
  }
  
  // Para rol 3 (vendedores), verificar horario laboral si es requerido
  if (userRole === 3 && requiresBusinessHours && !isWithinBusinessHours) {
    return fallback
  }
  
  return <>{children}</>
}

export default ActionRestricted
