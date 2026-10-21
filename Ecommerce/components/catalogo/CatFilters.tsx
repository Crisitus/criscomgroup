"use client"

// Filtros del catalogo: UNA linea en desktop (Categorias, Solo ofertas, Solo con stock,
// Precio, Ordenar); en movil un boton "Filtros (N activos)" que abre una hoja inferior (D9).
import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, SlidersHorizontal, Tag, X } from "lucide-react"
import type { Category } from "@/services/ecommerceApi"
import { nActivos, precioLbl, type Filtros } from "./catShared"

export interface FiltrosProps {
  f: Filtros
  categorias: Category[]
  catCount: (id: number) => number
  onToggleCat: (id: number) => void
  onToggle: (key: "oferta" | "stock") => void
  onPrecio: (min: string, max: string) => void
  onOrden: (orden: Filtros["orden"]) => void
  onClear: () => void
  onApply: (next: Filtros) => void
}

export const OrdenSelect = ({ f, onOrden, hideLabel }: { f: Filtros; onOrden: (o: Filtros["orden"]) => void; hideLabel?: boolean }) => (
  <>
    <label className={hideLabel ? "sr" : "lbl-s"} htmlFor="orden-catalogo">
      Ordenar
    </label>
    <select className="sel" id="orden-catalogo" value={f.orden} onChange={(e) => onOrden(e.target.value as Filtros["orden"])}>
      <option value="nombre">Nombre A-Z</option>
      <option value="pa">Precio: menor a mayor</option>
      <option value="pd">Precio: mayor a menor</option>
      <option value="rec">Más recientes</option>
    </select>
  </>
)

export const PrecioFields = ({ min, max, onChange, idSuffix = "" }: { min: string; max: string; onChange: (min: string, max: string) => void; idSuffix?: string }) => (
  <div className="row2">
    <div className="fld">
      <label htmlFor={`precio-min${idSuffix}`}>Mínimo</label>
      <span className="money">
        <b>S/</b>
        <input className="inp num" id={`precio-min${idSuffix}`} inputMode="numeric" value={min} placeholder="0" onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""), max)} />
      </span>
    </div>
    <div className="fld">
      <label htmlFor={`precio-max${idSuffix}`}>Máximo</label>
      <span className="money">
        <b>S/</b>
        <input className="inp num" id={`precio-max${idSuffix}`} inputMode="numeric" value={max} placeholder="3,000" onChange={(e) => onChange(min, e.target.value.replace(/[^\d.]/g, ""))} />
      </span>
    </div>
  </div>
)

const CheckFila = ({ checked, onToggle, title, count }: { checked: boolean; onToggle: () => void; title: string; count?: number }) => (
  <label className="ck">
    <input type="checkbox" checked={checked} onChange={onToggle} />
    <span className="bx">
      <Check aria-hidden />
    </span>
    <span className="t" title={title}>
      {title}
    </span>
    {count != null && <span className="k num">{count}</span>}
  </label>
)

