import { useState } from "react"
import { createUser, type User, type UserFormData } from "../../../services/userService"
import { emailOk, inDays, isFutureLima, pwValid } from "./usrCommon"
import { useUsrActions } from "./useUsrActions"

export interface FormState {
  name: string; email: string; password: string; role: 2 | 3 | 4 | 5 | 6
  tipo: "fisico" | "virtual" | "afiliado"; nombre_comercial: string; expira: string; telefono: string
}
const INICIAL: FormState = { name: "", email: "", password: "", role: 3, tipo: "fisico", nombre_comercial: "", expira: "", telefono: "" }

export const CAMPOS: Record<string, string> = {
  name: "Nombre", email: "Correo", password: "Contraseña", nombre_comercial: "Nombre comercial", acceso_expira_en: "Vencimiento",
  telefono: "Celular", id_role: "Rol", tipo_vendedor: "Tipo de vendedor", comision_servicio_porcentaje: "Comisión",
}
export const FOCO: Record<string, string> = { name: "f-name", email: "f-email", password: "f-pw", nombre_comercial: "f-nc", telefono: "f-tel" }

/** Alta de una cuenta en una sola llamada transaccional (POST /users). */
export function useUsrForm(onCreated: (u: User) => void) {
  const [f, setF] = useState<FormState>(INICIAL)
  const [local, setLocal] = useState<Record<string, string>>({})
  const act = useUsrActions()
  const set = (c: Partial<FormState>) => { setF(p => ({ ...p, ...c })); setLocal(p => { const n = { ...p }; Object.keys(c).forEach(k => { delete n[k]; delete n[k === "role" ? "id_role" : k] }); return n }) }
  const errs = { ...act.errs, ...local }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3 || f.name.trim().length > 120) e.name = "El nombre debe tener entre 3 y 120 caracteres"
    if (!emailOk(f.email)) e.email = "Ingresa un correo válido"
    if (!pwValid(f.password)) e.password = "La contraseña debe incluir mayúscula, número y símbolo, de 8 a 72 caracteres"
    if (f.role === 3 && f.tipo === "afiliado" && !f.nombre_comercial.trim()) e.nombre_comercial = "Ingresa el nombre comercial del negocio"
    if (f.role === 5 && !isFutureLima(f.expira || inDays(7))) e.acceso_expira_en = "La caducidad debe ser una fecha futura"
    if (f.role === 6 && !/^9\d{8}$/.test(f.telefono)) e.telefono = "Ingresa un celular válido de 9 dígitos para el técnico"
    return e
  }

  const submit = async () => {
    const e = validate()
    setLocal(e)
    if (Object.keys(e).length) return
    const data: UserFormData = { name: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password, id_role: f.role }
    if (f.role === 3) { data.tipo_vendedor = f.tipo; if (f.tipo === "afiliado") data.nombre_comercial = f.nombre_comercial.trim() }
    if (f.role === 5) data.acceso_expira_en = f.expira || inDays(7)
    if (f.role === 6) data.telefono = f.telefono
    const r = await act.run("crear", () => createUser(data))
    if (r.ok) { setF(INICIAL); onCreated(r.data) }
  }
  const reset = () => { setF(INICIAL); setLocal({}); act.clear() }
  const dirty = JSON.stringify(f) !== JSON.stringify(INICIAL)
  return { f, set, errs, submit, reset, dirty, act }
}
