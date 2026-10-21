"use client"

// Detalle /producto/[id] (port criscom-ecom-catalogo): migas, dos columnas (galeria | info),
// ficha plana (stock, garantia redactada, condicion) SIN datos internos (D7), cantidad
// limitada al stock, Agregar + WhatsApp config-driven, relacionados en cliente (D8),
// acciones fijas abajo en movil (mbar). Estados: carga, error con Reintentar, 404 (D10).
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ChevronRight,
  MessageCircle,
  Minus,
  Package,
  PackageSearch,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  WifiOff,
} from "lucide-react"
import { ecommerceProductService, type Product } from "@/services/ecommerceApi"
import { useConfigPublica } from "@/hooks/useSocialLinks"
import { addToCartHome, catIcon, waHref } from "@/components/home/homeShared"
import { addToCartQty, cleanTexto, descVisible, precioEfectivo } from "../catalogo/catShared"
import CatCard, { PriceRow, StockLabel } from "../catalogo/CatCard"
import CatQuickView from "../catalogo/CatQuickView"
import ProductoGallery from "./ProductoGallery"
import "@/styles/catalogo.css"

type Status = "loading" | "error" | "notfound" | "ready"

const ProductoDetail = () => {
  const params = useParams()
  const id = Number(params?.id)
  const configPublica = useConfigPublica()
  const [status, setStatus] = useState<Status>("loading")
  const [p, setP] = useState<Product | null>(null)
  const [rel, setRel] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [qv, setQv] = useState<Product | null>(null)

  const load = useCallback(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setStatus("notfound")
      return
    }
    setStatus("loading")
    Promise.all([ecommerceProductService.getById(id), ecommerceProductService.getAll()])
      .then(([prod, all]) => {
        setP(prod.data)
        const lista = Array.isArray(all.data) ? all.data : []
        setRel(
          lista
            .filter((x) => x.category_id === prod.data.category_id && x.id !== prod.data.id)
            .sort((a, b) => a.name.localeCompare(b.name, "es"))
            .slice(0, 4),
        )
        setStatus("ready")
      })
      .catch((e: { response?: { status?: number } }) => setStatus(e?.response?.status === 404 ? "notfound" : "error"))
  }, [id])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    setQty(1)
  }, [id])

  const waBase = waHref(configPublica?.whatsapp_number)
  const nombre = p ? cleanTexto(p.name) : ""
  const waMsg = p && waBase ? `${waBase}?text=${encodeURIComponent(`Hola, me interesa: ${nombre}`)}` : null

  const agregar = useCallback(
    (prod: Product, cant: number) => {
      const item = {
        productId: prod.id,
        name: cleanTexto(prod.name),
        price: precioEfectivo(prod),
        imagen: prod.imagen || undefined,
        affiliate_business_id: prod.affiliate_business_id ?? null,
      }
      if (cant <= 1) addToCartHome(item)
      else addToCartQty(item, cant, prod.stock)
    },
    [],
  )

  const crumbs = (
    <nav className="crumbs" aria-label="Migas de pan">
      <Link className="only-m" href="/catalogo">
        <ArrowLeft className="ic s16" aria-hidden />
        Volver al catálogo
      </Link>
      <span className="only-d" style={{ display: "contents" }}>
        <Link href="/">Inicio</Link>
        <ChevronRight className="ic" aria-hidden />
        <Link href="/catalogo">Catálogo</Link>
        <ChevronRight className="ic" aria-hidden />
        {p && p.category?.name?.trim() && (
          <>
            <Link href={`/catalogo?categoria=${p.category_id}`}>{p.category.name.trim()}</Link>
            <ChevronRight className="ic" aria-hidden />
          </>
        )}
        <span aria-current="page">{status === "notfound" ? "Producto no encontrado" : nombre}</span>
      </span>
    </nav>
  )

  if (status === "loading") {
    return (
      <div className="pg-catalogo">
        <div className="pg-wrap pg" aria-busy="true" aria-label="Cargando producto">
          <div className="sk" style={{ height: 44, width: "60%", marginBottom: 8 }} />
          <div className="dt">
            <div className="sk" style={{ aspectRatio: "4/3", borderRadius: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="sk" style={{ height: 24, width: "40%" }} />
              <div className="sk" style={{ height: 34, width: "85%" }} />
              <div className="sk" style={{ height: 40, width: "50%" }} />
              <div className="sk" style={{ height: 120 }} />
              <div className="sk" style={{ height: 48, marginTop: "auto" }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="pg-catalogo">
        <div className="pg-wrap pg">
          {crumbs}
          <div className="stt err" role="alert">
            <span className="tile">
              <WifiOff className="ic" aria-hidden />
            </span>
            <h2>No pudimos cargar el producto</h2>
            <p>Revisa tu conexión e inténtalo de nuevo. Tus productos del carrito se conservan.</p>
            <div className="acts">
              <button type="button" className="btn btn-primary" onClick={load}>
                <RefreshCw className="ic" aria-hidden />
                Reintentar
              </button>
              <Link className="btn btn-outline" href="/catalogo">
                Volver al catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === "notfound" || !p) {
    return (
      <div className="pg-catalogo">
        <div className="pg-wrap pg">
          {crumbs}
          <div className="stt" role="alert">
            <span className="tile">
              <PackageSearch className="ic" aria-hidden />
            </span>
            <h2>Producto no encontrado</h2>
            <p>El producto que buscas no existe o ya no está disponible. Puede que el enlace esté desactualizado.</p>
            <div className="acts">
              <Link className="btn btn-primary" href="/catalogo">
                <ArrowRight className="ic" aria-hidden />
                Volver al catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const agotado = p.stock <= 0
  const cat = p.category?.name?.trim()
  const CatIcon = catIcon(cat || "")
  const desc = descVisible(p.description)
  const obs = p.condicion === "segunda_mano" ? descVisible(p.estado_observaciones) : null
  const garantia = Number(p.garantia_meses) > 0 ? Number(p.garantia_meses) : 0
  const whyId = `why-pd-${p.id}`
  const cant = Math.min(Math.max(qty, 1), Math.max(p.stock, 1))

  return (
    <div className="pg-catalogo">
      <div className="pg-wrap pg has-mbar">
        {crumbs}
        <div className="dt">
          <ProductoGallery product={p} />
          <div className="di">
            <div className="chips">
              {cat && (
                <span className="chip">
                  <CatIcon className="ic" aria-hidden />
                  <span>{cat}</span>
                </span>
              )}
              <span className={`chip${p.condicion === "segunda_mano" ? " pr" : ""}`}>
                {p.condicion === "segunda_mano" ? (
                  <>
                    <RefreshCw className="ic" aria-hidden />
                    <span>Segunda mano</span>
                  </>
                ) : (
                  <>
                    <Package className="ic" aria-hidden />
                    <span>Nuevo</span>
                  </>
                )}
              </span>
              {p.affiliate_business_id != null && (
                <span className="chip">
                  <Store className="ic" aria-hidden />
                  <span>Vendido por socio</span>
                </span>
              )}
            </div>
            <h1>{nombre}</h1>
            <PriceRow product={p} big />
            {desc && <p className="ds">{desc}</p>}
            <div className="fct">
              <div>
                <p>
                  <b>
                    <StockLabel stock={p.stock} />
                  </b>
                  <span>{agotado ? "Consúltanos por reposición." : `${p.stock} ${p.stock === 1 ? "unidad disponible" : "unidades disponibles"}`}</span>
                </p>
              </div>
              {garantia > 0 && (
                <div>
                  <ShieldCheck className="ic" aria-hidden />
                  <p>
                    <b>{`Garantía de ${garantia} ${garantia === 1 ? "mes" : "meses"}`}</b>
                    <span>Consulta las condiciones por WhatsApp o en tienda.</span>
                  </p>
                </div>
              )}
              <div>
                {p.condicion === "segunda_mano" ? <RefreshCw className="ic" aria-hidden /> : <Package className="ic" aria-hidden />}
                <p>
                  <b>{p.condicion === "segunda_mano" ? "Segunda mano" : "Producto nuevo"}</b>
                  {obs && <span>{obs}</span>}
                </p>
              </div>
            </div>
            <div className="only-d" style={{ display: "contents" }}>
              <div className="buy">
                <div className="qty" role="group" aria-label="Cantidad">
                  <button type="button" disabled={agotado || cant <= 1} aria-label="Quitar una unidad" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                    <Minus className="ic" aria-hidden />
                  </button>
                  <output className="num" aria-live="polite">
                    {agotado ? 0 : cant}
                  </output>
                  <button type="button" disabled={agotado || cant >= p.stock} aria-label="Agregar una unidad" onClick={() => setQty((v) => Math.min(p.stock, v + 1))}>
                    <Plus className="ic" aria-hidden />
                  </button>
                </div>
                {agotado ? (
                  <button type="button" className="btn btn-outline" disabled aria-disabled="true" aria-describedby={whyId}>
                    <ShoppingCart className="ic" aria-hidden />
                    Agregar al carrito
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => agregar(p, cant)}>
                    <ShoppingCart className="ic" aria-hidden />
                    Agregar al carrito
                  </button>
                )}
                {waMsg && (
                  <a className="btn btn-wa" href={waMsg} target="_blank" rel="noopener noreferrer" aria-label={`${agotado ? "Consultar disponibilidad" : "Preguntar"} por WhatsApp`}>
                    <MessageCircle className="ic" aria-hidden />
                    {agotado ? "Consultar disponibilidad" : "Preguntar por WhatsApp"}
                  </a>
                )}
              </div>
              {agotado && (
                <p className="why" id={whyId}>
                  <Ban className="ic s16" aria-hidden />
                  Sin stock: no se puede agregar al carrito.
                </p>
              )}
            </div>
            {!agotado && <p className="hnt only-d">{`Máximo ${p.stock} ${p.stock === 1 ? "unidad" : "unidades"} por pedido, según el stock disponible.`}</p>}
            {agotado && (
              <p className="why only-m" id={`${whyId}-m`}>
                <Ban className="ic s16" aria-hidden />
                Sin stock: no se puede agregar al carrito.
              </p>
            )}
          </div>
        </div>

        {rel.length > 0 && (
          <section className="sec2" aria-labelledby="rel-titulo">
            <h2 id="rel-titulo">Productos relacionados</h2>
            <div className="grid4">
              {rel.map((x) => (
                <CatCard key={x.id} product={x} selected={qv?.id === x.id} onQuickView={setQv} onAdd={(prod) => agregar(prod, 1)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mbar" role="group" aria-label="Acciones del producto">
        <div className="qty" role="group" aria-label="Cantidad">
          <button type="button" disabled={agotado || cant <= 1} aria-label="Quitar una unidad" onClick={() => setQty((v) => Math.max(1, v - 1))}>
            <Minus className="ic" aria-hidden />
          </button>
          <output className="num" aria-live="polite">
            {agotado ? 0 : cant}
          </output>
          <button type="button" disabled={agotado || cant >= p.stock} aria-label="Agregar una unidad" onClick={() => setQty((v) => Math.min(p.stock, v + 1))}>
            <Plus className="ic" aria-hidden />
          </button>
        </div>
        {agotado ? (
          <button type="button" className="btn btn-outline" disabled aria-disabled="true" aria-describedby={`${whyId}-m`}>
            <ShoppingCart className="ic" aria-hidden />
            Agregar
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => agregar(p, cant)}>
            <ShoppingCart className="ic" aria-hidden />
            Agregar
          </button>
        )}
        {waMsg && (
          <a className="btn btn-wa sq" href={waMsg} target="_blank" rel="noopener noreferrer" aria-label="Preguntar por WhatsApp">
            <MessageCircle className="ic" aria-hidden />
          </a>
        )}
      </div>

      {qv && <CatQuickView product={qv} whatsapp={configPublica?.whatsapp_number ?? null} onClose={() => setQv(null)} />}
    </div>
  )
}

export default ProductoDetail
