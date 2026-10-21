import { ChevronLeft, CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react"
import type { Ficha } from "./types"
import { I } from "./shared"

export type Pend = "dirty" | "recalc" | "invalid" | "busy" | "clean"

export function Header({ p, catName, bajo, pend, can, mob, statusId: gw, onBack, onSave }: {
  p: Ficha
  catName: string
  bajo: boolean
  pend: Pend
  can: boolean
  mob: boolean
  statusId: string
  onBack: () => void
  onSave: () => void
}) {
  const chips = (
    <>
      {p.condicion === "segunda_mano" && <span className="tag">Segunda mano</span>}
      {p.origen === "importado" && <span className="tag">Importado</span>}
      {p.es_oferta && <span className="tag">Oferta</span>}
      {bajo && <span className="st bad">{I(TriangleAlert, 14)}Bajo mínimo</span>}
    </>
  )
  const status =
    pend === "busy" ? <span className="pend neu" id={gw} role="status">{I(Loader2, 16, "spin")}Guardando cambios…</span>
    : pend === "invalid" ? <span className="pend bad" id={gw} role="status">{I(CircleAlert, 16)}Revisa los campos marcados</span>
    : pend === "dirty" ? <span className="pend warn" id={gw} role="status">{I(CircleAlert, 16)}Cambios sin guardar</span>
    : pend === "recalc" ? <span className="pend warn" id={gw} role="status">{I(CircleAlert, 16)}Stock por recalcular</span>
    : <span className="pend neu" id={gw}>{I(CircleCheck, 16)}Sin cambios por guardar</span>
  const save = (
    <button type="button" className="btn" aria-disabled={!can} aria-describedby={can ? undefined : gw} onClick={() => { if (can) onSave() }}>
      Guardar
    </button>
  )
  const back = (
    <button type="button" className="btn out" onClick={onBack}>
      {I(ChevronLeft)}Volver
    </button>
  )
  return (
    <div className="hd">
      <div className="t">
        <h1>{p.nombre}</h1>
        <span className="tag mono">{p.sku}</span>
        <span className="tag">{catName}</span>
        {chips}
        {mob && status}
      </div>
      {!mob && <div className="ac">{status}{back}{save}</div>}
    </div>
  )
}

/** Barra inferior movil: Volver + Guardar (reutiliza el mismo estado de Header). */
export function MobileBar({ can, describedBy, onBack, onSave }: { can: boolean; describedBy?: string; onBack: () => void; onSave: () => void }) {
  return (
    <div className="bar">
      <button type="button" className="btn out" onClick={onBack}>{I(ChevronLeft)}Volver</button>
      <button type="button" className="btn" aria-disabled={!can} aria-describedby={can ? undefined : describedBy} onClick={() => { if (can) onSave() }}>Guardar</button>
    </div>
  )
}
