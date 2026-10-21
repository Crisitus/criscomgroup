import type { BlogPost, BlogPostInput } from "../../../services/blogService"
import { estadoDe, limaNow, slugify, type Mode } from "./blogCommon"

export type BlogForm = {
  titulo: string; resumen: string; contenido: string; categoria: string
  imagen_url: string; slug: string; palabras_clave: string
  mode: Mode; fecha: string; hora: string; cambiar: boolean
}

export const emptyForm = (): BlogForm => ({
  titulo: "", resumen: "", contenido: "", categoria: "", imagen_url: "", slug: "", palabras_clave: "",
  mode: "b", fecha: "", hora: "09:00", cambiar: false,
})

/** Post completo -> formulario. El modo parte del estado actual. */
export const formFromPost = (p: BlogPost): BlogForm => {
  const e = estadoDe(p)
  return {
    titulo: p.titulo, resumen: p.resumen, contenido: p.contenido || "", categoria: p.categoria || "",
    imagen_url: p.imagen_url || "", slug: p.slug, palabras_clave: p.palabras_clave || "",
    mode: e === "borrador" ? "b" : e === "programado" ? "p" : "a",
    fecha: e === "programado" && p.publicado_en ? p.publicado_en.slice(0, 10) : "",
    hora: e === "programado" && p.publicado_en ? p.publicado_en.slice(11, 16) : "09:00",
    cambiar: false,
  }
}
export const programadoIso = (f: BlogForm) => `${f.fecha}T${f.hora || "00:00"}:00-05:00`
export const programadoLocal = (f: BlogForm) => `${f.fecha}T${f.hora || "00:00"}`

/** Cuerpo para la API. El backend conserva publicado_en si no se envia. */
export function toBody(f: BlogForm, orig: BlogPost | null): BlogPostInput {
  const body: BlogPostInput = {
    titulo: f.titulo, resumen: f.resumen, contenido: f.contenido, categoria: f.categoria.trim() || undefined,
    imagen_url: f.imagen_url.trim(), palabras_clave: f.palabras_clave, slug: f.slug.trim() || undefined,
    estado: f.mode === "b" ? "borrador" : "publicado",
  }
  if (f.mode === "p") body.publicado_en = programadoIso(f)
  else if (f.mode === "a" && (!orig || estadoDe(orig) !== "publicado")) body.publicado_en = `${limaNow()}:00-05:00`
  if (orig) body.cambiar_slug = f.cambiar
  return body
}

/** Errores de cliente (solo lo que el backend no puede decir antes de enviar). */
export function localErrors(f: BlogForm): Record<string, string> {
  if (f.mode !== "p") return {}
  if (!f.fecha) return { publicado_en: "Elige la fecha en que saldrá en la web." }
  if (programadoLocal(f) <= limaNow()) return { publicado_en: "La fecha debe ser futura. Para publicar ya, elige Publicar ahora." }
  return {}
}

export const previewSlug = (f: BlogForm) => f.slug.trim() || slugify(f.titulo)
export const dirtyOf = (a: BlogForm, b: BlogForm) => JSON.stringify(a) !== JSON.stringify(b)
export const changedLabel = (a: BlogForm, b: BlogForm) => {
  const n: string[] = []
  if (a.titulo !== b.titulo) n.push("el título")
  if (a.resumen !== b.resumen) n.push("el resumen")
  if (a.contenido !== b.contenido) n.push("el contenido")
  if (a.categoria !== b.categoria || a.imagen_url !== b.imagen_url || a.slug !== b.slug || a.palabras_clave !== b.palabras_clave || a.cambiar !== b.cambiar) n.push("los datos de la dirección web, imagen o categoría")
  if (a.mode !== b.mode || a.fecha !== b.fecha || a.hora !== b.hora) n.push("la publicación")
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n[0] || "datos"
}
