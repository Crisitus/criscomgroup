import { ArrowRight, DollarSign, Inbox, Lock, Pencil, Ship, type LucideIcon } from "lucide-react"
import type { HistorialSolicitud, SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { CERRADA, ESTADO, MAX_NOTAS, camposTxt, describe, esTerminal, fDT, usd } from "./simCommon"
import { Fld } from "./SimField"
import type { Draft, Errs } from "./simForm"
import { I } from "./simParts"

const nom = (e: string | null) => (e && e in ESTADO ? ESTADO[e as keyof typeof ESTADO].l : (e ?? ""))

function Ev({ e }: { e: HistorialSolicitud }) {
  let ico: LucideIcon = ArrowRight
  let t: string
  if (e.accion === "estado") {
    if (e.de == null) { ico = Inbox; t = "Solicitud registrada por el cliente en la web" } else t = `Cambió el estado de ${nom(e.de)} a ${nom(e.a)}`
  } else if (e.accion === "cotizacion") { ico = DollarSign; t = `Monto cotizado: ${e.monto_anterior == null ? "sin monto" : usd(e.monto_anterior)} → ${usd(e.monto_nuevo)}` }
  else if (e.accion === "datos") { ico = Pencil; t = `Actualizó ${camposTxt(e.nota)}` }
  else { ico = Ship; t = `Convirtió la solicitud en la ${e.nota ?? "importación"}` }
  const cliente = e.accion === "cotizacion" || (e.accion === "estado" && e.a === "rechazada" && !!e.nota)
  return (
    <div className="ev">
      <span className="eic">{I(ico, 14)}</span><span className="et">{t}</span>
      <span className="eh">{e.creado ? fDT(e.creado) : ""}</span>
      <span className="ea">{e.usuario_id == null ? "Cliente (web)" : `Usuario #${e.usuario_id}`}</span>
      {cliente && e.nota && <span className="en"><b>Nota al cliente:</b> {e.nota}</span>}
    </div>
  )
}

/** Notas internas: nunca las ve el cliente; otro fondo y borde para no confundirlas con la nota de cotizacion. */
export function SimSecNotas({ r, k, d, errs, onPatch }: { r: Sol; k: string; d: Draft; errs: Errs; onPatch: (c: Partial<Draft>) => void }) {
  const term = esTerminal(r.estado)
  const hint = term ? CERRADA : "El cliente nunca las ve."
  return (
    <section className="sec" aria-labelledby={`${k}-h4`}>
      <h3 id={`${k}-h4`}>Notas internas</h3>
      <div className="nt in" style={{ marginTop: 0 }}>
        <div className="fx"><span className="vt in">{I(Lock, 14)}Solo el equipo</span><span className="cnt">{[...d.notas].length} / {MAX_NOTAS}</span></div>
        <Fld k={k} name="notas" label="Notas internas" err={errs.notas} hint={hint} lock>
          <textarea id={`${k}-notas`} rows={2} maxLength={MAX_NOTAS} value={d.notas} disabled={term} onChange={e => onPatch({ notas: e.target.value })}
            placeholder="Proveedor, guía, disponibilidad…" aria-describedby={describe(k, "notas", { hint, err: errs.notas })} aria-invalid={errs.notas ? true : undefined} />
        </Fld>
      </div>
    </section>
  )
}

export function SimSecHist({ r, k }: { r: Sol; k: string }) {
  const h = r.historial ?? []
  return (
    <section className="sec" aria-labelledby={`${k}-h5`}>
      <h3 id={`${k}-h5`}>Historial <span className="tot">{h.length} {h.length === 1 ? "evento" : "eventos"}</span></h3>
      {h.map(e => <Ev key={e.id_historial} e={e} />)}
    </section>
  )
}
