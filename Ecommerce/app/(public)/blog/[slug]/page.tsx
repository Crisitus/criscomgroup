import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Calendar, ChevronRight } from "lucide-react"
import { PageHead } from "@/components/contenido/contenidoShared"
import { fmtFecha } from "@/components/home/homeShared"

export const dynamic = "force-dynamic"

type Post = {
  titulo: string
  slug: string
  resumen: string
  contenido: string
  categoria: string
  palabras_clave?: string
  publicado_en?: string
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const base = (process.env.BACKEND_INTERNAL_URL || "http://criscomgroup-backend:3000").replace(/\/$/, "")
    const response = await fetch(`${base}/api/blog/public/${encodeURIComponent(slug)}`, { cache: "no-store" })
    return response.ok ? response.json() : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return {
    title: `${post.titulo} | CRISCOM`,
    description: post.resumen,
    keywords: post.palabras_clave?.split(",").map((v) => v.trim()).filter(Boolean),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.titulo, description: post.resumen, type: "article" },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  // El resumen se muestra UNA vez: si el primer párrafo del contenido ya lo
  // repite (caso actual), el párrafo hace de entradilla; si no, se antepone.
  const parrafos = post.contenido.split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean)
  const cuerpo = parrafos[0] === (post.resumen || "").trim() ? parrafos : [(post.resumen || "").trim(), ...parrafos].filter(Boolean)

  return (
    <div className="pg-contenido"><div className="wrap">
      <nav className="crumbs" aria-label="Migas">
        <Link href="/blog">Blog</Link>
        <ChevronRight size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
        {post.categoria}
      </nav>
      <PageHead titulo={post.titulo} read />
      <div className="meta2">
        {post.publicado_en ? (
          <i className="date" style={{ fontStyle: "normal" }}>
            <Calendar size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
            {fmtFecha(post.publicado_en)}
          </i>
        ) : null}
        <i className="chip" style={{ fontStyle: "normal" }}>{post.categoria}</i>
      </div>
      <article className="prose">
        {cuerpo.map((p, i) => <p key={i}>{p}</p>)}
      </article>
      <div className="cta-end">
        <Link className="lk" href="/blog">
          <ArrowLeft size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
          Volver al blog
        </Link>
        <Link className="btn btn-p" href="/catalogo">
          Ver catálogo
          <ArrowRight size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
        </Link>
      </div>
    </div></div>
  )
}