// Barra de desktop: popovers planos de categorias y de rango de precio.
const CatFilterBar = (props: FiltrosProps) => {
  const { f, categorias, catCount, onToggleCat, onToggle, onPrecio, onOrden } = props
  const [pop, setPop] = useState<"cat" | "prc" | null>(null)
  const [minD, setMinD] = useState(f.min)
  const [maxD, setMaxD] = useState(f.max)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pop !== "prc") return
    setMinD(f.min)
    setMaxD(f.max)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pop])

  useEffect(() => {
    if (!pop) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPop(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPop(null)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [pop])

  const precioActivo = f.min !== "" || f.max !== ""
  return (
    <div className="fb only-d" role="toolbar" aria-label="Filtros" ref={ref}>
      <button type="button" className="tg" aria-expanded={pop === "cat"} aria-haspopup="true" onClick={() => setPop(pop === "cat" ? null : "cat")}>
        <SlidersHorizontal className="ic" aria-hidden />
        Categorías
        {f.cats.length > 0 && <span className="n num">{f.cats.length}</span>}
        <ChevronDown className="ic s16" aria-hidden />
      </button>
      <button type="button" className="tg" aria-pressed={f.oferta} onClick={() => onToggle("oferta")}>
        <Tag className="ic" aria-hidden />
        Solo ofertas
      </button>
      <button type="button" className="tg" aria-pressed={f.stock} onClick={() => onToggle("stock")}>
        <Check className="ic" aria-hidden />
        Solo con stock
      </button>
      <button type="button" className={`tg${precioActivo ? " on" : ""}`} aria-expanded={pop === "prc"} aria-haspopup="true" onClick={() => setPop(pop === "prc" ? null : "prc")}>
        {precioLbl(f)}
        <ChevronDown className="ic s16" aria-hidden />
      </button>
      <span className="sp" />
      <OrdenSelect f={f} onOrden={onOrden} />
      {pop === "cat" && (
        <div className="pop cat" role="group" aria-label="Categorías">
          {categorias.map((c) => (
            <CheckFila key={c.id} title={c.name} checked={f.cats.includes(c.id)} count={catCount(c.id)} onToggle={() => onToggleCat(c.id)} />
          ))}
        </div>
      )}
      {pop === "prc" && (
        <div className="pop prc" role="group" aria-label="Rango de precio">
          <PrecioFields min={minD} max={maxD} onChange={(a, b) => { setMinD(a); setMaxD(b) }} />
          <div className="row2" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { onPrecio("", ""); setPop(null) }}>
              Borrar
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onPrecio(minD.trim(), maxD.trim()); setPop(null) }}>
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatFilterBar

// Boton movil que abre la hoja de filtros (el estado de apertura vive en la pagina).
export const FiltrosMovil = ({ f, onOrden, onOpen }: { f: Filtros; onOrden: (o: Filtros["orden"]) => void; onOpen: () => void }) => {
  const n = nActivos(f)
  return (
    <div className="fb only-m">
      <button type="button" className={`tg${n ? " on" : ""}`} onClick={onOpen}>
        <SlidersHorizontal className="ic" aria-hidden />
        Filtros{n > 0 ? ` (${n} ${n === 1 ? "activo" : "activos"})` : ""}
      </button>
      <OrdenSelect f={f} onOrden={onOrden} hideLabel />
    </div>
  )
}

// Hoja inferior movil: edita un borrador y se aplica con el boton fijo (D9).
export const FiltrosSheet = (props: FiltrosProps & { countFor: (d: Filtros) => number; onClose: () => void }) => {
  const { f, categorias, catCount, countFor, onClose } = props
  const [draft, setDraft] = useState<Filtros>(f)
  useEffect(() => setDraft(f), [f])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const setD = (patch: Partial<Filtros>) => setDraft((d) => ({ ...d, ...patch }))
  const aplicar = () => {
    props.onApply({ ...draft, page: 1 })
    onClose()
  }

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Filtros">
        <div className="sheet-hd">
          <span>Filtros</span>
          <button type="button" className="icon-btn" aria-label="Cerrar filtros" onClick={onClose} autoFocus>
            <X className="ic" aria-hidden />
          </button>
        </div>
        <div className="sheet-bd">
          <h3>Categorías</h3>
          {categorias.map((c) => (
            <CheckFila
              key={c.id}
              title={c.name}
              checked={draft.cats.includes(c.id)}
              count={catCount(c.id)}
              onToggle={() => setD({ cats: draft.cats.includes(c.id) ? draft.cats.filter((x) => x !== c.id) : [...draft.cats, c.id] })}
            />
          ))}
          <h3>Mostrar</h3>
          <CheckFila title="Solo ofertas" checked={draft.oferta} onToggle={() => setD({ oferta: !draft.oferta })} />
          <CheckFila title="Solo con stock" checked={draft.stock} onToggle={() => setD({ stock: !draft.stock })} />
          <h3>Precio</h3>
          <PrecioFields min={draft.min} max={draft.max} idSuffix="-m" onChange={(a, b) => setD({ min: a, max: b })} />
        </div>
        <div className="sheet-ft">
          <button type="button" className="btn btn-outline" onClick={() => setDraft({ ...draft, cats: [], oferta: false, stock: false, min: "", max: "" })}>
            Limpiar
          </button>
          <button type="button" className="btn btn-primary" onClick={aplicar}>
            Aplicar {"·"} <span className="num">{countFor(draft)}</span> {countFor(draft) === 1 ? "producto" : "productos"}
          </button>
        </div>
      </section>
    </>
  )
}
