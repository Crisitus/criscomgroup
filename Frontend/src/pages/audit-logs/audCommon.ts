import type { AuditCatalogo, AuditFilters, AuditLogRow } from "../../services/auditLogService"

export const DASH = "\u2014"
export const OCULTO = "\u2022\u2022\u2022 oculto"
export const MOTIVO = "Registro anterior al control de estado"
export const FRASE = "PURGAR AUDITORIA"
export const LIMITES = [25, 50, 100]

export const ROL: Record<number, string> = { 1: "Gerente", 2: "Administrador", 3: "Vendedor", 5: "Auditor temporal", 6: "Técnico" }

export const ETQ_ACCION: Record<string, string> = {
  crear: "Crear", actualizar: "Actualizar", eliminar: "Eliminar", login: "Inicio de sesión", exportar: "Exportar", convertir: "Convertir",
  cambiar_estado: "Cambiar estado", solicitar_acceso: "Solicitar acceso", resolver_solicitud_acceso: "Resolver solicitud de acceso",
  configurar_superusuario_temporal: "Configurar superusuario temporal", purgar: "Purgar", purgar_total: "Purgar todo el historial",
}

export const ETQ_MODULO: Record<string, string> = {
  access_requests: "Solicitudes de acceso", auth: "Autenticación", banners: "Banners", blog_posts: "Blog", categorias: "Categorías",
  cierres_caja: "Cierres de caja", codigos_barras: "Códigos de barras", libro_reclamaciones: "Libro de reclamaciones", productos: "Productos",
  social_links: "Redes sociales", solicitudes_ensamble: "Cotizaciones de armado", solicitudes_importacion: "Solicitudes de importación",
  solicitudes_postventa: "Cambios y garantías", usuarios: "Usuarios", ventas: "Ventas", auditoria: "Auditoría", empresas: "Empresas",
  pedidos: "Pedidos", inventario: "Inventario", compras: "Compras", cotizaciones: "Cotizaciones", ordenes_servicio: "Órdenes de servicio",
  proveedores: "Proveedores", area_grants: "Permisos de área", pos_pagos: "Pagos POS", pos_adquirentes: "Adquirentes POS",
}

/** Pantalla del ERP donde vive cada modulo (enlace "Abrir en ..."). */
export const PANTALLA: Record<string, [string, string]> = {
  productos: ["Productos", "/products"], usuarios: ["Usuarios", "/vendors"], ventas: ["Ventas", "/sales"], cierres_caja: ["Cierres de caja", "/cash-register"],
  libro_reclamaciones: ["Libro de reclamaciones", "/libro-reclamaciones"], solicitudes_postventa: ["Cambios y garantías", "/postventa"],
  access_requests: ["Solicitudes de acceso", "/access-center"], solicitudes_importacion: ["Solicitudes de importación", "/solicitudes-importacion"],
  solicitudes_ensamble: ["Cotizaciones de armado", "/solicitudes-ensamble"], banners: ["Redes y banners", "/social-links"],
  social_links: ["Redes y banners", "/social-links"], blog_posts: ["Blog y contenidos", "/blog"], categorias: ["Categorías", "/categories"],
}

export const hum = (s: string) => { const t = String(s).replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1) }
export const lAcc = (a: string) => ETQ_ACCION[a] ?? hum(a)
export const lMod = (t: string) => ETQ_MODULO[t] ?? hum(t)
export const campoLabel = (c: string) => hum(c).replace(/\bigv\b/i, "IGV").replace(/\bid\b/gi, "ID")
export const norm = (ip: string | null) => (ip ? ip.replace(/^::ffff:/, "") : DASH)
export const rolLabel = (r: number | null) => (r == null ? DASH : ROL[r] ?? `Rol ${r}`)
export const hist = (r: AuditLogRow) => r.estado_http == null
export const reg = (r: AuditLogRow) => r.registro_ref || (r.registro_id != null ? `#${r.registro_id}` : DASH)

/** El servidor ya manda la hora de Lima (-05:00): se lee literal, sin convertir. */
export function cuando(iso: string) {
  const m = iso.match(/(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)/)
  if (!m) return { d: iso, dm: iso, t: "", ts: "", iso: "" }
  let h = +m[4]
  const ap = h >= 12 ? "p. m." : "a. m."
  h = h % 12 || 12
  return { d: `${m[3]}/${m[2]}/${m[1]}`, dm: `${m[3]}/${m[2]}`, t: `${h}:${m[5]} ${ap}`, ts: `${h}:${m[5]}:${m[6]} ${ap}`, iso: `${m[1]}-${m[2]}-${m[3]}` }
}

