import { ChevronRight, Search, X } from "lucide-react"
import type { ReclamacionFila } from "../../services/libroReclamacionesService"
import { LIMITE, clean, tipoTxt } from "./libroCommon"
import { EstadoChip, I, PlazoChip } from "./libroParts"

function Row({ r, sel, mob, onPick }: { r: ReclamacionFila; sel: boolean; mob: boolean; onPick: (id: number) => void }) {
  return (
    <button type="button" className={`row${sel ? " sel" : ""}`} aria-current={sel ? "true" : undefined} onClick={() => onPick(r.id_reclamo)}>
      <span className="r1"><span className="nm">{r.nombre}</span><span className="tp">{tipoTxt(r.tipo)}</span><span className="cd">{r.codigo}</span></span>
      <span className="r2">{clean(r.extracto)}</span>
      <span className="r3"><PlazoChip r={r} /><EstadoChip e={r.estado} /></span>
      {mob && <span className="chv">{I(ChevronRight, 18)}</span>}
    </button>
  )
}

const Skeleton = ({ n }: { n: number }) => (
  <div className="rows" role="status" aria-label="Cargando hojas">
    {Array.from({ length: n }, (_, i) => (
      <div className="skr" key={i}><div className="sk" style={{ width: "55%" }} /><div className="sk" style={{ width: "80%" }} /><div className="sk" style={{ width: "35%", height: 18, borderRadius: 999 }} /></div>
    ))}
  </div>
)

export function LibroList({ rows, loading, mob, selId, page, total, limit, onPick, onPage, onClear }: {
  rows: ReclamacionFila[]; loading: boolean; mob: boolean; selId: number | null
  page: number; total: number; limit: number
  onPick: (id: number) => void; onPage: (p: number) => void; onClear: () => void
}) {
  const desde = (page - 1) * (limit || LIMITE) + 1
  const hasta = desde + rows.length - 1
  const hayPrev = page > 1
  const haySig = hasta < total
  const txt = loading ? "Cargando…" : rows.length ? `${desde}-${hasta} de ${total}` : "0 de 0"
  const pgBtn = (label: string, ok: boolean, go: () => void) => (
    <button type="button" className="btn out" aria-disabled={!ok} onClick={() => { if (ok) go() }}>{label}</button>
  )
  return (
    <section className="lp" aria-label="Hojas de reclamación">
      {loading ? <Skeleton n={mob ? 4 : 8} />
        : !rows.length ? (
          <div className="em">
            <span className="ico">{I(Search, 22)}</span>
            <h3>Ninguna hoja coincide con los filtros</h3>
            <p>Prueba con otro código, nombre o correo, o quita algún filtro.</p>
            <button type="button" className="btn out" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>
          </div>
        ) : (
          <div className="rows">
            {rows.map(r => <Row key={r.id_reclamo} r={r} sel={r.id_reclamo === selId} mob={mob} onPick={onPick} />)}
          </div>
        )}
      <div className="pag">
        <span aria-live="polite">{txt}</span>
        <div>{pgBtn("Anterior", hayPrev, () => onPage(page - 1))}{pgBtn("Siguiente", haySig, () => onPage(page + 1))}</div>
      </div>
    </section>
  )
}
