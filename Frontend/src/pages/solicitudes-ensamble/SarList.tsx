import { ChevronRight, Search, X } from "lucide-react"
import { MODO_ENSAMBLE_LABELS, type SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { LIMITE, SEP, fDT, resumenPedido } from "./sarCommon"
import { EstadoChip, I, VigChip } from "./sarParts"

function Row({ s, sel, mob, onPick }: { s: SolicitudEnsamble; sel: boolean; mob: boolean; onPick: (id: number) => void }) {
  return (
    <button type="button" className={`row${sel ? " sel" : ""}`} aria-current={sel ? "true" : undefined} onClick={() => onPick(s.id_solicitud)}>
      <span className="r1"><span className="nm">{s.nombre_solicitante}</span><span className="tp">{MODO_ENSAMBLE_LABELS[s.modo]}</span><span className="dt">{s.created_at ? fDT(s.created_at) : ""}</span></span>
      <span className="r2">{[s.telefono_solicitante, s.ciudad, resumenPedido(s)].join(SEP)}</span>
      <span className="r3"><EstadoChip e={s.estado} /><VigChip s={s} /><span className="cd">{s.codigo_seguimiento}</span></span>
      {mob && <span className="chv">{I(ChevronRight, 18)}</span>}
    </button>
  )
}

const Skeleton = ({ n }: { n: number }) => (
  <div className="rows" role="status" aria-label="Cargando solicitudes">
    {Array.from({ length: n }, (_, i) => (
      <div className="skr" key={i}><div className="sk" style={{ width: "55%" }} /><div className="sk" style={{ width: "80%" }} /><div className="sk" style={{ width: "35%", height: 18, borderRadius: 999 }} /></div>
    ))}
  </div>
)

export function SarList({ rows, loading, mob, selId, page, total, limit, onPick, onPage, onClear }: {
  rows: SolicitudEnsamble[]; loading: boolean; mob: boolean; selId: number | null
  page: number; total: number; limit: number
  onPick: (id: number) => void; onPage: (p: number) => void; onClear: () => void
}) {
  const desde = (page - 1) * (limit || LIMITE) + 1
  const hasta = desde + rows.length - 1
  const txt = loading ? "Cargando…" : rows.length ? `${desde}-${hasta} de ${total}` : "0 de 0"
  const pgBtn = (label: string, ok: boolean, go: () => void) => (
    <button type="button" className="btn out" aria-disabled={!ok} onClick={() => { if (ok) go() }}>{label}</button>
  )
  return (
    <section className="lp" aria-label="Solicitudes de armado">
      {loading ? <Skeleton n={mob ? 4 : 8} />
        : !rows.length ? (
          <div className="em">
            <span className="ico">{I(Search, 22)}</span>
            <h3>Ninguna solicitud coincide con los filtros</h3>
            <p>Prueba con otro código, cliente, correo, teléfono o ciudad, o quita algún filtro.</p>
            <button type="button" className="btn out" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>
          </div>
        ) : (
          <div className="rows">
            {rows.map(r => <Row key={r.id_solicitud} s={r} sel={r.id_solicitud === selId} mob={mob} onPick={onPick} />)}
          </div>
        )}
      <div className="pag">
        <span aria-live="polite">{txt}</span>
        <div>{pgBtn("Anterior", page > 1, () => onPage(page - 1))}{pgBtn("Siguiente", hasta < total, () => onPage(page + 1))}</div>
      </div>
    </section>
  )
}
