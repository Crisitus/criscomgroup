import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CircleAlert, CircleCheck, CircleMinus, X } from "lucide-react"
import { commercialApi } from "../../../services/commercialService"
import { AssignForm } from "./AssignForm"
import { LocationForm } from "./LocationForm"
import { I, SEP, TIPOS, errMsg, pl, type Loc, type Row } from "./prodShared"

type Tab = "asignar" | "nueva"

export function LocationsPanel({ rows, pid, ro, onClose, onChanged }: { rows: Row[]; pid?: number; ro: boolean; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<Tab>("asignar")
  const q = useQuery({ queryKey: ["inventory-locations"], queryFn: commercialApi.locations })
  const locs = (q.data || []) as Loc[]
  const units = new Map<number, number>()
  rows.forEach(r => r.quants.forEach(x => units.set(x.ubicacion_id, (units.get(x.ubicacion_id) || 0) + x.disponible)))
  const placed = [...units.values()].reduce((s, n) => s + n, 0)
  const loose = rows.reduce((s, r) => s + Math.max(r.su, 0), 0)
  const tabBtn = (k: Tab, label: string) => <button type="button" className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
  return (
    <div className="pg-prod dlgw drw">
      <aside className="pnl">
        <div className="dh"><h3>Ubicaciones</h3><button type="button" className="ib" aria-label="Cerrar ubicaciones" onClick={onClose}>{I(X, 20)}</button></div>
        <div className="db">
          {q.isLoading && <p className="mut" role="status">Cargando ubicaciones...</p>}
          {q.isError && <div className="err-box" role="alert">{I(CircleAlert, 18)}<span>{errMsg(q.error, "No se pudieron cargar las ubicaciones")}</span><button type="button" className="btn out sm" style={{ marginLeft: "auto" }} onClick={() => void q.refetch()}>Reintentar</button></div>}
          {q.isSuccess && (
            <>
              <div className="gt">{pl(locs.length, "ubicación", "ubicaciones")}{SEP}{pl(placed, "unidad ubicada", "unidades ubicadas")}{SEP}{loose} sin ubicar</div>
              {!locs.length && <p className="mut">Aún no hay ubicaciones. Crea la primera en la pestaña «Nueva ubicación».</p>}
              <div className="lst" role="list">
                {locs.map(l => (
                  <div className="lr" role="listitem" key={l.id_ubicacion_inventario}>
                    <div className="t"><b>{l.nombre}</b><span><span className="sku">{l.codigo}</span>{SEP}{TIPOS[l.tipo] || l.tipo}</span></div>
                    {l.activa ? <span className="st ok">{I(CircleCheck, 12)}Activa</span> : <span className="st neu">{I(CircleMinus, 12)}Inactiva</span>}
                    <div className="u num" style={{ minWidth: 52 }}>{units.get(l.id_ubicacion_inventario) || 0}<small>u.</small></div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="tabs" role="tablist" style={{ marginTop: 16 }}>{tabBtn("asignar", "Asignar existencia")}{tabBtn("nueva", "Nueva ubicación")}</div>
          <div role="tabpanel">
            {tab === "asignar"
              ? <AssignForm rows={rows} locs={locs.filter(l => l.activa)} pid={pid} ro={ro} onSaved={onChanged} />
              : <LocationForm ro={ro} onSaved={onChanged} />}
          </div>
        </div>
      </aside>
    </div>
  )
}
