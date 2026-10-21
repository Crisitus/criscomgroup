import type { RefObject } from "react"
import { ChevronDown, ScanBarcode, Search, Trash2 } from "lucide-react"
import { EN, ELL, fp, type Seg, type Sort } from "./ofeCalc"
import { I } from "./ofeShared"
import type { Cat } from "./useOfeData"

export function OfeHeader({ mob, noOffers, off, busy, loading, onAll }: { mob: boolean; noOffers: boolean; off: boolean; busy: boolean; loading: boolean; onAll: () => void }) {
  const dis = off || noOffers || busy || loading
  const why = off ? "off-msg" : "qt-why"
  return (
    <div className="hd">
      <h1>Ofertas</h1>
      {!mob && <span className="hint">Marca productos para aplicar una oferta {"·"} Mayús + clic marca un rango</span>}
      <button type="button" className="btn out dn" aria-disabled={dis || undefined} aria-describedby={dis ? why : undefined} onClick={() => { if (!dis) onAll() }}>
        {I(Trash2, 16)}Quitar todas{ELL}
      </button>
    </div>
  )
}

export function OfeKpi({ k }: { k: { total: number; on: number; avg: number | null; max: number | null } }) {
  const c = (l: string, v: string | number) => <div className="cell"><span className="k">{l}</span><span className="v num">{v}</span></div>
  return (
    <div className="strip" role="group" aria-label="Resumen de ofertas">
      {c("Productos", k.total)}{c("En oferta", k.on)}
      {c("Descuento promedio", k.avg === null ? "—" : fp(k.avg))}{c("Descuento máximo", k.max === null ? "—" : fp(k.max))}
    </div>
  )
}

const SORTS: [Sort, string][] = [
  ["oferta", "Con oferta primero"], ["name_asc", `Nombre (A${EN}Z)`], ["name_desc", `Nombre (Z${EN}A)`], ["desc", "Mayor descuento"],
  ["margen", "Menor margen"], ["stock_asc", "Stock ascendente"], ["stock_desc", "Stock descendente"], ["id_desc", "Más recientes"], ["id_asc", "Más antiguos"],
]

interface FProps {
  q: string; onQ: (v: string) => void; inputRef: RefObject<HTMLInputElement | null>; scanning: boolean; onFocus: (on: boolean) => void
  cat: string; onCat: (v: string) => void; cats: Cat[]; sort: Sort; onSort: (s: Sort) => void
  seg: Seg; onSeg: (s: Seg) => void; counts: [number, number, number]; busy: boolean
}

export function OfeFilters(p: FProps) {
  const pre = (k: Seg, t: string, n: number) => (
    <button type="button" className="pre" aria-pressed={p.seg === k} aria-disabled={p.busy || undefined} onClick={() => { if (!p.busy) p.onSeg(k) }}>
      {t}<span className="n num">{n}</span>
    </button>
  )
  return (
    <div className="fbar">
      <label className="fld q">
        {I(/^\d{5,}$/.test(p.q.trim()) ? ScanBarcode : Search, 16)}
        <input
          ref={p.inputRef} type="search" aria-label="Buscar por nombre, SKU o código de barras" placeholder="Nombre, SKU o código"
          value={p.q} onChange={e => p.onQ(e.target.value)} onFocus={() => p.onFocus(true)} onBlur={() => p.onFocus(false)}
        />
        {p.scanning && <span className="sub scn">Escáner activo</span>}
      </label>
      <div className="row2">
        <div className="sel cat">
          <select aria-label="Categoría" value={p.cat} onChange={e => p.onCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {p.cats.map(c => <option key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre}</option>)}
          </select>
          {I(ChevronDown, 16)}
        </div>
        <div className="sel ord">
          <select aria-label="Orden" value={p.sort} onChange={e => p.onSort(e.target.value as Sort)}>
            {SORTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {I(ChevronDown, 16)}
        </div>
      </div>
      <div className="seg" role="group" aria-label="Mostrar">{pre("all", "Todos", p.counts[0])}{pre("on", "Con oferta", p.counts[1])}{pre("off", "Sin oferta", p.counts[2])}</div>
    </div>
  )
}
