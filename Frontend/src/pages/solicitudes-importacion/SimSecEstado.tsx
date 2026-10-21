import { Lock } from "lucide-react"
import type { EstadoSolicitud, SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { CERRADA, ESTADO, MAT, consecuencia, esTerminal } from "./simCommon"
import { I } from "./simParts"

/** Selector de estado: solo el actual y las transiciones validas, cada una con su consecuencia. */
export function SimSecEstado({ r, k, sel, onSel }: { r: Sol; k: string; sel: EstadoSolicitud; onSel: (e: EstadoSolicitud) => void }) {
  const cur = r.estado
  const term = esTerminal(cur)
  const destinos = (r.transiciones ?? MAT[cur] ?? []).filter(e => e !== cur)
  return (
    <section className="sec" aria-labelledby={`${k}-h2`}>
      <h3 id={`${k}-h2`}>Cambiar estado <span className="tot">{term ? "sin transiciones" : "solo transiciones válidas"}</span></h3>
      <div className="opts" role="radiogroup" aria-labelledby={`${k}-h2`}>
        {[cur, ...destinos].map(e => {
          const esCur = e === cur
          const S = ESTADO[e]
          return (
            <button key={e} type="button" className="opt" role="radio" aria-checked={e === sel}
              aria-disabled={term || undefined} aria-describedby={term ? `${k}-cerr` : undefined}
              onClick={() => { if (!term) onSel(e) }}>
              <span className="rd" />
              <span className="ot">
                <span className="on1">{I(S.i, 15)}{S.l}{esCur && <span style={{ fontWeight: 500 }}> · actual</span>}</span>
                <span className="oc">{esCur ? (term ? "Estado final." : "Sin cambio.") : consecuencia(e, cur)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {term && (
        <div className="pz" id={`${k}-cerr`} role="note">{I(Lock, 16)}<div><b>{CERRADA}</b> {cur === "rechazada" ? "El cliente ya ve el motivo del rechazo." : "No hay más transiciones."}</div></div>
      )}
    </section>
  )
}
