"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import api from "../services/api"

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export const useAuth = (): AuthContextType => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      // Por ahora, asumimos que si hay token, el usuario está autenticado
      // En el futuro se puede implementar verificación de token
      setIsAuthenticated(true)
      // Intentamos recuperar información del usuario del localStorage si está disponible
      const userData = localStorage.getItem("user")
      if (userData) {
        try {
          setUser(JSON.parse(userData))
        } catch {
          setUser(null)
        }
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post<LoginResponse>("/login", {
        email,
        password,
      })

      const { token, user } = response.data

      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      setIsAuthenticated(true)
      setUser(user)

      toast.success("Inicio de sesión exitoso")
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error de inicio de sesión"
      toast.error(errorMessage)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsAuthenticated(false)
    setUser(null)
    toast.success("Sesión cerrada correctamente")
  }

  return {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
  }
}
