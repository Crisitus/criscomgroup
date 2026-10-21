import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import type { SolicitudImportacion } from "../../services/solicitudImportacionService"
import { LIMITE, SEP, TIPO, fD, usd } from "./simCommon"
import { EstadoChip, I, UrgChip, VencidaChip } from "./simParts"

function Row({ r, sel, onPick }: { r: SolicitudImportacion; sel: boolean; onPick: (id: number) => void }) {
  return (
    <button type="button" className={`row${sel ? " sel" : ""}`} aria-current={sel ? "true" : undefined} onClick={() => onPick(r.id_solicitud)}>
      <span className="r1"><span className="nm">{r.nombre_solicitante}</span><span className="ml2">{r.email_solicitante}</span><span className="fe">{r.created_at ? fD(r.created_at) : ""}</span></span>
      <span className="r2"><span className="pn">{[r.nombre_producto, TIPO[r.tipo_producto] ?? r.tipo_producto, r.marca].filter(Boolean).join(SEP)}</span><span className="cd">{r.codigo_seguimiento}</span></span>
      <span className="r3"><EstadoChip e={r.estado} /><UrgChip u={r.nivel_urgencia} />{r.vencida && <VencidaChip />}<span className="mo"><i>×{r.cantidad}</i>{usd(r.cotizacion_monto)}</span></span>
      {I(ChevronRight, 16)}
    </button>
  )
}

const Skeleton = ({ n }: { n: number }) => (
  <div className="rows" role="status" aria-label="Cargando solicitudes">
    {Array.from({ length: n }, (_, i) => (
      <div className="skr" key={i}><span className="sk" style={{ width: "55%", height: 14 }} /><span className="sk" style={{ width: "82%", height: 12 }} /><span className="sk" style={{ width: "42%", height: 20 }} /></div>
    ))}
  </div>
)

export function SimList({ rows, loading, mob, selId, page, total, limit, onPick, onPage, onClear }: {
  rows: SolicitudImportacion[]; loading: boolean; mob: boolean; selId: number | null
  page: number; total: number; limit: number
  onPick: (id: number) => void; onPage: (p: number) => void; onClear: () => void
}) {
  const lim = limit || LIMITE
  const desde = (page - 1) * lim + 1
  const hasta = desde + rows.length - 1
  const paginas = Math.max(1, Math.ceil(total / lim))
  const txt = loading ? "Cargando…" : rows.length ? `Mostrando ${desde}-${hasta} de ${total}` : "Mostrando 0 de 0"
  const pgBtn = (label: string, ok: boolean, go: () => void, left: boolean) => (
    <button type="button" className="btn out" aria-disabled={!ok} aria-label={left ? "Página anterior" : "Página siguiente"} onClick={() => { if (ok) go() }}>
      {left ? I(ChevronLeft, 16) : null}{label}{left ? null : I(ChevronRight, 16)}
    </button>
  )
  return (
    <section className="lp" aria-label="Bandeja de solicitudes" aria-busy={loading}>
      {loading ? <Skeleton n={mob ? 4 : 9} />
        : !rows.length ? (
          <div className="es">
            <span className="eic2">{I(Search, 22)}</span>
            <h2>Ninguna solicitud coincide</h2>
            <p>Prueba con otro código, cliente, correo o producto, o quita algún filtro.</p>
            <button type="button" className="btn out" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>
          </div>
        ) : (
          <div className="rows">{rows.map(r => <Row key={r.id_solicitud} r={r} sel={r.id_solicitud === selId} onPick={onPick} />)}</div>
        )}
      <div className="pag">
        <span aria-live="polite">{txt}</span>
        <div>{pgBtn("Anterior", page > 1, () => onPage(page - 1), true)}<span>Página {page} de {paginas}</span>{pgBtn("Siguiente", hasta < total, () => onPage(page + 1), false)}</div>
      </div>
    </section>
  )
}
