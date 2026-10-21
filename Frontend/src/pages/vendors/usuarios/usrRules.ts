import type { User } from "../../../services/userService"

export interface Actor { maestra: boolean; id: number }
export interface Rule { ok: boolean; why: string }
const YES: Rule = { ok: true, why: "" }
const no = (why: string): Rule => ({ ok: false, why })

export const MASTER_ONLY = "Esta función está disponible únicamente para la cuenta maestra."
export const PROT = "La cuenta maestra está protegida. Se edita en Cuenta maestra."
export const SELF = "No puedes aplicar este cambio sobre tu propia cuenta."
export const ADM = "Un superusuario temporal no puede modificar cuentas de Administrador."
export const ADMIN_ROLE = "Solo un gerente puede crear o asignar el rol de Administrador."

export const isProtected = (u: User) => !!u.es_maestra || u.id_role === 1

/** Reglas de actor sobre la cuenta seleccionada: el servidor las vuelve a aplicar, aquí se ven antes del clic. */
export function rulesFor(u: User, a: Actor) {
  const prot = isProtected(u)
  const self = u.id_user === a.id
  const edit = prot ? no(PROT) : self && !a.maestra ? no(SELF) : !a.maestra && u.id_role === 2 ? no(ADM) : YES
  const lifecycle = !a.maestra ? no(MASTER_ONLY) : prot ? no(PROT) : self ? no(SELF) : YES
  const elevate = !a.maestra ? no(MASTER_ONLY) : u.id_role !== 2 ? no("Solo un Administrador puede recibir superusuario temporal.") : u.activo === false ? no("La cuenta está desactivada.") : YES
  const toAdmin = !edit.ok ? edit : !a.maestra ? no(ADMIN_ROLE) : u.id_role === 2 ? no("Ya es Administrador.") : YES
  const toClient = !edit.ok ? edit : u.id_role === 4 ? no("Ya es Cliente.") : YES
  const resolve = a.maestra ? YES : no(`${MASTER_ONLY} Puedes ver la bandeja, no resolverla.`)
  return { prot, self, edit, lifecycle, elevate, toAdmin, toClient, resolve }
}

export const canCreateAdmin = (a: Actor): Rule => (a.maestra ? YES : no(ADMIN_ROLE))
export const canResolve = (a: Actor): Rule => (a.maestra ? YES : no(`${MASTER_ONLY} Puedes ver la bandeja, no resolverla.`))
export const canLiquidate = (a: Actor): Rule => (a.maestra ? YES : no(MASTER_ONLY))
