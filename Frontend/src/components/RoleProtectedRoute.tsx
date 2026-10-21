import type React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useBusinessHours } from "../hooks/useBusinessHours"
import { toast } from "sonner"
import { useEffect } from "react"

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: number[]
  requiresBusinessHours?: boolean
  redirectTo?: string
  allowTemporarySuperuser?: boolean
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  requiresBusinessHours = false,
  redirectTo = "/",
  allowTemporarySuperuser = false,
}) => {
  const { user } = useAuth()
  const location = useLocation()
  const { isWithinBusinessHours } = useBusinessHours()
  
  // Obtener el rol del usuario (por defecto, asumimos No Autorizado - 4)
  const userRole = user?.id_role || 4
  
  // Verificar si el usuario tiene permisos para acceder a esta ruta
  const elevated = Boolean(user?.id_role === 2 && user.superusuario_temporal && user.superusuario_expira_en && new Date(user.superusuario_expira_en) > new Date())
  const commercialTab = new URLSearchParams(location.search).get('tab')
  const companyTab = new URLSearchParams(location.search).get('tab')
  const inferredArea = (location.pathname === '/services' || location.pathname.startsWith('/services/')) ? 'servicio_tecnico'
    : location.pathname === '/commercial-control' ? (commercialTab === 'purchases' ? 'compras' : commercialTab === 'quotes' ? 'cotizaciones' : 'inventario')
    : location.pathname === '/acquisitions' ? 'compras'
    : ['/social-links', '/offers', '/blog'].includes(location.pathname) ? 'marketing'
    : location.pathname === '/audit-logs' ? 'auditoria'
    : location.pathname === '/company' ? (companyTab === 'payments' ? 'pagos_pos' : 'empresa_sunat')
    : location.pathname === '/payments' ? 'pagos_pos'
    : location.pathname.startsWith('/sales') ? 'ventas'
    : (location.pathname.startsWith('/products') || location.pathname.startsWith('/categories')) ? 'inventario'
    : null
  const hasPermission = allowedRoles.includes(userRole) || (allowTemporarySuperuser && elevated) || Boolean(inferredArea && user?.area_grants?.includes(inferredArea))
  
  // Para rol 3 (vendedores), verificar horario laboral si es requerido
  const needsBusinessHoursCheck = userRole === 3 && requiresBusinessHours
  const canAccessDueToBusinessHours = !needsBusinessHoursCheck || isWithinBusinessHours

  // Mostrar mensaje de error si está fuera del horario laboral
  useEffect(() => {
    if (hasPermission && needsBusinessHoursCheck && !isWithinBusinessHours) {
      toast.error("Acceso denegado. Fuera del horario laboral permitido (8:50 AM - 9:15 PM)")
    }
  }, [hasPermission, needsBusinessHoursCheck, isWithinBusinessHours])
  
  if (!hasPermission) {
    // Redirigir al dashboard si no tiene permisos
    return <Navigate to={redirectTo} replace />
  }

  if (!canAccessDueToBusinessHours) {
    // Redirigir al dashboard si está fuera del horario laboral
    return <Navigate to={redirectTo} replace />
  }
  
  return <>{children}</>
}

export default RoleProtectedRoute
