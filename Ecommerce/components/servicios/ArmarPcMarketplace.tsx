"use client"

// Arma tu PC - rama "Se lo que quiero": buscador del catalogo, cantidades y
// total referencial en vivo (IGV incluido; el servidor recalcula al enviar).
import React, { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Minus, Plus, Search } from "lucide-react"
import { ecommerceProductService, type Product } from "@/services/ecommerceApi"
import { fmtPEN } from "./serviciosShared"

export type Seleccion = Record<number, { producto: Product; cantidad: number }>

const precioVigente = (p: Product) => p.precio_de_oferta ?? p.price

export const totalReferencial = (sel: Seleccion) =>
  Object.values(sel).reduce((s, l) => s + precioVigente(l.producto) * l.cantidad, 0)

type Props = {
  seleccion: Seleccion
  onChange: (sel: Seleccion) => void
  onAtras: () => void
  onContinuar: () => void
  error?: string
}

const ArmarPcMarketplace = ({ seleccion, onChange, onAtras, onContinuar, error }: Props) => {
  const [productos, setProductos] = useState<Product[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const cargar = () => {
    setFallo(false)
    ecommerceProductService.getAll()
      .then((r) => setProductos(r.data))
      .catch(() => setFallo(true))
  }
  useEffect(cargar, [])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!productos) return []
    if (!q) return productos
    return productos.filter((p) =>
      p.name.toLowerCase().includes(q) || p.category.name.toLowerCase().includes(q))
  }, [productos, busqueda])

  const poner = (p: Product, delta: number) => {
    const actual = seleccion[p.id]?.cantidad || 0
    const siguiente = Math.max(0, Math.min(50, actual + delta))
    const next = { ...seleccion }
    if (siguiente === 0) delete next[p.id]
    else next[p.id] = { producto: p, cantidad: siguiente }
    onChange(next)
  }

  const total = totalReferencial(seleccion)
  const lineas = Object.values(seleccion)

  return (
    <>
      <div className="mk">
        <section className="card">
          <h2>Elige tus productos</h2>
          <div className="f">
            <label className="sr" htmlFor="buscar-catalogo">Buscar en el catálogo</label>
            <div className="iw">
              <Search size={18} className="ic" aria-hidden />
              <input
                type="search"
                id="buscar-catalogo"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el catálogo"
              />
            </div>
          </div>
          {fallo && (
            <div className="alert warn" role="alert" style={{ marginTop: 16 }}>
              <div>
                <p className="at">No pudimos cargar el catálogo</p>
                <p>Revisa tu conexión e inténtalo de nuevo.</p>
                <div className="acts">
                  <button type="button" className="btn out" onClick={cargar}><span>Reintentar</span></button>
                </div>
              </div>
            </div>
          )}
          {!fallo && productos === null && (
            <p className="note" role="status" style={{ marginTop: 16 }}>
              <span>Cargando el catálogo…</span>
            </p>
          )}
          {!fallo && productos !== null && visibles.length === 0 && (
            <p className="note" style={{ marginTop: 16 }}>
              <span>{busqueda ? "Ningún producto coincide con tu búsqueda." : "No hay productos disponibles por ahora."}</span>
            </p>
          )}
          <ul className="prods">
            {visibles.map((p) => {
              const cant = seleccion[p.id]?.cantidad || 0
              return (
                <li className="prod" key={p.id}>
                  <div className="pn">
                    <b>{p.name}</b>
                    <span className="num mut">{fmtPEN(precioVigente(p))}</span>
                  </div>
                  <div className="qty" role="group" aria-label={`Cantidad de ${p.name}`}>
                    <button type="button" className="qb" aria-label="Quitar una unidad" aria-disabled={cant === 0 || undefined} onClick={() => poner(p, -1)}>
                      <Minus size={18} className="ic" aria-hidden />
                    </button>
                    <output className="num" aria-live="polite">{cant}</output>
                    <button type="button" className="qb" aria-label="Agregar una unidad" aria-disabled={cant >= 50 || undefined} onClick={() => poner(p, 1)}>
                      <Plus size={18} className="ic" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
        <aside className="card" aria-label="Tu selección">
          <h2>Tu selección</h2>
          <ul className="sel">
            {lineas.length === 0 && <li className="mut">Aún no eliges productos.</li>}
            {lineas.map((l) => (
              <li key={l.producto.id}>
                <span>{l.cantidad} × {l.producto.name}</span>
                <span className="num">{fmtPEN(precioVigente(l.producto) * l.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="total">
            <span>Total referencial</span>
            <b className="num">{fmtPEN(total)}</b>
          </div>
          <p className="mut" style={{ margin: "6px 0 16px" }}>IGV incluido. El monto final lo confirma Criscom.</p>
          {error && <p className="err" role="alert"><span>{error}</span></p>}
          <button type="button" className="btn stack" onClick={onContinuar}>
            <span>Continuar</span>
            <ArrowRight size={18} className="ic" aria-hidden />
          </button>
        </aside>
      </div>
      <div className="bar" data-mobbar>
        <div className="tot">
          <span className="mut">Total referencial · IGV incluido</span>
          <b className="num">{fmtPEN(total)}</b>
        </div>
        <button type="button" className="btn out" onClick={onAtras}>
          <ArrowLeft size={18} className="ic" aria-hidden />
          <span>Atrás</span>
        </button>
        <button type="button" className="btn" onClick={onContinuar}>
          <span>Continuar</span>
          <ArrowRight size={18} className="ic" aria-hidden />
        </button>
      </div>
    </>
  )
}

export default ArmarPcMarketplace
