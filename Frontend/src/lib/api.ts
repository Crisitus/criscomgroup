import axios from "axios"
import { API_URL } from "../config/api"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para añadir el token a las peticiones
api.interceptors.request.use(
  (config) => {
    // Obtener el token directamente de localStorage
    const token = localStorage.getItem("token")

    if (token) {
      // Asegurarse de que el formato del token sea correcto
      config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Añadir una declaración global para la bandera de redirección
declare global {
  interface Window {
    isRedirecting?: boolean
    isRefreshing?: boolean
    refreshPromise?: Promise<boolean>
    failedQueue: any[]
    processQueue: (error: any, token: string | null) => void
  }
}

// Definir una interfaz para nuestro error personalizado
interface CustomError extends Error {
  response?: {
    status: number;
    data: any;
  };
}

// Inicializar la cola de solicitudes fallidas
window.failedQueue = []
window.processQueue = (error, token = null) => {
  window.failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  window.failedQueue = []
}

// Interceptor para manejar errores de autenticación y otros errores comunes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si el error es 401 y no estamos ya en la página de login
    if (error.response && error.response.status === 401 && !window.location.pathname.includes("/login")) {
      // Si la solicitud no ha sido ya reintentada
      if (!originalRequest._retry) {
        // Si ya estamos refrescando el token, añadir esta solicitud a la cola
        if (window.isRefreshing) {
          try {
            // Esperar a que termine el proceso de refresco actual
            const token = await new Promise((resolve, reject) => {
              window.failedQueue.push({ resolve, reject })
            })

            // Actualizar el token en la solicitud original y reintentarla
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return api(originalRequest)
            }
          } catch (err) {
            return Promise.reject(err)
          }
        }

        // Marcar la solicitud como reintentada
        originalRequest._retry = true
        window.isRefreshing = true

        try {
          // Limpiar el token y el estado de autenticación
          localStorage.removeItem("token")
          localStorage.removeItem("user")

          // Marcar que la sesión ha expirado
          localStorage.setItem("session_expired", "true")

          // Evitar múltiples redirecciones estableciendo una bandera
          if (!window.isRedirecting) {
            window.isRedirecting = true

            // Redirigir a la página de login
            window.location.href = "/login"
          }

          window.isRefreshing = false
        } catch (refreshError) {
          // Si hay un error en el refresco, procesar la cola con error
          window.processQueue(refreshError, null)

          // Limpiar el token y el estado de autenticación
          localStorage.removeItem("token")
          localStorage.removeItem("user")

          // Marcar que la sesión ha expirado
          localStorage.setItem("session_expired", "true")

          // Evitar múltiples redirecciones estableciendo una bandera
          if (!window.isRedirecting) {
            window.isRedirecting = true

            // Redirigir a la página de login
            window.location.href = "/login"
          }
        }
      }
    }

    // Manejar errores específicos para mejorar la experiencia del usuario
    if (error.response) {
      // Manejar error 404 (Not Found)
      if (error.response.status === 404) {
        // Si es un error de producto no encontrado con ID NaN, mostrar un mensaje más amigable
        if (error.config.url.includes("/productos/NaN")) {
          console.error("Error: Intentando acceder a un producto con ID no válido")
          error.message = "ID de producto no válido"
        }
      }

      // Manejar error 403 (Forbidden) - Restricciones de horario
      if (error.response.status === 403) {
        if (error.response.data && error.response.data.message && error.response.data.message.includes("horario")) {
          error.message = "No puedes acceder fuera del horario laboral permitido"
        }
      }
    }

    return Promise.reject(error)
  },
)

// Interceptor para manejar errores y evitar que se muestren en la consola
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si es un error 403 (Forbidden), lo manejamos silenciosamente
    if (error.response && error.response.status === 403) {
      // Crear un objeto de error personalizado con nuestro tipo extendido
      const customError = new Error(error.response.data?.message || "Acceso denegado") as CustomError
      customError.name = "ForbiddenError"

      // Añadir la información de respuesta que necesitamos
      customError.response = {
        status: 403,
        data: error.response.data,
      }

      // Prevenir que se muestre en la consola
      customError.stack = ""

      return Promise.reject(customError)
    }

    // Para otros errores, los manejamos normalmente
    return Promise.reject(error)
  },
)

export default api