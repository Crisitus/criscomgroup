import api from '../lib/api'

export type BlogEstado = 'borrador' | 'publicado'

export type BlogPost = {
  id_post: number
  titulo: string
  slug: string
  resumen: string
  /** Solo viene en getBlogPost; los listados no lo incluyen. */
  contenido?: string
  imagen_url?: string | null
  categoria: string
  palabras_clave?: string | null
  estado: BlogEstado
  /** ISO con offset de Lima (-05:00). Una fecha futura programa la publicacion. */
  publicado_en?: string | null
  actualizado_en?: string
  aviso_slug?: string
}

export type BlogPostInput = Partial<Omit<BlogPost, 'id_post' | 'actualizado_en' | 'aviso_slug'>> & {
  /** Necesario para cambiar la URL de un articulo ya publicado. */
  cambiar_slug?: boolean
}

export type BlogListParams = { q?: string; estado?: BlogEstado; categoria?: string; limit?: number; offset?: number }
export type BlogListResult = { items: BlogPost[]; total: number }
export type BlogFieldErrors = Record<string, string>

export class BlogApiError extends Error {
  errores: BlogFieldErrors
  status?: number
  constructor(message: string, errores: BlogFieldErrors = {}, status?: number) {
    super(message)
    this.name = 'BlogApiError'
    this.errores = errores
    this.status = status
  }
}

const toError = (error: any): BlogApiError => {
  const data = error?.response?.data
  return new BlogApiError(data?.message || error?.message || 'No se pudo completar la operacion', data?.errores || {}, error?.response?.status)
}

const clean = (params: BlogListParams) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))

export const listBlogPosts = async (params: BlogListParams = {}): Promise<BlogListResult> => {
  try {
    const res = await api.get('/blog/admin', { params: clean(params) })
    const items: BlogPost[] = res.data
    return { items, total: Number(res.headers?.['x-total-count'] ?? items.length) }
  } catch (error) { throw toError(error) }
}
export const getBlogPost = async (id: number): Promise<BlogPost> => {
  try { return (await api.get(`/blog/admin/${id}`)).data } catch (error) { throw toError(error) }
}
export const listBlogCategories = async (): Promise<string[]> => {
  try { return (await api.get('/blog/admin/categorias')).data } catch (error) { throw toError(error) }
}
export const createBlogPost = async (data: BlogPostInput): Promise<BlogPost> => {
  try { return (await api.post('/blog/admin', data)).data } catch (error) { throw toError(error) }
}
export const updateBlogPost = async (id: number, data: BlogPostInput): Promise<BlogPost> => {
  try { return (await api.put(`/blog/admin/${id}`, data)).data } catch (error) { throw toError(error) }
}
export const deleteBlogPost = async (id: number): Promise<void> => {
  try { await api.delete(`/blog/admin/${id}`) } catch (error) { throw toError(error) }
}
