import { useEffect, useMemo, useState } from "react"
import { ChevronRight, CircleAlert, Package, RefreshCw, SearchX } from "lucide-react"
import { PurchaseFilters, EMPTY_F, type EstF, type Filters } from "./PurchaseFilters"
import { Pager } from "./Pager"
import { EN, EstChip, I, fd, money, norm, pl, type Purchase, type Supplier } from "./purchasesShared"

const PAGE = 10
type Status = "load" | "ok" | "error"

function Empty({ icon, title, text, bad, children }: { icon: React.ReactNode; title: string; text: string; bad?: boolean; children?: React.ReactNode }) {
  return (
    <div className="tcard"><div className={`empty${bad ? " bad" : ""}`} role={bad ? "alert" : "status"}>
      <div className="ei">{icon}</div><h2>{title}</h2><p>{text}</p>{children}
    </div></div>
  )
}

export function PurchaseList({ purchases, suppliers, status, mob, onOpen, onRetry, hl }: {
  purchases: Purchase[]; suppliers: Supplier[]; status: Status; mob: boolean; hl: number | null
  onOpen: (id: number) => void; onRetry: () => void
}) {
  const [f, setF] = useState<Filters>(EMPTY_F)
  const [page, setPage] = useState(1)
  const [fil, setFil] = useState(false)
  const set = (p: Partial<Filters>) => { setF(c => ({ ...c, ...p })); setPage(1) }

  const base = useMemo(() => purchases.filter(c => {
    const q = norm(f.q.trim())
    if (q && !norm(`${c.numero} ${c.documento || ""} ${c.proveedor?.razon_social || ""}`).includes(q)) return false
    if (f.prov && String(c.proveedor_id) !== f.prov) return false
    const d = c.fecha.slice(0, 10)
    return !(f.from && d < f.from) && !(f.to && d > f.to)
  }), [purchases, f.q, f.prov, f.from, f.to])
  const counts: Record<EstF, number> = { todas: base.length, recibida: base.filter(c => c.estado === "recibida").length, anulada: base.filter(c => c.estado === "anulada").length }
  const list = f.est === "todas" ? base : base.filter(c => c.estado === f.est)
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const shown = list.slice((page - 1) * PAGE, page * PAGE)
  const off = status !== "ok"

  const sk = (w: string) => <span className="skb" style={{ width: w }} />
  const foot = (
    <div className={mob ? "mpg" : "pgf"}>
      <span className="num">Mostrando {list.length ? `${(page - 1) * PAGE + 1}${EN}${(page - 1) * PAGE + shown.length}` : "0"} de {list.length}</span>
      {pages > 1 && <div className="rt"><Pager page={page} pages={pages} onPage={setPage} /></div>}
    </div>
  )
  let body: React.ReactNode
  if (status === "error") body = (
    <Empty bad icon={I(CircleAlert, 22)} title="No se pudieron cargar las compras" text="Revisa tu conexión e inténtalo de nuevo.">
      <button type="button" className="btn out" onClick={onRetry}>{I(RefreshCw)}Reintentar</button>
    </Empty>
  )
  else if (status === "load") body = mob
    ? <div className="mlist" aria-busy="true">{[0, 1, 2].map(i => <div className="mc" key={i}>{sk("60%")}{sk("80%")}{sk("45%")}</div>)}</div>
    : <div className="tcard" aria-busy="true">{[0, 1, 2, 3, 4].map(i => <div key={i} style={{ display: "flex", gap: 24, alignItems: "center", height: 52, padding: "0 16px", borderTop: i ? "1px solid hsl(var(--border))" : 0 }}>{sk("120px")}{sk("30%")}{sk("90px")}{sk("80px")}</div>)}<div className="pgf"><span className="mut">Cargando compras…</span></div></div>
  else if (!purchases.length) body = <Empty icon={I(Package, 22)} title="Aún no hay compras" text="Cuando recibas una compra aparecerá aquí con su proveedor, documento y líneas." />
  else if (!list.length) body = (
    <Empty icon={I(SearchX, 22)} title="Ninguna compra coincide" text="Prueba con otro número, documento o proveedor, o quita los filtros.">
      <button type="button" className="btn out" onClick={() => set(EMPTY_F)}>Limpiar filtros</button>
    </Empty>
  )
  else if (mob) body = (
    <>
      <div className="mlist">{shown.map(c => (
        <article className="mc" key={c.id_compra} tabIndex={0} aria-label={`Abrir ${c.numero}`} onClick={() => onOpen(c.id_compra)} onKeyDown={e => { if (e.key === "Enter") onOpen(c.id_compra) }}>
          <div className="m1"><span className="a num">{c.numero}</span><b className="num">{money(c.total, c.moneda)}</b></div>
          <div className="m2"><div className="nm">{c.proveedor?.razon_social}</div><span className="num" style={{ whiteSpace: "nowrap" }}>{fd(c.fecha)}</span></div>
          <div className="m3">{c.documento && <span className="tag num">{c.documento}</span>}<span className="tag">{pl(c.detalles.length, "línea", "líneas")}</span><EstChip e={c.estado} /></div>
          <button type="button" className="btn out blk" aria-label={`Ver detalle de ${c.numero}`}>Ver detalle{I(ChevronRight)}</button>
        </article>
      ))}</div>{foot}
    </>
  )
  else body = (
    <div className="tcard">
      <table className="tb">
        <colgroup><col style={{ width: "15%" }} /><col /><col style={{ width: "14%" }} /><col style={{ width: 64 }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: 112 }} /></colgroup>
        <thead><tr><th scope="col">Compra</th><th scope="col">Proveedor</th><th scope="col">Documento</th><th scope="col" className="r">Líneas</th><th scope="col">Estado</th><th scope="col" className="r">Total</th><th scope="col" className="r"><span className="pgx">Detalle</span></th></tr></thead>
        <tbody>{shown.map(c => (
          <tr key={c.id_compra} className={`rw${hl === c.id_compra ? " hl" : ""}`} onClick={() => onOpen(c.id_compra)}>
            <td><div className="stk"><span className="a num">{c.numero}</span><span className="sub num">{fd(c.fecha)}</span></div></td>
            <td><div className="stk"><span className="nm">{c.proveedor?.razon_social}</span><span className="sub num">{c.proveedor?.ruc_documento ? `RUC ${c.proveedor.ruc_documento}` : "Sin documento"}</span></div></td>
            <td className="num">{c.documento || <span className="mut">Sin documento</span>}</td>
            <td className="r num">{c.detalles.length}</td><td><EstChip e={c.estado} /></td>
            <td className="r"><span className="num" style={{ fontWeight: 600 }}>{money(c.total, c.moneda)}</span></td>
            <td><div className="ac"><button type="button" className="btn out sm" aria-label={`Ver detalle de ${c.numero}`} onClick={e => { e.stopPropagation(); onOpen(c.id_compra) }}>Ver{I(ChevronRight)}</button></div></td>
          </tr>
        ))}</tbody>
      </table>{foot}
    </div>
  )
  return (
    <>
      <PurchaseFilters f={f} set={set} suppliers={suppliers} counts={counts} mob={mob} open={fil} onToggle={() => setFil(o => !o)} off={off} />
      {body}
    </>
  )
}
