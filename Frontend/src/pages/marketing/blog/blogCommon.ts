import type { LucideIcon } from "lucide-react"
import { CircleCheck, Clock, Pencil } from "lucide-react"
import type { BlogPost } from "../../../services/blogService"

export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const MINUS = "\u2212"
export const Q = (s: string) => `\u00ab${s}\u00bb`
export const SITE = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "") || "https://criscomgroup.pe"
export const SITE_HOST = SITE.replace(/^https?:\/\//, "")

export type Estado = "borrador" | "publicado" | "programado"
export type Mode = "b" | "a" | "p"
export type EstadoFiltro = "todos" | Estado
export const CHIPS: [EstadoFiltro, string][] = [["todos", "Todos"], ["borrador", "Borrador"], ["publicado", "Publicado"], ["programado", "Programado"]]
export const ST: Record<Estado, [string, LucideIcon, string]> = {
  borrador: ["Borrador", Pencil, "neu"],
  publicado: ["Publicado", CircleCheck, "ok"],
  programado: ["Programado", Clock, "warn"],
}

/** Estado visible: programado = publicado con fecha futura. */
export const estadoDe = (p: Pick<BlogPost, "estado" | "publicado_en">): Estado =>
  p.estado === "borrador" ? "borrador" : p.publicado_en && new Date(p.publicado_en).getTime() > Date.now() ? "programado" : "publicado"

const DN = ["domingo", "lunes", "martes", "mi\u00e9rcoles", "jueves", "viernes", "s\u00e1bado"]
const MN = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
/** Las fechas del backend ya llegan en hora de Lima (ISO con -05:00): se leen como texto. */
export const dF = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
export const tF = (s: string) => { const h = +s.slice(11, 13); return `${h % 12 || 12}:${s.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}` }
export const dtF = (s: string) => `${dF(s)} ${tF(s)}`
export const longF = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return `${DN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MN[m - 1]} a las ${tF(s)}`
}
/** Ahora en Lima como `YYYY-MM-DDTHH:mm` (valor de la zona, sin offset). */
export const limaNow = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 16)
export const daysTo = (s: string) => Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - Date.UTC(+limaNow().slice(0, 4), +limaNow().slice(5, 7) - 1, +limaNow().slice(8, 10))) / 864e5)
export const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}${ELL}` : s)
export const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180)
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
