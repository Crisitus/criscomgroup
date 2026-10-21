"use client"

import { useAuth } from "../contexts/AuthContext"
import { useBusinessHours } from "./useBusinessHours"

export const useActionPermissions = () => {
  const { user } = useAuth()
  const { isWithinBusinessHours } = useBusinessHours()
  
  const userRole = user?.id_role || 4

  // Función para verificar si puede realizar acciones de escritura (crear, editar, eliminar)
  const canWrite = (allowedRoles: number[] = [1, 2, 3]) => {
    // Verificar si el rol está permitido
    if (!allowedRoles.includes(userRole)) {
      return false
    }

    // Los gerentes (rol 1) y administradores (rol 2) pueden escribir siempre
    if (userRole === 1 || userRole === 2) {
      return true
    }

    // Los vendedores (rol 3) solo pueden escribir dentro del horario laboral
    if (userRole === 3) {
      return isWithinBusinessHours
    }

    // Rol 4 (No Autorizado) no puede escribir
    return false
  }

  // Función para verificar si puede leer (ver)
  const canRead = (allowedRoles: number[] = [1, 2, 3]) => {
    return allowedRoles.includes(userRole)
  }

  // Función para verificar si puede acceder a la página completa
  const canAccess = (allowedRoles: number[] = [1, 2, 3]) => {
    return allowedRoles.includes(userRole)
  }

  // Función para verificar si puede crear ventas
  const canCreateSale = () => {
    return canWrite([1, 2, 3])
  }

  return {
    userRole,
    isWithinBusinessHours,
    canWrite,
    canRead,
    canAccess,
    canCreateSale,
  }
}
