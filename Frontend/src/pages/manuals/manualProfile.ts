import { Building2, Search, Settings, ShieldCheck, ShoppingCart, Wrench, type LucideIcon } from "lucide-react"

export type ProfileKey = "master" | "admin" | "auditor" | "seller" | "affiliate" | "technician"

export interface ManualUser {
  es_maestra?: boolean
  id_role?: number | null
  tipo_vendedor?: string | null
}

/** Regla corregida: la maestra se decide con es_maestra (nunca un correo); luego rol y tipo de vendedor. */
export function pickProfile(user: ManualUser | null | undefined): ProfileKey {
  if (user?.es_maestra) return "master"
  if (user?.id_role === 2) return "admin"
  if (user?.id_role === 5) return "auditor"
  if (user?.id_role === 6) return "technician"
  if (user?.tipo_vendedor === "afiliado") return "affiliate"
  return "seller"
}

export const PROFILE_ICONS: Record<ProfileKey, LucideIcon> = {
  master: ShieldCheck, admin: Settings, auditor: Search, seller: ShoppingCart, affiliate: Building2, technician: Wrench,
}

/** Guía común cuyo primer paso enlaza de verdad a Solicitudes de acceso. */
export const ACCESS_GUIDE_TITLE = "Solicitar acceso a otra área"
export const ACCESS_PATH = "/access-center"
