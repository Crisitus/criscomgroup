import { CircleAlert, Mail } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import { MAX_RESP, MIN_RESP, fDT } from "./libroCommon"
import { I } from "./libroParts"

const nFmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")

/** Respuesta: redaccion con contador y vista previa (abiertas) o texto en solo lectura. */
export function DetailRespuesta({ r, draft, error, busy, onDraft }: {
  r: Reclamacion; draft: string; error: string; busy: boolean; onDraft: (v: string) => void
}) {
  if (r.estado === "respondido" || r.estado === "archivado") {
    if (!r.respuesta) {
      return <section className="sec" aria-label="Respuesta"><h3>Respuesta</h3><p className="ro">Sin respuesta registrada.</p></section>
    }
    return (
      <section className="sec" aria-label="Respuesta enviada">
        <h3>Respuesta enviada</h3>
        <p className="ro" style={{ whiteSpace: "pre-wrap" }}>{r.respuesta}</p>
        {r.fecha_respuesta && (
          <p className="rom">{I(Mail, 14)}<span>Respondida el {fDT(r.fecha_respuesta)}{r.respondido_por != null ? ` · por el usuario n.º ${r.respondido_por}` : ""}</span></p>
        )}
      </section>
    )
  }
  const len = [...draft].length
  const corta = len > 0 && len < MIN_RESP
  const msg = error || (corta ? `La respuesta debe tener al menos ${MIN_RESP} caracteres (faltan ${MIN_RESP - len}).` : "")
  const tid = `ta-${r.id_reclamo}`
  return (
    <section className="sec" aria-label="Redactar respuesta">
      <label className="lbl" htmlFor={tid}>Respuesta al consumidor</label>
      <textarea id={tid} className={`ta${msg ? " bad" : ""}`} value={draft} maxLength={MAX_RESP} disabled={busy} aria-invalid={!!msg} aria-describedby={`tf-${r.id_reclamo}`}
        placeholder={`Escribe la respuesta que recibirá ${r.nombre} por correo`} onChange={e => onDraft(e.target.value)} />
      <div className="tf" id={`tf-${r.id_reclamo}`}>
        <span className="e" hidden={!msg} role={error ? "alert" : undefined}>{I(CircleAlert, 14)}<span>{msg}</span></span>
        <span className="c">{nFmt(len)} / {nFmt(MAX_RESP)} · mínimo {MIN_RESP}</span>
      </div>
      <details className="pv">
        <summary>{I(Mail, 16)}Vista previa del correo</summary>
        <div className="mail">
          <div className="mh"><span>Para</span><span>{r.email}</span><span>Asunto</span><span>Respuesta a su hoja de reclamación {r.codigo}</span></div>
          <div className="mb"><span>Estimado(a) {r.nombre}:</span><span>{draft || "[Aquí aparecerá el texto de tu respuesta]"}</span><span>Atentamente,</span></div>
          <div className="mf2">Criscom Group · Atención al cliente</div>
        </div>
        <p className="pvn">Maqueta del texto: el servidor compone y envía el correo real.</p>
      </details>
    </section>
  )
}
