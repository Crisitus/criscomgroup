import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { CircleCheck, ChevronRight } from "lucide-react"
import { MargenNeg } from "./QuoteList"
import { EstChip, I, MINUS, SC, SEP, fd, money, notasLimpias, num, pl, venceInfo, ventaId, type Quote } from "./quotesShared"

const docLabel = (d: string) => `${d.length === 11 ? "RUC" : "DNI"} ${d}`

export function QuoteDetail({ q, mob, actions, msg }: {
  q: Quote; mob: boolean; actions: { p: ReactNode; s: ReactNode; w: ReactNode }; msg: string | null
}) {
  const v = venceInfo(q), mg = num(q.margen), vid = ventaId(q), notas = notasLimpias(q)
  const tel = q.cliente_telefono ? `WhatsApp ${q.cliente_telefono.replace(/(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")}` : ""
  const info = [q.cliente_documento ? docLabel(q.cliente_documento) : "", tel, q.cliente_email || ""].filter(Boolean).join(SEP)
  return (
    <section className="card ex" aria-label={`Detalle de ${q.numero}`}>
      <div className="exh">
        {msg && <div className="msg" role="status">{I(CircleCheck, 18)}<span>{msg}</span>{vid && <Link to={`/sales/${vid}`}>Ver venta #{vid} {I(ChevronRight, 14)}</Link>}</div>}
        <div className="r1">
          <h2>{q.numero}</h2><EstChip e={q.estado} />
          <span className="tag">{SC[q.escenario] || q.escenario}</span>
          {v && <span className={`vnc st ${v.tone}`}>{v.long}</span>}
          {!v && q.estado === "convertida" && vid && <Link className="vnc lnk" to={`/sales/${vid}`}>Venta #{vid}{I(ChevronRight, 14)}</Link>}
        </div>
        <div>
          <div className="cli">{q.cliente_nombre}</div>
          {info && <div className="r2">{info}</div>}
          <div className="r2 num">Creada {fd(q.creado_en)}{SEP}Vigencia {pl(q.vigencia_dias, "día", "días")}{SEP}Vence {fd(q.vence_en)}</div>
        </div>
        <div className="mny">
          <div><div className="l">Total</div><div className="v big num">{money(q.total)}</div></div>
          <div><div className="l">Costo</div><div className="v num">{money(q.costo_total)}</div></div>
          <div><div className="l">Margen neto</div><div className="v num">{mg < 0 ? <MargenNeg n={mg} s={16} /> : money(mg)}</div></div>
        </div>
        <div className="ra">{!mob && actions.p}{actions.s}</div>
        {actions.w}
      </div>
      <div className="exb">
        <div className="sh">Productos<small>{pl(q.detalles.length, "línea", "líneas")}</small></div>
        <table className="tbl">
          <thead><tr><th>Producto</th><th className="r">Cant.</th><th className="r">Precio con IGV</th><th className="r">Subtotal</th></tr></thead>
          <tbody>{q.detalles.map(d => (
            <tr key={d.id_cotizacion_detalle}>
              <td className="a">{d.descripcion}</td>
              <td className="r num" data-l="Cant.">{d.cantidad}</td>
              <td className="r num" data-l="Precio con IGV">{money(d.precio_unitario)}</td>
              <td className="r num a" data-l="Subtotal">{money(d.subtotal)}</td>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr><td colSpan={3} className="r">Subtotal</td><td className="r num">{money(q.subtotal)}</td></tr>
            <tr><td colSpan={3} className="r">Descuento</td><td className="r num">{num(q.descuento) ? `${MINUS}${money(q.descuento)}` : money(0)}</td></tr>
            <tr className="tt"><td colSpan={3} className="r">Total</td><td className="r num">{money(q.total)}</td></tr>
          </tfoot>
        </table>
        {notas && <dl className="dl"><div><dt>Notas</dt><dd style={{ whiteSpace: "pre-line" }}>{notas}</dd></div></dl>}
      </div>
    </section>
  )
}
