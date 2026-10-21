import { CircleAlert, Clock, Search } from "lucide-react"
import type { EstadoReclamacion, ReclamacionResumen, TipoReclamacion } from "../../services/libroReclamacionesService"
import { ESTADOS, DASH } from "./libroCommon"
import { I } from "./libroParts"
import type { Filtros } from "./useLibroList"

const TIPOS: [TipoReclamacion | "", string][] = [["", "Todos"], ["reclamo", "Reclamo"], ["queja", "Queja"]]

/** Busqueda + tipo + atajos de urgencia en una linea; chips de estado con contador (del resumen). */
export function LibroFilters({ f, qLive, resumen, err, onQ, onSet }: {
  f: Filtros; qLive: string; resumen: ReclamacionResumen; err: boolean
  onQ: (v: string) => void; onSet: (c: Partial<Filtros>) => void
}) {
  const n = (v: number) => (err ? DASH : String(v))
  const cuenta = (e: EstadoReclamacion | "") => (e === "" ? resumen.total : resumen.por_estado[e])
  return (
    <div className="fb">
      <div className="fr">
        <label className="srch">
          {I(Search, 18)}
          <input type="search" value={qLive} onChange={e => onQ(e.target.value)} placeholder="Buscar por código, nombre, documento o correo" aria-label="Buscar hojas" />
        </label>
        <div className="seg" role="radiogroup" aria-label="Tipo de hoja">
          {TIPOS.map(([v, l]) => <button key={v || "todos"} type="button" role="radio" aria-checked={f.tipo === v} onClick={() => onSet({ tipo: v })}>{l}</button>)}
        </div>
        <button type="button" className="tg" aria-pressed={f.vencido} onClick={() => onSet({ vencido: !f.vencido })}>{I(CircleAlert, 16)}Vencidos ({n(resumen.vencidos)})</button>
        {!err && <span className="pvx">{I(Clock, 16)}{resumen.por_vencer} por vencer</span>}
      </div>
      <div className="fr" role="radiogroup" aria-label="Estado de la hoja">
        {ESTADOS.map(([v, l]) => (
          <button key={v || "todas"} type="button" className="sc" role="radio" aria-checked={f.estado === v} onClick={() => onSet({ estado: v })}>{l} <b>{n(cuenta(v))}</b></button>
        ))}
      </div>
    </div>
  )
}
