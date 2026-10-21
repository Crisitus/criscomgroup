"use client"

// 6 - Blog destacado (GET /api/blog/public, ultimos 3). Fecha dd/mm/aaaa hora de Lima.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, FileText, RefreshCw } from "lucide-react"
import { homeService, type HomePost } from "@/services/homeService"
import { fmtFecha } from "@/components/home/homeShared"

type Status = "loading" | "error" | "ready"

const BlogSection = () => {
  const [status, setStatus] = useState<Status>("loading")
  const [posts, setPosts] = useState<HomePost[]>([])

  const load = useCallback(() => {
    setStatus("loading")
    homeService.blog()
      .then((data) => {
        setPosts((Array.isArray(data) ? data : []).slice(0, 3))
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="sec pg-wrap" aria-label="Blog destacado" aria-busy={status === "loading"}>
      <div className="sec-hd">
        <h2>Blog destacado</h2>
        <Link className="more" href="/blog">Ver todos →</Link>
      </div>

      {status === "loading" && (
        <div className="blog-grid">
          {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 220 }} />)}
        </div>
      )}

      {status === "error" && (
        <div className="box err" role="alert">
          <span className="tile"><AlertTriangle className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>No pudimos cargar el blog</h3>
            <p>El resto de la página sigue disponible. Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={load}>
            <RefreshCw className="pg-ic" aria-hidden /> Reintentar
          </button>
        </div>
      )}

      {status === "ready" && posts.length === 0 && (
        <div className="box">
          <span className="tile"><FileText className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>Aún no hay artículos publicados</h3>
            <p>Pronto compartiremos guías y novedades.</p>
          </div>
        </div>
      )}

      {status === "ready" && posts.length > 0 && (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.id_post} className="post" href={`/blog/${p.slug}`}>
              <div className="post-img">
                {p.imagen_url ? (
                          <img src={p.imagen_url} alt="" loading="lazy" />
                ) : (
                  <FileText className="pg-ic" aria-hidden />
                )}
              </div>
              <div className="post-b">
                <div className="post-meta">
                  {p.categoria && <span className="chip">{p.categoria}</span>}
                  <time dateTime={p.publicado_en} className="num">{fmtFecha(p.publicado_en)}</time>
                </div>
                <h3>{p.titulo}</h3>
                <p>{p.resumen}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default BlogSection
