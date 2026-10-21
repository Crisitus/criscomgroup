import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type Theme = "light" | "dark"

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light", // Valor por defecto
      setTheme: (theme: Theme) => {
        set({ theme })
        // Aplicar el tema inmediatamente
        if (typeof window !== "undefined") {
          updateDOMTheme(theme)
          // Emitir evento personalizado para otros componentes
          window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }))
        }
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light"
          // Aplicar el tema inmediatamente
          if (typeof window !== "undefined") {
            updateDOMTheme(newTheme)
            // Emitir evento personalizado para otros componentes
            window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: newTheme } }))
          }
          return { theme: newTheme }
        }),
    }),
    {
      name: "erp-computacion-theme",
      storage: createJSONStorage(() => localStorage),
      // Migración de versiones anteriores de almacenamiento
      migrate: (persistedState: any, version) => {
        // Migrar datos de versiones anteriores si es necesario
        if (version === 0) {
          // Ejemplo de migración
          return {
            state: {
              theme: persistedState?.theme || "light",
            },
            version: 1,
          }
        }
        return persistedState
      },
      version: 1,
    },
  ),
)

// Asegurar que el tema se aplique correctamente al DOM
// Modificar la función updateDOMTheme para que sea más agresiva

function updateDOMTheme(theme: Theme) {
  const htmlElement = document.documentElement

  if (theme === "dark") {
    htmlElement.classList.add("dark")
    htmlElement.classList.remove("light")
    htmlElement.style.colorScheme = "dark"
    document.body.classList.add("dark")
    document.body.classList.remove("light")
  } else {
    htmlElement.classList.remove("dark")
    htmlElement.classList.add("light")
    htmlElement.style.colorScheme = "light"
    document.body.classList.add("light")
    document.body.classList.remove("dark")
  }

  // Forzar la actualización de los estilos
  setTimeout(() => {
    document.body.style.transition = "none"
    document.body.style.backgroundColor = theme === "dark" ? "#020817" : "#ffffff"
    setTimeout(() => {
      document.body.style.transition = ""
    }, 10)
  }, 0)
}

// Función para obtener el tema preferido del sistema
export function getSystemTheme(): Theme {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return "light"
}

// Función de utilidad para inicializar el tema
export function initializeTheme() {
  if (typeof window !== "undefined") {
    const storedTheme = localStorage.getItem("erp-computacion-theme")

    if (!storedTheme) {
      // Si no hay tema almacenado, usar preferencia del sistema
      const systemTheme = getSystemTheme()
      useTheme.getState().setTheme(systemTheme)
    }
  }
}

