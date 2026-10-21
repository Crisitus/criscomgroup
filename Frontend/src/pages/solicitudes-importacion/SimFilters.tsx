import { ChevronDown, Search, X } from "lucide-react"
import type { EstadoSolicitud, NivelUrgencia, ResumenSolicitudes } from "../../services/solicitudImportacionService"
import { DASH, ESTADO, ESTADOS, TIPO, URG, URGENCIAS } from "./simCommon"
import { I } from "./simParts"
import type { Filtros } from "./useSimList"

const Select = ({ label, value, opts, onChange }: { label: string; value: string; opts: [string, string][]; onChange: (v: string) => void }) => (
  <div className="sl">
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    {I(ChevronDown, 16)}
  </div>
)

/** Busqueda + urgencia + tipo en una linea; chips de estado con el contador del resumen. */
export function SimFilters({ f, qLive, resumen, err, mob, onQ, onSet }: {
  f: Filtros; qLive: string; resumen: ResumenSolicitudes; err: boolean; mob: boolean
  onQ: (v: string) => void; onSet: (c: Partial<Filtros>) => void
}) {
  const n = (v: number) => (err ? DASH : String(v))
  const chips: [EstadoSolicitud | "", string, number][] = [["", "Todas", resumen.total], ...ESTADOS.map((k): [EstadoSolicitud, string, number] => [k, ESTADO[k].l, resumen[k] ?? 0])]
  return (
    <div className="fb">
      <div className="fr">
        <div className="srch">
          {I(Search, 18)}
          <input type="search" value={qLive} onChange={e => onQ(e.target.value)} aria-label="Buscar solicitudes"
            placeholder={mob ? "Buscar código, cliente o producto" : "Buscar por código, cliente, correo, teléfono, producto, marca o modelo"} />
          {qLive && <button type="button" className="ib" aria-label="Borrar búsqueda" onClick={() => onQ("")}>{I(X, 18)}</button>}
        </div>
        <Select label="Urgencia" value={f.urgencia} onChange={v => onSet({ urgencia: v as NivelUrgencia | "" })}
          opts={[["", "Urgencia: todas"], ...URGENCIAS.map((k): [string, string] => [k, `Urgencia: ${URG[k].l.toLowerCase()}`])]} />
        <Select label="Tipo" value={f.tipo} onChange={v => onSet({ tipo: v })}
          opts={[["", "Tipo: todos"], ...Object.entries(TIPO).map(([k, l]): [string, string] => [k, `Tipo: ${l.toLowerCase()}`])]} />
      </div>
      <div className={`fr${mob ? " scr" : ""}`} role="radiogroup" aria-label="Estado de la solicitud">
        {chips.map(([k, l, c]) => (
          <button key={k || "todas"} type="button" className="sc" role="radio" aria-checked={f.estado === k} onClick={() => onSet({ estado: k })}>
            {k ? I(ESTADO[k].i, 14) : null}{l} <b>{n(c)}</b>
          </button>
        ))}
      </div>
    </div>
  )
}
