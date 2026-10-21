import { useEffect, useRef } from "react"
import { CircleAlert, Eye, Lock } from "lucide-react"
import type { EstadoEnsamble, SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { BLOQUEADOS, CERRADOS, ES, MAX_INT, MAX_NOTA, fD, pl } from "./sarCommon"
import { ETIQUETA_CAMPO, recotiza, type CampoErr, type Draft } from "./sarDraft"
import { I } from "./sarParts"
import { SarQuote } from "./SarQuote"

/** Al rechazar el texto es el MOTIVO (lo lee el cliente): no arrastra la nota de una cotizacion previa. */
const cambioDeEstado = (o: EstadoEnsamble, d: Draft, s: SolicitudEnsamble): Partial<Draft> => {
  const nota = s.cotizacion_nota ?? ""
  if (o === "rechazada" && d.dest !== "rechazada" && d.nota === nota) return { dest: o, nota: "" }
  if (o !== "rechazada" && d.dest === "rechazada") return { dest: o, nota }
  return { dest: o }
}
const fmtN = (n: number) => n.toLocaleString("en-US").replace(",", " ")
const FieldErr = ({ id, m }: { id: string; m: string }) => <span className="e" id={id}>{I(CircleAlert, 14)}<span>{m}</span></span>

function Resumen({ err }: { err: CampoErr }) {
  const ks = Object.keys(err) as (keyof CampoErr)[]
  const ref = useRef<HTMLDivElement>(null)
  const clave = ks.join()
  useEffect(() => { if (clave) ref.current?.scrollIntoView({ block: "nearest" }) }, [clave])
  if (!ks.length) return null
  return (
    <div className="bn er" role="alert" ref={ref}>
      {I(CircleAlert, 18)}
      <div className="tx"><b>No se guardó: revisa {pl(ks.length, "campo", "campos")}</b><ul>{ks.map(k => <li key={k}>{ETIQUETA_CAMPO[k]}: {err[k]}</li>)}</ul></div>
    </div>
  )
}

function Cerrada({ s }: { s: SolicitudEnsamble }) {
  return (
    <div className="frm">
      {s.estado === "rechazada" && s.cotizacion_nota && <div><p className="rok">Motivo del rechazo <span className="aud">Lo ve el cliente</span></p><p className="ro">{s.cotizacion_nota}</p></div>}
      {s.notas_admin && <div><p className="rok">Notas internas <span className="aud int">Solo equipo</span></p><p className="ro">{s.notas_admin}</p></div>}
      <p className="why">{I(Lock, 14)}<span><b>Estado cerrado:</b> no se reabre. Sin más cambios.</span></p>
    </div>
  )
}

/** Cotizacion y estado: selector de transiciones validas + monto/vigencia/entrega + notas (visible vs interna). */
export function SarManage({ s, d, err, trans, busy, onDraft }: {
  s: SolicitudEnsamble; d: Draft; err: CampoErr; trans: EstadoEnsamble[]; busy: boolean; onDraft: (p: Partial<Draft>) => void
}) {
  const k = s.id_solicitud
  const lock = BLOQUEADOS.includes(s.estado)
  const rej = d.dest === "rechazada"
  const vigOn = recotiza(d, s)
  const opts = [s.estado, ...trans.filter(t => t !== s.estado)]
  const bad = (c: keyof CampoErr) => (err[c] ? " bad" : "")
  const vh = vigOn ? `Válida hasta ${fD(new Date(Date.now() + (Number(d.vig) || 0) * 864e5 - 5 * 36e5).toISOString())}` : "Solo al cotizar o re-cotizar"
  return (
    <section className="sec">
      <div className="sech"><h3>Cotización y estado</h3></div>
      <SarQuote s={s} />
      {CERRADOS.includes(s.estado) ? <Cerrada s={s} /> : (
        <div className="frm">
          <div>
            <span className="lbl" id={`lb-est-${k}`}>Cambiar estado a</span>
            <div className="est" role="radiogroup" aria-labelledby={`lb-est-${k}`}>
              {opts.map(o => {
                const [x, Icon] = ES[o]
                return <button key={o} type="button" className="sc" role="radio" aria-checked={d.dest === o} disabled={busy} onClick={() => onDraft(cambioDeEstado(o, d, s))}>{I(Icon, 14)}{x}{o === s.estado ? <>{" "}<small>(actual)</small></> : null}</button>
              })}
            </div>
          </div>
          <Resumen err={err} />
          <div className="fl">
            <div className="fld">
              <label className="lbl" htmlFor={`mo-${k}`}>Monto cotizado</label>
              <div className="inw"><span>S/</span>
                <input className={`in pre${bad("monto")}`} id={`mo-${k}`} value={d.monto} inputMode="decimal" placeholder="0.00" readOnly={lock} disabled={busy} aria-invalid={!!err.monto} aria-describedby={`mh-${k}`} onChange={e => onDraft({ monto: e.target.value })} />
              </div>
              <div className="tf" id={`mh-${k}`}>{err.monto ? <FieldErr id={`em-${k}`} m={err.monto} /> : <span>IGV incluido</span>}</div>
            </div>
            <div className="fld">
              <label className="lbl" htmlFor={`vg-${k}`}>Vigencia (días)</label>
              <input className={`in${bad("vig")}`} id={`vg-${k}`} value={d.vig} inputMode="numeric" readOnly={!vigOn} disabled={busy} aria-invalid={!!err.vig} aria-describedby={`vh-${k}`} onChange={e => onDraft({ vig: e.target.value })} />
              <div className="tf" id={`vh-${k}`}>{err.vig ? <FieldErr id={`ev-${k}`} m={err.vig} /> : <span>{vh}</span>}</div>
            </div>
            <div className="fld">
              <label className="lbl" htmlFor={`en-${k}`}>Entrega estimada</label>
              <input className={`in${bad("entrega")}`} id={`en-${k}`} value={d.entrega} placeholder="dd/mm/aaaa" disabled={busy} aria-invalid={!!err.entrega} aria-describedby={`eh-${k}`} onChange={e => onDraft({ entrega: e.target.value })} />
              <div className="tf" id={`eh-${k}`}>{err.entrega ? <FieldErr id={`ee-${k}`} m={err.entrega} /> : <span>Fecha civil, opcional</span>}</div>
            </div>
          </div>
          {lock && <p className="why" style={{ marginTop: -6 }}>{I(Lock, 14)}<span><b>Monto bloqueado:</b> la solicitud está «{ES[s.estado][0].toLowerCase()}»: la cotización ya no se puede modificar.</span></p>}
          <div>
            <label className="lbl" htmlFor={`no-${k}`}>{rej ? "Motivo del rechazo" : "Nota para el cliente"} <span className="aud">{I(Eye, 12)}Lo ve el cliente</span></label>
            <textarea className={`ta${bad("nota")}`} id={`no-${k}`} value={d.nota} maxLength={MAX_NOTA} disabled={busy} aria-invalid={!!err.nota} aria-describedby={`nh-${k}`} onChange={e => onDraft({ nota: e.target.value })}
              placeholder={rej ? "Explica por qué se rechaza: el cliente leerá este motivo" : "Qué incluye la cotización, plazos y garantía"} />
            <div className="tf" id={`nh-${k}`}>{err.nota ? <FieldErr id={`en2-${k}`} m={err.nota} /> : <span />}<span className="c">{fmtN(d.nota.length)} / {fmtN(MAX_NOTA)}</span></div>
          </div>
          <div>
            <label className="lbl" htmlFor={`in-${k}`}>Notas internas <span className="aud int">{I(Lock, 12)}Solo equipo</span></label>
            <textarea className={`ta sm${bad("int")}`} id={`in-${k}`} value={d.int} maxLength={MAX_INT} disabled={busy} aria-describedby={`ih-${k}`} placeholder="Apuntes para el equipo" onChange={e => onDraft({ int: e.target.value })} />
            <div className="tf" id={`ih-${k}`}>{err.int ? <FieldErr id={`ei-${k}`} m={err.int} /> : <span>El cliente nunca las ve.</span>}<span className="c">{fmtN(d.int.length)} / {fmtN(MAX_INT)}</span></div>
          </div>
        </div>
      )}
    </section>
  )
}
