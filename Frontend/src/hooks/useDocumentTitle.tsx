"use client"

import { useEffect } from "react"

const APP_NAME = "Criscom Group"

/**
 * Hook para manejar el título del documento
 * @param title - El título de la página actual
 * @param withAppName - Si se debe incluir el nombre de la aplicación en el título
 */
export function useDocumentTitle(title: string, withAppName = true) {
  useEffect(() => {
    const documentTitle = withAppName ? `${title} | ${APP_NAME}` : title
    document.title = documentTitle

    return () => {
      // Restaurar título original cuando el componente se desmonta
      if (withAppName) {
        document.title = `${APP_NAME} - Sistema de Gestión`
      }
    }
  }, [title, withAppName])
}

