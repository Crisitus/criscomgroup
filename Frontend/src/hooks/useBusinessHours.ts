"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { fetchBusinessHours, type BusinessHours } from "../services/companyService"

export const useBusinessHours = () => {
  const [isWithinBusinessHours, setIsWithinBusinessHours] = useState(true)
  const [businessHoursMessage, setBusinessHoursMessage] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    // La evaluacion la hace el servidor en hora de Lima (dentro_de_horario); el navegador no calcula con su reloj.
    let config: BusinessHours = { horario_inicio: '08:50', horario_fin: '21:15', horario_restriccion_activa: true, dentro_de_horario: true }
    const checkBusinessHours = () => {
      const userRole = user?.id_role || 4

      // Rol 4 (No Autorizado) - No puede acceder
      if (userRole === 4) {
        setIsWithinBusinessHours(false)
        setBusinessHoursMessage("Usuario no autorizado")
        return
      }

      // Gerentes (1), administradores (2) y auditores (5) no tienen restriccion de horario
      if (userRole === 1 || userRole === 2 || userRole === 5) {
        setIsWithinBusinessHours(true)
        setBusinessHoursMessage("Acceso permitido - Rol sin restricción de horario")
        return
      }

      // Para vendedores (rol 3), verificar horario laboral
      if (userRole === 3) {
        if (user?.tipo_vendedor !== 'fisico') {
          setIsWithinBusinessHours(true)
          setBusinessHoursMessage("Acceso sin restricción de horario físico")
          return
        }
        if (!config.horario_restriccion_activa) {
          setIsWithinBusinessHours(true)
          setBusinessHoursMessage("Restricción de horario desactivada")
          return
        }
        const isWithinHours = config.dentro_de_horario !== false
        setIsWithinBusinessHours(isWithinHours)
        setBusinessHoursMessage(
          isWithinHours ? "Dentro del horario laboral" : `Fuera del horario laboral (${config.horario_inicio} - ${config.horario_fin}, hora de Lima)`,
        )
        return
      }

      // Para otros roles no reconocidos
      setIsWithinBusinessHours(false)
      setBusinessHoursMessage("Rol no reconocido")
    }

    // Verificar al cargar el componente
    const loadAndCheck = async () => {
      if (user?.id_role === 3 && user?.tipo_vendedor === 'fisico') {
        try { config = await fetchBusinessHours() } catch { /* conserva el ultimo horario conocido */ }
      }
      checkBusinessHours()
    }
    void loadAndCheck()

    // Verificar cada minuto solo si es vendedor fisico (rol 3)
    if (user?.id_role === 3 && user?.tipo_vendedor === 'fisico') {
      const interval = setInterval(loadAndCheck, 60000)
      return () => clearInterval(interval)
    }
  }, [user?.id_role, user?.tipo_vendedor])

  return { isWithinBusinessHours, businessHoursMessage }
}
