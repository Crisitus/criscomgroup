import type { ReactNode } from "react"
import { CircleAlert, Copy, Plus, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import type { Code } from "./types"
import { I, SEP, fd, plural } from "./shared"
import { qtyOf, type CodeModel, type Pending } from "./usePending"
import { intOf } from "./shared"

const copy = async (codigo: string) => {
  try { await navigator.clipboard.writeText(codigo); toast.success("Código copiado") } catch { toast.error("No se pudo copiar el código") }
}

function Row({ children, cls = "" }: { children: ReactNode; cls?: string }) {
  return <div className={`cr${cls}`}>{children}</div>
}

export function CodesCard({ codes, pe, cm, onAdd }: { codes: Code[]; pe: Pending; cm: CodeModel; onAdd: () => void }) {
  const p = pe.p
  const bad = (v: string) => { const n = intOf(v); return Number.isNaN(n) || n < 1 }
  return (
    <section className="card" aria-labelledby="h-codigos">
      <div className="ch">
        <h2 id="h-codigos">Códigos de barras</h2>
        <button type="button" className="btn out sm" onClick={onAdd}>{I(Plus)}Agregar código</button>
      </div>
      {cm.usa ? (
        <>
          {codes.map(c => {
            const del = p.del.includes(c.id)
            const v = qtyOf(c, p)
            return (
              <Row key={c.id} cls={del ? " del" : ""}>
                <div style={{ minWidth: 0 }}>
                  <div className="c1">{c.codigo}</div>
                  <div className="c2">{del ? <span className="st warn">{I(CircleAlert, 14)}Se quitará al guardar</span> : `Ingresó ${fd(c.fecha_ingreso)}`}</div>
                </div>
                <input className={`in num${p.qty[c.id] !== undefined && Number(v) !== c.cantidad ? " dirty" : ""}`} inputMode="numeric" value={v} readOnly={del} aria-invalid={!del && bad(v)} aria-label={`Cantidad del código ${c.codigo}`} onChange={e => pe.setQty(c.id, e.target.value)} />
                <button type="button" className="ib" aria-label={`Copiar código ${c.codigo}`} onClick={() => void copy(c.codigo)}>{I(Copy, 18)}</button>
                {del
                  ? <button type="button" className="ib" aria-label={`Deshacer quitar código ${c.codigo}`} onClick={() => pe.toggleDel(c.id)}>{I(Undo2, 18)}</button>
                  : <button type="button" className="ib dz" aria-label={`Quitar código ${c.codigo}`} onClick={() => pe.toggleDel(c.id)}>{I(Trash2, 18)}</button>}
              </Row>
            )
          })}
          {p.tmp.map(t => (
            <Row key={t.codigo}>
              <div style={{ minWidth: 0 }}>
                <div className="c1">{t.codigo}</div>
                <div className="c2"><span className="st warn">{I(CircleAlert, 14)}Sin guardar</span></div>
              </div>
              <input className="in num dirty" inputMode="numeric" value={t.cantidad} aria-invalid={bad(t.cantidad)} aria-label={`Cantidad del código ${t.codigo}`} onChange={e => pe.setTmpQty(t.codigo, e.target.value)} />
              <button type="button" className="ib" aria-label={`Copiar código ${t.codigo}`} onClick={() => void copy(t.codigo)}>{I(Copy, 18)}</button>
              <button type="button" className="ib dz" aria-label={`Quitar código ${t.codigo}`} onClick={() => pe.dropTmp(t.codigo)}>{I(Trash2, 18)}</button>
            </Row>
          ))}
          <div className="tot"><span>{plural(cm.count, "código", "códigos")}{cm.badQty ? `${SEP}revisa las cantidades` : ""}</span><span><b>{cm.suma}</b> unidades</span></div>
        </>
      ) : <div className="empty">Este producto no usa códigos de barras.</div>}
    </section>
  )
}
