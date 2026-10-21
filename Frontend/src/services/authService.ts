import api from "../lib/api"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export const login = async (credentials: LoginCredentials) => {
  const response = await api.post(`/auth/login`, credentials)
  return response.data
}

export const register = async (data: RegisterData) => {
  const response = await api.post(`/auth/register`, data)
  return response.data
}

