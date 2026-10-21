import type { WebPayment } from "../../../services/paymentGatewayService"
import type { PagPaymentsCtl, PosPay } from "./usePagPayments"
import { Btn, I, Stat } from "./pagCommon"
import { CANAL, PROVEEDOR, SEP, fdate, money } from "./pagData"
import { EmptyBlk, ErrCard, SkCard } from "./PagStates"
import { Lock, RefreshCw } from "lucide-react"

const LIMIT = 5
const amount = (cents: number, cur?: string) => (!cur || cur === "PEN" ? money(cents / 100) : `${cur} ${(cents / 100).toFixed(2)}`)

function WebRows({ rows, mob }: { rows: WebPayment[]; mob: boolean }) {
  if (mob) return <>{rows.map(p => (
    <div className="pa-pc" key={p.id_pago}>
      <b className="pa-mono">{p.pedido?.numero_pedido ?? `#${p.id_pago}`}</b><b className="pa-num">{amount(p.monto_centimos, p.moneda)}</b>
      <div className="pa-x"><span className="pa-tag">{PROVEEDOR[p.proveedor] ?? p.proveedor}</span><span className="pa-num">{fdate(p.creado_en)}</span></div>
      <div className="pa-x"><Stat k={p.estado} /></div>
    </div>
  ))}</>
  return <>
    <div className="pa-pr pa-pw pa-th"><span>Pedido</span><span>Proveedor</span><span>Fecha</span><span className="pa-r">Importe</span><span>Estado</span></div>
    {rows.map(p => (
      <div className="pa-pr pa-pw" key={p.id_pago}>
        <span className="pa-mono">{p.pedido?.numero_pedido ?? `#${p.id_pago}`}</span><span><span className="pa-tag">{PROVEEDOR[p.proveedor] ?? p.proveedor}</span></span>
        <span className="pa-num">{fdate(p.creado_en)}</span><span className="pa-r pa-num">{amount(p.monto_centimos, p.moneda)}</span><Stat k={p.estado} />
      </div>
    ))}
  </>
}

function FisRows({ rows, mob }: { rows: PosPay[]; mob: boolean }) {
  const venta = (p: PosPay) => p.venta?.venta_id ?? p.venta_id ?? "—"
  if (mob) return <>{rows.map(p => (
    <div className="pa-pc" key={p.id_pago_pos}>
      <b>Venta {venta(p)}</b><b className="pa-num">{amount(p.monto_centimos, p.moneda)}</b>
      <div className="pa-x"><span className="pa-tag">{CANAL[p.canal] ?? p.canal}</span><span className="pa-mono">{p.numero_operacion}</span></div>
      <div className="pa-x"><span className="pa-num">{fdate(p.creado_en)}</span></div>
      <div className="pa-x"><Stat k={p.estado} /></div>
    </div>
  ))}</>
  return <>
    <div className="pa-pr pa-pf pa-th"><span>Venta · operación</span><span>Canal</span><span>Fecha</span><span className="pa-r">Importe</span><span>Estado</span></div>
    {rows.map(p => (
      <div className="pa-pr pa-pf" key={p.id_pago_pos}>
        <span><b>Venta {venta(p)}</b> <span className="pa-mono pa-mut">{p.numero_operacion}</span></span><span><span className="pa-tag">{CANAL[p.canal] ?? p.canal}</span></span>
        <span className="pa-num">{fdate(p.creado_en)}</span><span className="pa-r pa-num">{amount(p.monto_centimos, p.moneda)}</span><Stat k={p.estado} />
      </div>
    ))}
  </>
}

function Failed({ status, code, message, onRetry }: { status: string; code: number | null; message: string; onRetry: () => void }) {
  const forb = status === "forbidden"
  return (
    <div className="pa-bst pa-bad" role="alert">
      <span className="pa-bi2">{I(forb ? Lock : RefreshCw, 22)}</span>
      <div>
        <h3>{forb ? "Sin permiso para ver estos pagos" : `No se pudieron cargar los pagos${code ? ` (error ${code})` : ""}`}</h3>
        <p>{message} Esto no es un vacío: tus datos no cambiaron.</p>
        {!forb && <div className="pa-r"><Btn out icon={I(RefreshCw)} onClick={onRetry}>Reintentar</Btn></div>}
      </div>
    </div>
  )
}

