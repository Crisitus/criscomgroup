"use client"

// 2 - Categorias (GET /api/ecommerce/categorias): rejilla plana con icono lucide.
// imagen_url null => placeholder con icono; descripcion seed-* => no se muestra.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Layers, RefreshCw } from "lucide-react"
import { homeService, type HomeCategoria } from "@/services/homeService"
import { catIcon, isSeed } from "@/components/home/homeShared"

type Status = "loading" | "error" | "ready"

const CategoriesSection = () => {
  const [status, setStatus] = useState<Status>("loading")
  const [categorias, setCategorias] = useState<HomeCategoria[]>([])

  const load = useCallback(() => {
    setStatus("loading")
    homeService.categorias()
      .then((data) => {
        setCategorias(Array.isArray(data) ? data : [])
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="sec pg-wrap" aria-label="Categorías" aria-busy={status === "loading"}>
      <div className="sec-hd">
        <h2>Categorías</h2>
        <Link className="more" href="/catalogo">Ver catálogo completo →</Link>
      </div>

      {status === "loading" && (
        <div className="cat-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 72 }} />)}
        </div>
      )}

      {status === "error" && (
        <div className="box err" role="alert">
          <span className="tile"><AlertTriangle className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>No pudimos cargar las categorías</h3>
            <p>El resto de la página sigue disponible. Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={load}>
            <RefreshCw className="pg-ic" aria-hidden /> Reintentar
          </button>
        </div>
      )}

      {status === "ready" && categorias.length === 0 && (
        <div className="box">
          <span className="tile"><Layers className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>No hay categorías publicadas</h3>
            <p>Explora el catálogo completo mientras tanto.</p>
          </div>
        </div>
      )}

      {status === "ready" && categorias.length > 0 && (
        <div className="cat-grid">
          {categorias.map((c) => {
            const Icon = catIcon(c.nombre)
            const descripcion = c.descripcion && !isSeed(c.descripcion) ? c.descripcion : null
            return (
              <Link key={c.id_categoria} className="cat" href={`/catalogo?categoria=${c.id_categoria}`} title={c.nombre}>
                {c.imagen_url ? (
                          <img className="tile" src={c.imagen_url} alt="" />
                ) : (
                  <span className="tile"><Icon className="pg-ic" aria-hidden /></span>
                )}
                <div>
                  <span className="t">{c.nombre}</span>
                  {descripcion && <small>{descripcion}</small>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CategoriesSection
