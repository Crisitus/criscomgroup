import type { ReactNode } from "react"
import { FileText, Info, User, type LucideIcon } from "lucide-react"
import type { HistorialSolicitud } from "../../services/solicitudImportacionService"
import type { EstadoEnsamble } from "../../services/solicitudEnsambleService"
import { ES, fDT, money } from "./sarCommon"
import { I } from "./sarParts"

const CAMPO: Record<string, string> = {
  cotizacion_nota: "nota al cliente", fecha_entrega_estimada: "fecha de entrega estimada", notas_admin: "notas internas", cotizacion_monto: "monto", vigencia_dias: "vigencia",
}
const est = (e: string | null) => (e && e in ES ? ES[e as EstadoEnsamble][0] : e ?? "—")

/** Las 2-3 filas que el backend crea por una accion (mismo instante) se muestran como UN evento. */
function agrupar(h: HistorialSolicitud[]): HistorialSolicitud[][] {
  const m = new Map<string, HistorialSolicitud[]>()
  h.forEach(r => { const k = r.creado ?? `id-${r.id_historial}`; m.set(k, [...(m.get(k) ?? []), r]) })
  return [...m.values()]
}

function Evento({ g }: { g: HistorialSolicitud[] }) {
  const por = (a: HistorialSolicitud["accion"]) => g.find(r => r.accion === a)
  const e = por("estado"), k = por("cotizacion"), d = por("datos"), cv = por("convertir")
  const u = g[0].usuario_id
  const cam = d?.nota ? d.nota.replace(/^Campos:\s*/, "").split(/,\s*/).map(x => CAMPO[x] ?? x).join(", ") : ""
  let titulo: string, icon: LucideIcon = Info
  const lineas: ReactNode[] = []
  if (cv) { titulo = "Convertida en cotización profesional"; icon = FileText; lineas.push(<b key="c">{cv.nota}</b>) }
  else if (k) {
    titulo = "Cotización registrada"; icon = FileText
    if (e?.de) lineas.push(`Estado: ${est(e.de)} → ${est(e.a)}`)
    lineas.push(<span key="m">Monto <b>{money(k.monto_nuevo ?? 0)}</b> · IGV incluido</span>)
    if (k.nota) lineas.push(`Nota al cliente: «${k.nota}»`)
    if (cam) lineas.push(`También se guardó: ${cam}.`)
  } else if (e && e.de === null) { titulo = "Solicitud registrada por el cliente"; icon = User }
  else if (e) {
    titulo = `Pasó de ${est(e.de)} a ${est(e.a)}`; icon = ES[e.a as EstadoEnsamble]?.[1] ?? Info
    if (e.nota) lineas.push(`${e.a === "rechazada" ? "Motivo visible al cliente" : "Nota"}: «${e.nota}»`)
    if (cam) lineas.push(`También se guardó: ${cam}.`)
  } else { titulo = "Datos actualizados"; lineas.push(`Se guardó: ${cam || "otros datos"}.`) }
  return (
    <li>
      <span className={`dot${u == null ? " cl" : ""}`}>{I(icon, 14)}</span>
      <div>
        <div className="t">{titulo}</div>
        <div className="w">{g[0].creado ? fDT(g[0].creado) : ""} · {u == null ? "Cliente" : `Equipo · usuario n.º ${u}`}</div>
        {lineas.length > 0 && <div className="d">{lineas.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</div>}
      </div>
    </li>
  )
}

export function SarHistory({ h }: { h: HistorialSolicitud[] }) {
  return (
    <section className="sec">
      <div className="sech"><h3>Historial</h3><small>Más reciente primero · hora de Lima</small></div>
      <ol className="tl">{agrupar(h).map(g => <Evento key={g[0].id_historial} g={g} />)}</ol>
    </section>
  )
}
