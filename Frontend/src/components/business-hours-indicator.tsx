"use client"

import { useEffect, useRef, useState } from "react"
import { useBusinessHours } from "../hooks/useBusinessHours"
import { AlertCircle } from "lucide-react"
import { cn } from "../lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

export function BusinessHoursIndicator() {
  const { isWithinBusinessHours, businessHoursMessage } = useBusinessHours()
  const [time, setTime] = useState(new Date())
  const internetOffset = useRef(0)
  const [isInternetTime, setIsInternetTime] = useState(false)

  // Sincronizar con una fuente horaria de Internet y mantener el reloj avanzando
  // localmente entre sincronizaciones para no hacer una petición cada segundo.
  useEffect(() => {
    let mounted = true

    const syncInternetTime = async () => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      try {
        const response = await fetch("https://worldtimeapi.org/api/timezone/America/Lima", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("No se pudo consultar la hora")
        const payload = await response.json()
        const internetTime = new Date(payload.datetime).getTime()
        if (!Number.isFinite(internetTime)) throw new Error("Hora de Internet inválida")
        if (mounted) {
          internetOffset.current = internetTime - Date.now()
          setIsInternetTime(true)
        }
      } catch {
        if (mounted) setIsInternetTime(false)
      } finally {
        window.clearTimeout(timeout)
      }
    }

    syncInternetTime()
    const syncTimer = window.setInterval(syncInternetTime, 10 * 60 * 1000)
    const clockTimer = window.setInterval(() => {
      setTime(new Date(Date.now() + internetOffset.current))
    }, 1000)

    return () => {
      mounted = false
      window.clearInterval(syncTimer)
      window.clearInterval(clockTimer)
    }
  }, [])

  // Si el usuario es administrador, no mostrar el indicador
  if (businessHoursMessage === "Acceso completo") {
    return null
  }

  const formattedTime = time.toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="status"
            tabIndex={0}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isWithinBusinessHours
                ? "bg-[hsl(142_76%_36%/0.12)] text-success-text"
                : "bg-[hsl(var(--destructive)/0.1)] text-destructive-text"
            )}
          >
            {isWithinBusinessHours ? (
              <i aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            ) : (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{formattedTime}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-sm">
          <p className="font-medium">{isInternetTime ? "Hora sincronizada por Internet" : "Hora del dispositivo (sin conexión)"}</p>
          <p>{businessHoursMessage}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isWithinBusinessHours
              ? "Tienes acceso completo a todas las funciones"
              : "Algunas acciones están restringidas fuera del horario laboral"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
