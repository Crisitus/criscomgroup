import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { BlogApiError, createBlogPost, deleteBlogPost, getBlogPost, updateBlogPost, type BlogPost } from "../../../services/blogService"
import { changedLabel, dirtyOf, emptyForm, formFromPost, localErrors, previewSlug, toBody, type BlogForm } from "./blogForm"
import { estadoDe, slugify } from "./blogCommon"

export type Sel = { kind: "none" } | { kind: "new" } | { kind: "post"; id: number }
const SEC = ["slug", "imagen_url", "palabras_clave"]
const hhmm = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(11, 16).replace(/^(\d+):(\d+)$/, (_, h, m) => `${+h % 12 || 12}:${m} ${+h < 12 ? "a. m." : "p. m."}`)

export function useBlogEditor(reload: (quiet?: boolean) => Promise<void>) {
  const [sel, setSel] = useState<Sel>({ kind: "none" })
  const [loadingPost, setLoadingPost] = useState<BlogPost | null>(null)
  const [orig, setOrig] = useState<BlogPost | null>(null)
  const [f, setF] = useState<BlogForm>(emptyForm())
  const [base, setBase] = useState<BlogForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [det, setDet] = useState(false)
  const [aviso, setAviso] = useState<{ msg: string; final: string; colision: boolean } | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leave, setLeave] = useState<(() => void) | null>(null)
  const [toDelete, setToDelete] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const token = useRef(0)

  const dirty = sel.kind !== "none" && !loadingPost && dirtyOf(f, base)
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  const guard = (go: () => void) => { if (dirty) setLeave(() => go); else go() }
  const reset = (o: BlogPost | null, form: BlogForm, s: Sel) => { setOrig(o); setF(form); setBase(form); setErrors({}); setAviso(null); setSavedAt(null); setDet(false); setLoadingPost(null); setSel(s) }

  const openNew = () => guard(() => { token.current++; reset(null, emptyForm(), { kind: "new" }) })
  const close = () => guard(() => { token.current++; reset(null, emptyForm(), { kind: "none" }) })
  const openPost = (p: BlogPost) => {
    if (sel.kind === "post" && sel.id === p.id_post) return
    guard(async () => {
      const t = ++token.current
      setSel({ kind: "post", id: p.id_post }); setLoadingPost(p)
      try {
        const full = await getBlogPost(p.id_post)
        if (t === token.current) reset(full, formFromPost(full), { kind: "post", id: p.id_post })
      } catch (error) {
        if (t !== token.current) return
        toast.error(error instanceof Error ? error.message : "No se pudo abrir la publicación")
        reset(null, emptyForm(), { kind: "none" })
      }
    })
  }

  const set = useCallback(<K extends keyof BlogForm>(k: K, v: BlogForm[K]) => {
    setF(c => ({ ...c, [k]: v }))
    setErrors(c => { const n = { ...c }; delete n[k as string]; if (k === "fecha" || k === "hora" || k === "mode") delete n.publicado_en; return n })
    if (k === "slug") setAviso(null)
  }, [])

  const save = async () => {
    const local = localErrors(f)
    if (Object.keys(local).length) { setErrors(local); return }
    setSaving(true); setErrors({})
    const asked = f.slug.trim() || slugify(f.titulo)
    try {
      const res = orig ? await updateBlogPost(orig.id_post, toBody(f, orig)) : await createBlogPost(toBody(f, null))
      const full = await getBlogPost(res.id_post).catch(() => res)
      const form = formFromPost(full)
      reset(full, form, { kind: "post", id: full.id_post })
      setSavedAt(hhmm())
      if (res.aviso_slug) { setAviso({ msg: res.aviso_slug, final: full.slug, colision: asked !== full.slug }); setDet(true) }
      const e = estadoDe(full)
      toast.success(e === "publicado" ? "Publicación guardada y visible en la web" : e === "programado" ? "Publicación programada" : "Borrador guardado")
      await reload(true)
    } catch (error) {
      if (error instanceof BlogApiError) {
        setErrors(error.errores)
        if (Object.keys(error.errores).some(k => SEC.includes(k))) setDet(true)
        if (!Object.keys(error.errores).length || error.status !== 400) toast.error(error.message)
      } else toast.error("No se pudo guardar")
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    const post = toDelete
    if (!post) return
    setDeleting(true)
    try {
      await deleteBlogPost(post.id_post)
      toast.success("Publicación eliminada")
      if (sel.kind === "post" && sel.id === post.id_post) { token.current++; reset(null, emptyForm(), { kind: "none" }) }
      setToDelete(null)
      await reload(true)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar") }
    finally { setDeleting(false) }
  }

  const slug = previewSlug(f)
  return { sel, loadingPost, orig, f, errors, det, setDet, aviso, savedAt, saving, dirty, leave, setLeave, toDelete, setToDelete, deleting, openNew, openPost, close, set, save, confirmDelete, changed: changedLabel(f, base), slug }
}
