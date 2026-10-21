import { Archive, CircleDot, Lock, Send } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import { MIN_RESP, TRANS, fD } from "./libroCommon"
import { I, Spin } from "./libroParts"

type K = "proc" | "send" | "arc"
const NO_CHG = "Una hoja Archivada no admite cambios."

/** Acciones del estado: las no permitidas quedan deshabilitadas con el motivo escrito. */
export function DetailFooter({ r, len, busy, onProc, onSend, onArchive }: {
  r: Reclamacion; len: number; busy: K | null; onProc: () => void; onSend: () => void; onArchive: () => void
}) {
  const T = TRANS[r.estado] ?? []
  const falta = Math.max(0, MIN_RESP - len)
  const A: { k: K; label: string; icon: typeof Archive; ok: boolean; why: string; go: () => void }[] = [
    { k: "proc", label: "Pasar a En proceso", icon: CircleDot, ok: T.includes("en_proceso"), go: onProc,
      why: r.estado === "en_proceso" ? "La hoja ya está En proceso." : r.estado === "respondido" ? "Una hoja Respondida solo puede pasar a Archivado." : NO_CHG },
    { k: "send", label: "Enviar respuesta", icon: Send, ok: T.includes("respondido") && len >= MIN_RESP, go: onSend,
      why: r.estado === "archivado" ? NO_CHG : r.estado === "respondido" ? `La hoja ya fue respondida el ${r.fecha_respuesta ? fD(r.fecha_respuesta) : "—"}.` : `Escribe al menos ${MIN_RESP} caracteres (faltan ${falta}).` },
    { k: "arc", label: "Archivar", icon: Archive, ok: T.includes("archivado"), go: onArchive, why: "La hoja ya está Archivada." },
  ]
  const id = (k: K) => `why-${r.id_reclamo}-${k}`
  const btn = (a: (typeof A)[number]) => (
    <button key={a.k} type="button" className={`btn ${a.k === "send" ? "pri" : "out"}`} aria-disabled={!a.ok} disabled={!!busy}
      aria-describedby={a.ok ? undefined : id(a.k)} onClick={() => { if (a.ok && !busy) a.go() }}>
      {busy === a.k ? <Spin /> : I(a.icon, 16)}{busy === a.k && a.k === "send" ? "Enviando…" : a.label}
    </button>
  )
  return (
    <>
      {A.filter(a => !a.ok).map(a => (
        <p key={a.k} className="why" id={id(a.k)}>{I(Lock, 14)}<span><b>{a.label}:</b> <span>{a.why}</span></span></p>
      ))}
      <div className="dfb">{btn(A[2])}<span className="sp" />{btn(A[0])}{btn(A[1])}</div>
    </>
  )
}
