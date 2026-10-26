import type { Company } from "../../../services/companyService"
import { rucCheck, rucDv } from "./empFormat"

/** Borrador editable de la empresa. Los secretos nunca se precargan: vacio = conservar. */
export interface EmpDraft {
  razon_social: string
  ruc: string
  direccion: string
  client_id: string
  sol_user: string
  sol_pass: string
  client_secret: string
  logo: File | null
  cert: File | null
  rucDemo: boolean
}

export type EmpField = "razon_social" | "ruc" | "direccion" | "client_id" | "sol_user" | "sol_pass" | "client_secret" | "logo" | "cert"
export type EmpSec = "ident" | "logo" | "ficha" | "sol" | "cert" | "api" | "modo"
export type EmpFlag = "err" | "chg"

export const EMPTY_DRAFT: EmpDraft = {
  razon_social: "", ruc: "", direccion: "", client_id: "", sol_user: "", sol_pass: "", client_secret: "", logo: null, cert: null, rucDemo: false,
}

export const draftFrom = (c: Company | null): EmpDraft => c
  ? { ...EMPTY_DRAFT, razon_social: c.razon_social, ruc: c.ruc, direccion: c.direccion, client_id: c.client_id ?? "" }
  : EMPTY_DRAFT

export const FIELD_SEC: Record<EmpField, EmpSec> = {
  razon_social: "ident", ruc: "ident", direccion: "ident", logo: "logo", sol_user: "sol", sol_pass: "sol", cert: "cert", client_id: "api", client_secret: "api",
}
const NAMES: Record<EmpField, string> = {
  razon_social: "Razón social", ruc: "RUC", direccion: "Dirección", client_id: "Client ID", sol_user: "Usuario SOL", sol_pass: "Clave SOL",
  client_secret: "Client secret", logo: "Logo", cert: "Certificado",
}
export const fieldName = (f: EmpField) => NAMES[f]

/** Campos con cambios respecto a lo guardado (en el orden de la pantalla). */
export function changedFields(d: EmpDraft, base: Company | null): EmpField[] {
  const b = draftFrom(base)
  const out: EmpField[] = []
  if (d.razon_social !== b.razon_social) out.push("razon_social")
  if (d.ruc !== b.ruc) out.push("ruc")
  if (d.direccion !== b.direccion) out.push("direccion")
  if (d.logo) out.push("logo")
  if (d.sol_user) out.push("sol_user")
  if (d.sol_pass) out.push("sol_pass")
  if (d.cert) out.push("cert")
  if (d.client_id !== b.client_id) out.push("client_id")
  if (d.client_secret) out.push("client_secret")
  return out
}

export type EmpErrors = Partial<Record<EmpField, string>>

/** RUC cambiado (o alta) cuyo digito verificador falla: error bloqueante salvo la casilla de demostracion. */
export function rucNeedsDemo(d: EmpDraft, base: Company | null): boolean {
  return rucCheck(d.ruc) === "dv" && (!base || d.ruc !== base.ruc)
}

/** Validacion de cliente; `all` incluye obligatorios (tras intentar guardar). */
export function validate(d: EmpDraft, base: Company | null, all: boolean): EmpErrors {
  const e: EmpErrors = {}
  if (all && !d.razon_social.trim()) e.razon_social = "La razón social es obligatoria."
  else if (d.razon_social.length > 100) e.razon_social = "La razón social supera los 100 caracteres."
  if (all && !d.direccion.trim()) e.direccion = "La dirección es obligatoria."
  else if (d.direccion.length > 255) e.direccion = "La dirección supera los 255 caracteres."
  const rc = rucCheck(d.ruc)
  if (all && rc === "vacio") e.ruc = "El RUC es obligatorio."
  else if (rc === "formato") { if (all || d.ruc.length >= 11) e.ruc = "El RUC debe tener 11 dígitos y empezar por 10 o 20." }
  else if (rucNeedsDemo(d, base) && !d.rucDemo) e.ruc = `El dígito verificador no es válido: se esperaba ${rucDv(d.ruc)} y el RUC termina en ${d.ruc[10]}.`
  if (all && !base) {
    if (!d.sol_user) e.sol_user = "El usuario SOL es obligatorio."
    if (!d.sol_pass) e.sol_pass = "La clave SOL es obligatoria."
    if (!d.cert) e.cert = "El certificado digital es obligatorio para registrar la empresa."
  }
  return e
}

/** Cuerpo multipart: los secretos vacios no se envian (el servidor conserva el guardado). */
export function buildBody(d: EmpDraft): FormData {
  const f = new FormData()
  f.append("razon_social", d.razon_social.trim())
  f.append("ruc", d.ruc)
  f.append("direccion", d.direccion.trim())
  f.append("client_id", d.client_id.trim())
  if (d.sol_user) f.append("sol_user", d.sol_user)
  if (d.sol_pass) f.append("sol_pass", d.sol_pass)
  if (d.client_secret) f.append("client_secret", d.client_secret)
  if (rucCheck(d.ruc) === "dv" && d.rucDemo) f.append("ruc_demo", "true")
  if (d.logo) f.append("logo", d.logo)
  if (d.cert) f.append("cert", d.cert)
  return f
}

/** Banderas por seccion para el menu lateral. */
export function sectionFlags(changed: EmpField[], errs: EmpErrors): Partial<Record<EmpSec, EmpFlag>> {
  const out: Partial<Record<EmpSec, EmpFlag>> = {}
  changed.forEach(f => { out[FIELD_SEC[f]] = "chg" })
  ;(Object.keys(errs) as EmpField[]).forEach(f => { if (errs[f]) out[FIELD_SEC[f]] = "err" })
  return out
}

/** Orden del flujo: datos y credenciales; la ficha RUC (con la empresa registrada y su certificado); y el modo SUNAT resultante. */
export const EMP_SECS: [EmpSec, string][] = [
  ["ident", "Identidad fiscal"], ["logo", "Logo"], ["sol", "Acceso SOL"], ["cert", "Certificado digital"], ["api", "API SUNAT"], ["ficha", "Ficha RUC"], ["modo", "Modo SUNAT"],
]
