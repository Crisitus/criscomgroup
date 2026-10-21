"use client"

// 5 - Tarjetas de marketing (GET /api/ecommerce/tarjetas). Seccion decorativa:
// si el array viene vacio (o falla) no se muestra y no deja hueco.
import { useEffect, useState } from "react"
import { ImageIcon } from "lucide-react"
import { homeService, type HomeTarjeta } from "@/services/homeService"
import { cleanTitulo } from "@/components/home/homeShared"

const MarketingStrip = () => {
  const [tarjetas, setTarjetas] = useState<HomeTarjeta[]>([])

  useEffect(() => {
    let active = true
    homeService.tarjetas()
      .then((data) => { if (active) setTarjetas(Array.isArray(data) ? data : []) })
      .catch(() => { if (active) setTarjetas([]) })
    return () => { active = false }
  }, [])

  if (tarjetas.length === 0) return null

  return (
    <section className="sec pg-wrap" aria-label="Por qué comprar con nosotros">
      <div className="strip">
        {tarjetas.map((t) => (
          <div key={t.id_tarjeta}>
            {t.imagen_url ? (
                  <img src={t.imagen_url} alt="" />
            ) : (
              <span className="tile"><ImageIcon className="pg-ic" aria-hidden /></span>
            )}
            <div>
              <h3>{cleanTitulo(t.titulo)}</h3>
              <p>{t.descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default MarketingStrip
