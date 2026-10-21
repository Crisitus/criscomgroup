"use client"

// Lista del blog (port criscom-ecom-contenido): filas clicables con chip, fecha y
// "Leer guía". Sin buscador ni filtros (no existen en el backend). Estados:
// cargando (skeleton) / error con Reintentar / vacío, distintos entre sí.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Calendar, Loader, RotateCw, TriangleAlert } from "lucide-react"
import { PageHead, Estado } from "./contenidoShared"
import { fmtFecha } from "@/components/home/homeShared"

type Post = {
  id_post: number
  titulo: string
  slug: string
  resumen: string
  categoria: string
  publicado_en?: string
}

const SUB = "Guías técnicas para comprar y cuidar mejor tu equipo."

export default function BlogList() {
  const [estado, setEstado] = useState<"cargando" | "error" | "listo">("cargando")
  const [posts, setPosts] = useState<Post[]>([])

  const cargar = useCallback(async () => {
    setEstado("cargando")
    try {
      const res = await fetch("/api/blog/public", { cache: "no-store" })
      if (!res.ok) throw new Error(String(res.status))
      setPosts((await res.json()) as Post[])
      setEstado("listo")
    } catch {
      setEstado("error")
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  if (estado === "cargando") {
    return (
      <div className="pg-contenido"><div className="wrap">
        <PageHead titulo="Blog" sub="Cargando guías…" iconoSub={<Loader size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />} />
        <div className="rows" aria-busy="true" role="status" aria-label="Cargando guías">
          {[0, 1, 2].map((i) => (
            <div className="skrow" key={i}>
              <div className="sk" style={{ height: 20, width: 120 }} />
              <div className="sk" style={{ height: 24, width: "70%" }} />
              <div className="sk" style={{ height: 16, width: "92%" }} />
            </div>
          ))}
        </div>
      </div></div>
    )
  }

  if (estado === "error") {
    return (
      <div className="pg-contenido"><div className="wrap">
        <PageHead titulo="Blog" sub={SUB} />
        <div className="empty" role="alert">
          <Estado tono="bad" texto="Error de carga" icono={TriangleAlert} />
          <h2>No pudimos cargar las guías</h2>
          <p>Revisa tu conexión e inténtalo de nuevo. No es que no haya guías: la lista no llegó.</p>
          <button className="btn btn-p" type="button" onClick={() => void cargar()}>
            <RotateCw size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Reintentar
          </button>
        </div>
      </div></div>
    )
  }

  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Blog" sub={`${SUB} · ${posts.length} ${posts.length === 1 ? "guía" : "guías"}`} />
      {posts.length === 0 ? (
        <div className="empty">
          <Estado tono="neu" texto="Sin guías publicadas" icono={BookOpen} />
          <h2>Aún no hay guías publicadas</h2>
          <p>Cuando publiquemos una guía técnica la verás aquí.</p>
          <Link className="lk" href="/catalogo">Ver catálogo <ArrowRight size={16} strokeWidth={1.75} className="pg-ic" aria-hidden /></Link>
        </div>
      ) : (
        <div className="rows">
          {posts.map((p) => (
            <Link className="row" href={`/blog/${p.slug}`} key={p.id_post}>
              <i className="meta" style={{ fontStyle: "normal" }}>
                <i className="chip" style={{ fontStyle: "normal" }}>{p.categoria}</i>
                {p.publicado_en ? (
                  <i className="date" style={{ fontStyle: "normal" }}>
                    <Calendar size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
                    {fmtFecha(p.publicado_en)}
                  </i>
                ) : null}
              </i>
              <div>
                <h2>{p.titulo}</h2>
                <p>{p.resumen}</p>
              </div>
              <i className="go" style={{ fontStyle: "normal" }}>Leer guía <ArrowRight size={16} strokeWidth={1.75} className="pg-ic" aria-hidden /></i>
            </Link>
          ))}
        </div>
      )}
    </div></div>
  )
}
