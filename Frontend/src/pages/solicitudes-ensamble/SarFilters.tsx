import { Search } from "lucide-react"
import type { ResumenSolicitudes } from "../../services/solicitudImportacionService"
import { DASH, ESTADOS, MODOS } from "./sarCommon"
import { I } from "./sarParts"
import type { Filtros } from "./useSarList"

/** Busqueda + modo en una linea; chips de estado con contador (del resumen del servidor). */
export function SarFilters({ f, qLive, resumen, err, onQ, onSet }: {
  f: Filtros; qLive: string; resumen: ResumenSolicitudes; err: boolean
  onQ: (v: string) => void; onSet: (c: Partial<Filtros>) => void
}) {
  const n = (v: number) => (err ? DASH : String(v))
  return (
    <div className="fb">
      <div className="fr">
        <label className="srch">
          {I(Search, 18)}
          <input type="search" value={qLive} onChange={e => onQ(e.target.value)} placeholder="Buscar por código, cliente, correo, teléfono o ciudad" aria-label="Buscar solicitudes" />
        </label>
        <div className="seg" role="radiogroup" aria-label="Modo de la solicitud">
          {MODOS.map(([v, l]) => <button key={v || "todos"} type="button" role="radio" aria-checked={f.modo === v} onClick={() => onSet({ modo: v as Filtros["modo"] })}>{l}</button>)}
        </div>
      </div>
      <div className="chs" role="radiogroup" aria-label="Estado de la solicitud">
        {ESTADOS.map(([v, l]) => (
          <button key={v || "todas"} type="button" className="sc" role="radio" aria-checked={f.estado === v} onClick={() => onSet({ estado: v })}>{l} <b>{n(v === "" ? resumen.total : resumen[v] ?? 0)}</b></button>
        ))}
      </div>
    </div>
  )
}
