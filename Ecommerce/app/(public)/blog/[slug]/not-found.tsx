import Link from "next/link"
import { ArrowLeft, ChevronRight, FileQuestion } from "lucide-react"
import { PageHead, Estado } from "@/components/contenido/contenidoShared"

// 404 del post: la guía no existe o ya no está publicada (diseño s02b).
export default function BlogPostNotFound() {
  return (
    <div className="pg-contenido"><div className="wrap">
      <nav className="crumbs" aria-label="Migas">
        <Link href="/blog">Blog</Link>
        <ChevronRight size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
        No encontrada
      </nav>
      <PageHead titulo="Guía no encontrada" read />
      <div className="empty" role="alert">
        <Estado tono="neu" texto="Error 404" icono={FileQuestion} />
        <p>Esta guía no existe o ya no está publicada.</p>
        <Link className="btn btn-p" href="/blog">
          <ArrowLeft size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
          Volver al blog
        </Link>
      </div>
    </div></div>
  )
}