export function navegador(ua: string | null) {
  if (!ua) return DASH
  const so = /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : ""
  const PATRONES: [RegExp, string][] = [
    [/Edg\/(\d+)/, "Edge"], [/Firefox\/(\d+)/, "Firefox"], [/Chrome\/(\d+)/, "Chrome"], [/Version\/(\d+).*Safari/, "Safari"],
    [/curl\/([\d.]+)/, "curl"], [/Python-urllib\/([\d.]+)/, "Python urllib"],
  ]
  const hit = PATRONES.map(([re, n]) => ({ m: ua.match(re), n })).find(x => x.m)
  if (!hit?.m) return ua.slice(0, 40)
  const nav = `${hit.n} ${hit.m[1]}`
  return so ? `${nav} \u00b7 ${so}` : nav
}

export function autor(r: AuditLogRow, cat: AuditCatalogo | null) {
  const c = cat?.usuarios.find(u => u.id === r.usuario_id)
  return { name: r.usuario?.name || r.usuario_nombre || c?.name || DASH, email: r.usuario?.email || r.usuario_email || c?.email || DASH }
}

// --- fechas en hora de Lima ---
const LIMA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" })
export const hoyLima = () => LIMA.format(new Date())
export const addDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
export const ddmm = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "")
/** "" -> "" ; dd/mm/aaaa valido -> AAAA-MM-DD ; cualquier otra cosa -> null. */
export function leerFecha(txt: string): string | null {
  const t = txt.trim()
  if (!t) return ""
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso
}

// --- filtros ---
export interface Filtros { u: string; m: string; a: string; d: string; h: string; q: string }
export const VACIOS: Filtros = { u: "", m: "", a: "", d: "", h: "", q: "" }
export const hayFiltros = (f: Filtros) => Object.values(f).some(Boolean)
export const aParams = (f: Filtros): AuditFilters => ({ usuario_id: f.u, tabla: f.m, accion: f.a, desde: f.d, hasta: f.h, q: f.q })

export interface Chip { clave: "u" | "m" | "a" | "fecha" | "d" | "h" | "q"; k: string; v: string }
export function chipsDe(f: Filtros, cat: AuditCatalogo | null): Chip[] {
  const c: Chip[] = []
  if (f.u) c.push({ clave: "u", k: "Usuario", v: cat?.usuarios.find(x => String(x.id) === f.u)?.name ?? `#${f.u}` })
  if (f.m) c.push({ clave: "m", k: "Módulo", v: lMod(f.m) })
  if (f.a) c.push({ clave: "a", k: "Acción", v: lAcc(f.a) })
  if (f.d && f.d === f.h) c.push({ clave: "fecha", k: "Fecha", v: f.d === hoyLima() ? "Hoy" : ddmm(f.d) })
  else { if (f.d) c.push({ clave: "d", k: "Desde", v: ddmm(f.d) }); if (f.h) c.push({ clave: "h", k: "Hasta", v: ddmm(f.h) }) }
  if (f.q) c.push({ clave: "q", k: "Búsqueda", v: `\u201c${f.q}\u201d` })
  return c
}

// --- valores sensibles: el servidor ya los redacta; aqui se refuerza por si una fila historica los trae ---
const SECRETO = /pass|pwd|contrase|clave|secret|token|authorization|api_?key|llave|certificad|hash|^sol_|cvv|^pin$|otp|firma|credencial|cookie|salt/i
const FORMA = /^\$2[aby]\$|^eyJ[\w-]+\.[\w-]+\.[\w-]+$/
export const esSecreto = (campo: string, v: unknown) => SECRETO.test(campo) || (typeof v === "string" && (v === "[REDACTADO]" || FORMA.test(v)))
export function limpiarJson(v: unknown, clave = ""): unknown {
  if (v == null) return v
  if (Array.isArray(v)) return v.map(x => limpiarJson(x, clave))
  if (typeof v === "object") return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, limpiarJson(x, k)]))
  return esSecreto(clave, v) ? OCULTO : v
}

/** Motivo escrito junto al control "Purgar historial" cuando esta deshabilitado. */
export const motivoPurga = (rol: number | null | undefined) =>
  rol === 5 ? "Tu rol, Auditor temporal, es de solo lectura: puedes consultar y exportar."
    : rol === 1 ? "Tu sesión es de Gerente sin el correo de la cuenta maestra; un superusuario temporal tampoco puede purgar."
    : "Tu acceso permite consultar y exportar, pero no purgar."

export const modItems = (cat: AuditCatalogo | null): [string, string][] => (cat?.tablas ?? []).map(t => [t, lMod(t)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "es"))
export const accItems = (cat: AuditCatalogo | null): [string, string][] => (cat?.acciones ?? []).map(a => [a, lAcc(a)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "es"))
