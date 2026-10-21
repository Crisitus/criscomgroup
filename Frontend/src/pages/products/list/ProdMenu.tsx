import { useEffect, useRef } from "react"
import { ArrowDownUp, Barcode, Ellipsis, Eye, History, MapPin, Trash2 } from "lucide-react"
import { I, type Row } from "./prodShared"

export interface MenuActs {
  open: (r: Row) => void; codes: (r: Row) => void; hist: (r: Row) => void
  ubic: (r: Row) => void; adjust: (r: Row) => void; del: (r: Row) => void
}

export function ProdMenu({ r, ro, acts, openId, setOpenId }: { r: Row; ro: boolean; acts: MenuActs; openId: number | null; setOpenId: (id: number | null) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const isOpen = openId === r.id
  useEffect(() => {
    if (!isOpen) return
    const down = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpenId(null) }
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null) }
    document.addEventListener("mousedown", down)
    document.addEventListener("keydown", key)
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key) }
  }, [isOpen, setOpenId])
  const go = (fn: (r: Row) => void) => () => { setOpenId(null); fn(r) }
  const write = (icon: typeof Eye, label: string, fn: (r: Row) => void, cls = "") =>
    ro
      ? <button type="button" className={`mi${cls}`} aria-disabled="true" aria-describedby="why-off">{I(icon)}<span>{label}<small>Fuera de horario laboral</small></span></button>
      : <button type="button" className={`mi${cls}`} role="menuitem" onClick={go(fn)}>{I(icon)}{label}</button>
  return (
    <div className="ac" ref={wrap} onClick={e => e.stopPropagation()}>
      <button type="button" className="ib" aria-label={`Acciones de ${r.p.nombre}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : r.id)}>
        {I(Ellipsis, 20)}
      </button>
      {isOpen && (
        <div className="menu" role="menu" aria-label={`Acciones de ${r.p.sku}`}>
          <button type="button" className="mi" role="menuitem" onClick={go(acts.open)}>{I(Eye)}Abrir ficha</button>
          <button type="button" className="mi" role="menuitem" onClick={go(acts.codes)}>{I(Barcode)}Ver códigos de barras</button>
          <button type="button" className="mi" role="menuitem" onClick={go(acts.hist)}>{I(History)}Historial de movimientos</button>
          <button type="button" className="mi" role="menuitem" onClick={go(acts.ubic)}>{I(MapPin)}Ubicaciones y lotes</button>
          {write(ArrowDownUp, "Ajustar stock", acts.adjust)}
          <hr />
          {write(Trash2, "Eliminar producto", acts.del, " del")}
        </div>
      )}
    </div>
  )
}