export function PagPayments({ c, mob }: { c: PagPaymentsCtl; mob: boolean }) {
  if (c.web.status === "load" && c.fis.status === "load") return <SkCard title="Pagos recientes" rows={5} />
  if (c.web.status === "error" && c.fis.status === "error") return <ErrCard title="Pagos recientes" what="los pagos recientes" code={c.web.code} message={c.web.message} onRetry={() => { c.web.retry(); c.fis.retry() }} />
  const web = c.tab === "web"
  const blk = web ? c.web : c.fis
  const rows = web ? c.webRows : c.fisRows
  const open = c.all[c.tab]
  const shown = open ? rows : rows.slice(0, LIMIT)
  const n = (b: { status: string }, len: number) => (b.status === "ok" ? ` (${len})` : "")
  const sum = c.sum
  return (
    <section className="pa-card pa-clip" aria-labelledby="pag-h-pag">
      <div className="pa-ch"><h2 id="pag-h-pag">Pagos recientes</h2><span className="pa-nt">{mob ? "Solo lectura" : "Solo lectura · aquí no se cobra ni se confirma ningún pago"}</span></div>
      <div className="pa-tabs" role="tablist" aria-label="Pagos recientes">
        <button type="button" className="pa-tab" role="tab" aria-selected={web} onClick={() => c.setTab("web")}>Web{n(c.web, c.webRows.length)}</button>
        <button type="button" className="pa-tab" role="tab" aria-selected={!web} onClick={() => c.setTab("fis")}>Físicos{n(c.fis, c.fisRows.length)}</button>
      </div>
      {blk.status === "load" && <div className="pa-skr"><span className="pa-sk" style={{ width: "50%" }} /></div>}
      {(blk.status === "error" || blk.status === "forbidden" || blk.status === "unauth") && <Failed status={blk.status} code={blk.code} message={blk.message} onRetry={blk.retry} />}
      {blk.status === "ok" && rows.length === 0 && <EmptyBlk title={web ? "Aún no hay pagos web" : "Aún no hay pagos físicos"}>{web ? "Cuando la tienda web reciba pagos aparecerán aquí. Esto no es un error." : "Cuando la tienda física registre pagos aparecerán aquí. Esto no es un error."}</EmptyBlk>}
      {blk.status === "ok" && rows.length > 0 && <>
        <div className="pa-sumr">{web
          ? <><b>{sum.web.creado}</b> creado{sum.web.creado === 1 ? "" : "s"}{SEP}<b>{sum.web.pagado}</b> pagado{sum.web.pagado === 1 ? "" : "s"}{sum.web.otros ? <>{SEP}<b>{sum.web.otros}</b> otros</> : null}</>
          : <><b>{sum.fis.pend}</b> pendiente{sum.fis.pend === 1 ? "" : "s"} de confirmación{SEP}<b>{sum.fis.conf}</b> confirmado{sum.fis.conf === 1 ? "" : "s"}{sum.fis.otros ? <>{SEP}<b>{sum.fis.otros}</b> anulado{sum.fis.otros === 1 ? "" : "s"}</> : null}</>}</div>
        {web ? <WebRows rows={shown as WebPayment[]} mob={mob} /> : <FisRows rows={shown as PosPay[]} mob={mob} />}
        {rows.length > LIMIT && <div className="pa-pf-note"><button type="button" className="pa-lnk" onClick={() => c.toggleAll(c.tab)}>{open ? "Ver menos" : `Ver los ${rows.length} pagos ${web ? "web" : "físicos"}`}</button></div>}
        {!web && <div className="pa-pf-note">Mostrando {shown.length} de {rows.length} pagos físicos, los más recientes primero (el servidor entrega hasta 200).</div>}
      </>}
    </section>
  )
}
