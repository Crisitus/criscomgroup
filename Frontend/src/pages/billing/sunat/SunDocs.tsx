import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import type { DocumentoSunat } from "../../../services/facturacionService"
import { BlockError, EmptyDocs, NoResults } from "./SunBlocks"
import { I, StateChip } from "./sunShared"
import { FILTROS, TIPO, fmtD, fmtT, numeroDoc } from "./sunCommon"
import { PAGE_SIZE, type useSunDocs } from "./useSunDocs"

type Docs = ReturnType<typeof useSunDocs>

const Response = ({ d }: { d: DocumentoSunat }) => (
  <div className="stk">
    {d.codigo_respuesta !== null ? <span className="m"><b className="num">{d.codigo_respuesta}</b> · {d.mensaje_respuesta}</span> : <span className="m mut">Sin respuesta de SUNAT todavía</span>}
    <span className="susub num">{d.intentos} {d.intentos === 1 ? "intento" : "intentos"}</span>
  </div>
)

function Row({ d, docs }: { d: DocumentoSunat; docs: Docs }) {
  const op = docs.open === d.id_documento
  const num = numeroDoc(d)
  return (
    <>
      <tr className={op ? "hl" : ""}>
        <td><div className="stk"><span className="a num">{num}</span><span className="susub">{TIPO[d.tipo] ?? "Comprobante"}</span></div></td>
        <td><StateChip e={d.estado} /></td>
        <td><Response d={d} /></td>
        <td><div className="stk"><span className="m num">{fmtD(d.creado_en)}</span><span className="susub num">{fmtT(d.creado_en)}</span></div></td>
        <td>{d.codigo_respuesta !== null && <button type="button" className="ib" aria-expanded={op} aria-label={`Respuesta de SUNAT de ${num}`} onClick={() => docs.setOpen(op ? null : d.id_documento)}>{I(op ? ChevronUp : ChevronDown)}</button>}</td>
      </tr>
      {op && d.codigo_respuesta !== null && (
        <tr className="dt"><td colSpan={5}><dl className="dd">
          <dt>Código SUNAT</dt><dd className="num">{d.codigo_respuesta}</dd>
          <dt>Mensaje</dt><dd>{d.mensaje_respuesta}</dd>
          <dt>Intentos</dt><dd className="num">{d.intentos}</dd>
          <dt>Creado</dt><dd className="num">{fmtD(d.creado_en)} · {fmtT(d.creado_en)} (hora de Lima)</dd>
        </dl></td></tr>
      )}
    </>
  )
}

const Card = ({ d }: { d: DocumentoSunat }) => (
  <article className="mc">
    <div className="m1"><span className="a num">{numeroDoc(d)}</span><StateChip e={d.estado} /></div>
    <div className="m2"><span>{TIPO[d.tipo] ?? "Comprobante"}</span><span className="num">{fmtD(d.creado_en)} · {fmtT(d.creado_en)}</span></div>
    <div className="m3">{d.codigo_respuesta !== null ? <><b className="num">{d.codigo_respuesta}</b> · {d.mensaje_respuesta}</> : <span className="mut">Sin respuesta de SUNAT todavía</span>}</div>
    <div className="susub num">{d.intentos} {d.intentos === 1 ? "intento" : "intentos"}</div>
  </article>
)

function Pager({ docs }: { docs: Docs }) {
  const pages = Math.max(1, Math.ceil(docs.total / PAGE_SIZE))
  const from = (docs.page - 1) * PAGE_SIZE + 1
  const start = Math.max(1, Math.min(docs.page - 2, pages - 4))
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)
  const prevOff = docs.page <= 1, nextOff = docs.page >= pages
  return (
    <div className="pgf">
      <span>Mostrando <b className="num">{docs.rows.length ? `${from}–${from + docs.rows.length - 1}` : "0"}</b> de <b className="num">{docs.total}</b></span>
      <div className="rt">
        <button type="button" className="pb" aria-disabled={prevOff || undefined} aria-label="Página anterior" onClick={() => { if (!prevOff) docs.goPage(docs.page - 1) }}>{I(ChevronLeft)}</button>
        {nums.map(n => <button key={n} type="button" className="pb num" aria-current={n === docs.page ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => docs.goPage(n)}>{n}</button>)}
        <button type="button" className="pb" aria-disabled={nextOff || undefined} aria-label="Página siguiente" onClick={() => { if (!nextOff) docs.goPage(docs.page + 1) }}>{I(ChevronRight)}</button>
      </div>
    </div>
  )
}

export function SunDocs({ docs, mob }: { docs: Docs; mob: boolean }) {
  const word = FILTROS.find(f => f[1] === docs.estado)?.[0] ?? "Todos"
  if (docs.status === "loading") return (
    <section className="card" aria-busy="true">
      <div className="dh"><span className="skb" style={{ width: 180, height: 20 }} /></div>
      <div className="chips">{FILTROS.map(f => <span key={f[0]} className="skb" style={{ width: 84, height: 44, borderRadius: 999 }} />)}</div>
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="skr"><span className="skb" style={{ width: 120 }} /><span className="skb" style={{ width: 90 }} /><span className="skb" style={{ flex: 1 }} /><span className="skb" style={{ width: 90 }} /></div>)}
    </section>
  )
  if (docs.status !== "ok") return <BlockError status={docs.status} what="los documentos recientes" message={docs.message} onRetry={() => void docs.reload()} />
  const empty = docs.rows.length === 0
  return (
    <section className="card" aria-label="Documentos recientes">
      <div className="dh">
        <h2>Documentos recientes</h2>
        <span className="tot">Total: <b className="num">{docs.total}</b> {docs.total === 1 ? "comprobante" : "comprobantes"}{docs.estado ? ` en estado ${word}` : ""}</span>
      </div>
      {(docs.estado || !empty) && (
        <div className="chips" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(([label, value]) => <button key={label} type="button" className="chp" aria-pressed={value === docs.estado} onClick={() => docs.pickEstado(value)}>{label}</button>)}
        </div>
      )}
      {empty ? (docs.estado ? <NoResults word={word} onAll={() => docs.pickEstado(undefined)} /> : <EmptyDocs />)
        : mob ? <div className="mlist">{docs.rows.map(d => <Card key={d.id_documento} d={d} />)}</div>
        : (
          <table className="sutb">
            <colgroup><col style={{ width: 142 }} /><col style={{ width: 124 }} /><col /><col style={{ width: 104 }} /><col style={{ width: 48 }} /></colgroup>
            <thead><tr><th scope="col">Número</th><th scope="col">Estado</th><th scope="col">Respuesta de SUNAT</th><th scope="col">Fecha (Lima)</th><th scope="col"><span className="sr">Detalle</span></th></tr></thead>
            <tbody>{docs.rows.map(d => <Row key={d.id_documento} d={d} docs={docs} />)}</tbody>
          </table>
        )}
      {!empty && <Pager docs={docs} />}
    </section>
  )
}
