// Validacion en cliente, espejo de las reglas del backend (mensajes identicos).
// Los nombres de campo coinciden con los del contrato para mapear errores 400.
import type { Errores } from "./serviciosShared"

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const vNombre = (e: Errores, campo: string, valor: string, etiqueta = "El nombre") => {
  const v = valor.trim()
  if (v.length < 3 || v.length > 120) e[campo] = `${etiqueta} debe tener entre 3 y 120 caracteres.`
}
export const vEmail = (e: Errores, campo: string, valor: string, obligatorio: boolean) => {
  const v = valor.trim()
  if (!v && !obligatorio) return
  if (!EMAIL_RE.test(v) || v.length > 160) e[campo] = "Ingresa un correo válido."
}
export const vTelefono = (e: Errores, campo: string, valor: string, obligatorio: boolean) => {
  const v = valor.trim()
  if (!v && !obligatorio) return
  if (!/^\d{7,15}$/.test(v)) e[campo] = "Ingresa un teléfono válido (7 a 15 dígitos)."
}
export const vLargo = (e: Errores, campo: string, valor: string, min: number, max: number, etiqueta: string) => {
  const v = valor.trim()
  if (v.length < min || v.length > max) e[campo] = `${etiqueta} debe tener entre ${min} y ${max} caracteres.`
}
export const vNumeroRango = (e: Errores, campo: string, valor: string, min: number, max: number, msg: string) => {
  if (!valor.trim()) return
  const n = Number(valor)
  if (!Number.isFinite(n) || n < min || n > max) e[campo] = msg
}

// Mapea los errores 400 del backend ({errores: {campo: msg}}) a los campos del form.
export const erroresDelServidor = (data: unknown): Errores => {
  const errores = (data as { errores?: Record<string, string> } | null)?.errores
  return errores && typeof errores === "object" ? { ...errores } : {}
}

export const resumenDe = (errores: Errores, etiquetas: Record<string, string>): [string, string][] =>
  Object.keys(errores).map((campo) => [campo, `${etiquetas[campo] || campo}: ${errores[campo].replace(/\.$/, "")}`])

export const tituloResumen = (n: number) =>
  n === 1 ? "Revisa 1 campo antes de enviar" : `Revisa ${n} campos antes de enviar`
