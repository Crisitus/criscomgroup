import type { RefObject } from "react"
import { MapPin, Plus, ScanBarcode, Search } from "lucide-react"
import { I } from "./prodShared"

export function ProdHeader({ title, mob, q, onQ, inputRef, onUbic, onNew, ro }: {
  title: string; mob: boolean; q: string; onQ: (v: string) => void; inputRef: RefObject<HTMLInputElement | null>
  onUbic: () => void; onNew: () => void; ro: boolean
}) {
  const search = (
    <label className="fld q">
      <span className="sr">Buscar producto</span>{I(Search, 18)}
      <input ref={inputRef} type="search" value={q} onChange={e => onQ(e.target.value)}
        placeholder={mob ? "Nombre, SKU o código" : "Buscar por nombre, SKU o escanear código"} aria-label="Buscar por nombre, SKU o código de barras" />
      {I(ScanBarcode, 18)}
    </label>
  )
  const ubic = mob
    ? <button type="button" className="ib bd" aria-label="Ubicaciones" onClick={onUbic}>{I(MapPin, 20)}</button>
    : <button type="button" className="btn out" onClick={onUbic}>{I(MapPin)}Ubicaciones</button>
  const nuevo = <button type="button" className="btn" aria-disabled={ro} aria-describedby={ro ? "why-off" : undefined} onClick={() => { if (!ro) onNew() }}>{I(Plus)}Nuevo producto</button>
  if (mob) return <><div className="hd"><h1>{title}</h1><span className="sp" />{ubic}</div>{search}</>
  return <div className="hd"><h1>{title}</h1>{search}{ubic}{nuevo}</div>
}
