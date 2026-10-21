"use client"

// 3 - Ofertas vigentes (GET /api/ecommerce/ofertas): precio_oferta grande + precio tachado
// + % derivado; stock con icono + palabra; agotado = boton deshabilitado con motivo.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Ban, CircleCheck, ImageIcon, RefreshCw, ShoppingCart, Tag } from "lucide-react"
import { homeService, type HomeOferta } from "@/services/homeService"
import { addToCartHome, money, pctOferta } from "@/components/home/homeShared"

type Status = "loading" | "error" | "ready"

const OfertaCard = ({ oferta }: { oferta: HomeOferta }) => {
  const agotado = oferta.stock <= 0
  const pocas = !agotado && oferta.stock <= 5
  const pct = pctOferta(oferta.precio, oferta.precio_oferta)
  const whyId = `why-${oferta.id_producto}`
  const categoria = oferta.categoria?.nombre?.trim()

  return (
    <article className="pc">
      <div className="pc-img">
        {oferta.imagen_url ? (
          <img src={oferta.imagen_url} alt={oferta.nombre} loading="lazy" />
        ) : (
          <>
            <ImageIcon className="pg-ic" aria-hidden />
            <span>Sin imagen</span>
          </>
        )}
      </div>
      <div className="pc-body">
        {categoria && <span className="pc-cat">{categoria}</span>}
        <Link className="pc-name" href={`/producto/${oferta.id_producto}`} title={oferta.nombre}>
          {oferta.nombre}
        </Link>
        <div className="pc-price num">
          <span className="pc-now">{money(oferta.precio_oferta)}</span>
          <span className="pc-old"><span className="sr">Precio normal </span>{money(oferta.precio)}</span>
          {pct > 0 && <span className="pc-off"><Tag style={{ width: 16, height: 16 }} aria-hidden />−{pct} %</span>}
        </div>
        <div className={`pc-stock ${agotado ? "out" : pocas ? "low" : "ok"}`}>
          {agotado
            ? <><Ban style={{ width: 16, height: 16 }} aria-hidden /><span>Agotado</span></>
            : pocas
              ? <><AlertTriangle style={{ width: 16, height: 16 }} aria-hidden /><span>Últimas {oferta.stock} unidades</span></>
              : <><CircleCheck style={{ width: 16, height: 16 }} aria-hidden /><span>En stock ({oferta.stock})</span></>}
        </div>
        <div className="pc-act">
          {agotado ? (
            <button type="button" className="btn" disabled aria-describedby={whyId}>
              <ShoppingCart className="pg-ic" aria-hidden /> Agregar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              aria-label={`Agregar ${oferta.nombre} al carrito`}
              onClick={() =>
                addToCartHome({
                  productId: oferta.id_producto,
                  name: oferta.nombre,
                  price: Number(oferta.precio_oferta),
                  imagen: oferta.imagen_url || undefined,
                  affiliate_business_id: oferta.affiliate_business_id ?? null,
                })
              }
            >
              <ShoppingCart className="pg-ic" aria-hidden /> Agregar
            </button>
          )}
          <Link className="btn btn-outline" href={`/producto/${oferta.id_producto}`} aria-label={`Ver ${oferta.nombre}`}>
            Ver
          </Link>
        </div>
        {agotado && <p className="pc-why" id={whyId}>No disponible: sin unidades en stock.</p>}
      </div>
    </article>
  )
}

const OffersSection = () => {
  const [status, setStatus] = useState<Status>("loading")
  const [ofertas, setOfertas] = useState<HomeOferta[]>([])

  const load = useCallback(() => {
    setStatus("loading")
    homeService.ofertas()
      .then((data) => {
        setOfertas(Array.isArray(data) ? data : [])
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="sec pg-wrap" aria-label="Ofertas vigentes" aria-busy={status === "loading"}>
      <div className="sec-hd">
        <h2>Ofertas vigentes</h2>
        {status === "ready" && ofertas.length > 0 && (
          <Link className="more" href="/catalogo?ofertas=1">Ver todas las ofertas →</Link>
        )}
      </div>

      {status === "loading" && (
        <div className="skel-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skel tall" />)}
        </div>
      )}

      {status === "error" && (
        <div className="box err" role="alert">
          <span className="tile"><AlertTriangle className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>No pudimos cargar las ofertas</h3>
            <p>El resto de la página sigue disponible. Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={load}>
            <RefreshCw className="pg-ic" aria-hidden /> Reintentar
          </button>
        </div>
      )}

      {status === "ready" && ofertas.length === 0 && (
        <div className="box">
          <span className="tile"><Tag className="pg-ic" aria-hidden /></span>
          <div className="grow">
            <h3>Hoy no hay ofertas vigentes</h3>
            <p>Vuelve pronto o explora el catálogo completo.</p>
          </div>
          <Link className="btn btn-outline" href="/catalogo">Ver catálogo</Link>
        </div>
      )}

      {status === "ready" && ofertas.length > 0 && (
        <div className="grid4">
          {ofertas.map((oferta) => <OfertaCard key={oferta.id_producto} oferta={oferta} />)}
        </div>
      )}
    </section>
  )
}

export default OffersSection
