import { useCallback, useEffect, useMemo, useState } from "react"
import { listBlogCategories, listBlogPosts, type BlogPost } from "../../../services/blogService"
import { estadoDe, norm, type EstadoFiltro } from "./blogCommon"

export const PAGE = 30

/** Lista completa (sin contenido) + categorias; filtros y contadores en cliente. */
export function useBlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [q, setQ] = useState("")
  const [est, setEst] = useState<EstadoFiltro>("todos")
  const [cat, setCat] = useState("")
  const [shown, setShown] = useState(PAGE)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setStatus("load")
    try {
      const [list, c] = await Promise.all([listBlogPosts(), listBlogCategories().catch(() => [] as string[])])
      setPosts(list.items); setCats(c); setStatus("ok")
    } catch { setStatus("error") }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setShown(PAGE) }, [q, est, cat])

  const base = useMemo(() => (cat ? posts.filter(p => p.categoria === cat) : posts), [posts, cat])
  const counts = useMemo(() => {
    const c = { todos: base.length, borrador: 0, publicado: 0, programado: 0 }
    base.forEach(p => { c[estadoDe(p)] += 1 })
    return c
  }, [base])
  const rows = useMemo(() => {
    const nq = norm(q.trim())
    return base.filter(p => (est === "todos" || estadoDe(p) === est) && (!nq || norm(`${p.titulo} ${p.resumen}`).includes(nq)))
  }, [base, q, est])
  const allCats = useMemo(() => Array.from(new Set([...cats, ...posts.map(p => p.categoria)])).sort((a, b) => a.localeCompare(b, "es")), [cats, posts])
  const clear = () => { setQ(""); setEst("todos"); setCat("") }
  return { posts, cats: allCats, status, q, setQ, est, setEst, cat, setCat, shown, more: () => setShown(n => n + PAGE), counts, rows, load, clear }
}
