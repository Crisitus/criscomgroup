"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useTheme } from "../lib/theme"

type ThemeProviderProps = {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Asegurarse de que el componente está montado para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  // Aplicar la clase dark al elemento html cuando el tema es oscuro
  useEffect(() => {
    // Verificar preferencia del sistema si no hay tema guardado
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    
    // Lógica de selección de tema más robusta
    const storedTheme = localStorage.getItem("erp-computacion-theme")
    
    if (!storedTheme) {
      // Si no hay tema guardado, usar preferencia del sistema
      setTheme(systemPrefersDark ? "dark" : "light")
    } else {
      // Si hay tema guardado, asegurarse de que sea válido
      const parsedTheme = JSON.parse(storedTheme)
      const validTheme = parsedTheme.state?.theme === "dark" ? "dark" : "light"
      setTheme(validTheme)
    }
    
    // Aplicar el tema actual
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.remove("dark")
      document.documentElement.classList.add("light")
    }

    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("erp-computacion-theme")) {
        setTheme(e.matches ? "dark" : "light")
      }
    }

    mediaQuery.addEventListener('change', handleMediaQueryChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [theme, setTheme])

  // Agregar evento global para cambiar tema
  useEffect(() => {
    const handleToggleThemeEvent = () => {
      setTheme(theme === "dark" ? "light" : "dark")
    }

    window.addEventListener("toggleTheme", handleToggleThemeEvent)

    return () => {
      window.removeEventListener("toggleTheme", handleToggleThemeEvent)
    }
  }, [theme, setTheme])

  if (!mounted) {
    return null
  }

  return <>{children}</>
}