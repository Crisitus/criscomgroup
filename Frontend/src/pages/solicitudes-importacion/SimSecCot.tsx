import { Clock, Eye, Mail } from "lucide-react"
import type { SolicitudImportacion as Sol } from "../../services/solicitudImportacionService"
import { CERRADA, MAX_NOTA, describe, diasEntre, esBloqueada, esTerminal, fCivil, hoyLima } from "./simCommon"
import { Fld } from "./SimField"
import { editables, requiereMonto, requiereNota, type Draft, type Errs } from "./simForm"
import { I } from "./simParts"

const MOTIVO_MONTO = "Bloqueado desde «Aprobada»: el precio acordado no cambia."
const MOTIVO_COT = "La cotización ya no se puede modificar desde «Aprobada»."

function Vigencia({ r }: { r: Sol }) {
  if (r.estado === "rechazada") return null
  if (!r.valida_hasta) return <div className="vg" style={{ fontWeight: 500, color: "hsl(var(--muted-foreground))" }}>{I(Clock, 16)}<span>La vigencia empieza a contar cuando cotices.</span></div>
  if (r.vencida) return <div className="vg wn">{I(Clock, 16)}<span>Vencida desde {fCivil(r.valida_hasta)} <span className="hn" style={{ display: "inline" }}>· informativo, no bloquea nada</span></span></div>
  const n = diasEntre(hoyLima(), r.valida_hasta.slice(0, 10))
  return <div className="vg">{I(Clock, 16)}<span>Válida hasta {fCivil(r.valida_hasta)} · {n <= 0 ? "vence hoy" : n === 1 ? "queda 1 día" : `quedan ${n} días`}</span></div>
}

/** Cotizacion en dolares (monto, vigencia, entrega) y la nota que ve el cliente. */
export function SimSecCot({ r, k, d, errs, onPatch }: { r: Sol; k: string; d: Draft; errs: Errs; onPatch: (c: Partial<Draft>) => void }) {
  const ed = editables(r, d)
  const bq = esBloqueada(r.estado)
  const term = esTerminal(r.estado)
  const rot = d.estado === "rechazada" || r.estado === "rechazada"
  const reqM = requiereMonto(d.estado)
  const reqN = requiereNota(d.estado)
  const hMonto = ed.monto ? "" : MOTIVO_MONTO
  const hVig = ed.vig ? "1 a 90" : MOTIVO_COT
  const hEnt = ed.entrega ? "dd/mm/aaaa" : CERRADA
  const hNota = ed.nota ? "" : term ? CERRADA : MOTIVO_COT
  const label = rot ? "Motivo del rechazo" : "Nota de cotización"
  const aria = (name: string, e?: string, h?: string) => ({ "aria-describedby": describe(k, name, { err: e, hint: h }), "aria-invalid": e ? true : undefined })
  return (
    <section className="sec" aria-labelledby={`${k}-h3`}>
      <h3 id={`${k}-h3`}>{rot ? "Motivo del rechazo" : "Cotización en dólares"}</h3>
      {!rot && (
        <>
          <div className="g3f">
            <Fld k={k} name="monto" label="Monto cotizado" req={reqM} err={errs.monto} hint={hMonto} lock>
              <div className="mny"><span>US$</span><input id={`${k}-monto`} inputMode="decimal" placeholder="0.00" value={d.monto} disabled={!ed.monto} onChange={e => onPatch({ monto: e.target.value })} {...aria("monto", errs.monto, hMonto)} /></div>
            </Fld>
            <Fld k={k} name="vig" label="Vigencia (días)" err={errs.vig} hint={hVig} lock={bq}>
              <input id={`${k}-vig`} type="number" min={1} max={90} value={d.vig} disabled={!ed.vig} onChange={e => onPatch({ vig: e.target.value })} {...aria("vig", errs.vig, hVig)} />
            </Fld>
            <Fld k={k} name="entrega" label="Entrega estimada" err={errs.entrega} hint={hEnt} lock={term}>
              <input id={`${k}-entrega`} inputMode="numeric" placeholder="dd/mm/aaaa" value={d.entrega} disabled={!ed.entrega} onChange={e => onPatch({ entrega: e.target.value })} {...aria("entrega", errs.entrega, hEnt)} />
            </Fld>
          </div>
          <Vigencia r={r} />
          {!bq && (
            <div className="hn" style={{ marginTop: 8 }}>{I(Mail, 14)}<span>Al guardar como cotizada o al cambiar el monto se envía un correo automático al cliente con el monto, la vigencia y tu nota.{import.meta.env.DEV && <> <b>Modo de prueba: el correo no sale.</b></>}</span></div>
          )}
        </>
      )}
      <div className="nt cl">
        <div className="fx"><span className="vt cl">{I(Eye, 14)}Lo ve el cliente</span><span className="cnt">{[...d.nota].length} / {MAX_NOTA}</span></div>
        <Fld k={k} name="nota" label={label} req={reqN} err={errs.nota} hint={hNota} lock>
          <textarea id={`${k}-nota`} rows={3} maxLength={MAX_NOTA} value={d.nota} disabled={!ed.nota} onChange={e => onPatch({ nota: e.target.value })}
            placeholder={rot ? "Explica al cliente por qué no se puede importar" : "Precio, qué incluye y plazos"} {...aria("nota", errs.nota, hNota)} />
        </Fld>
      </div>
    </section>
  )
}
