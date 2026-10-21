import type { ReactNode } from "react"
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react"
import { PRIORIDAD_LABELS, TIER_LABELS, type ProductoElegido, type SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { clean, money } from "./sarCommon"
import { Chip, I } from "./sarParts"

function Stock({ p }: { p: ProductoElegido }) {
  const st = p.stock_actual
  if (st == null) return <Chip t="nu" icon={CircleX} x="Stock no disponible" />
  if (st <= 0) return <Chip t="er" icon={CircleX} x="Sin stock" />
  if (st < p.cantidad) return <Chip t="wn" icon={TriangleAlert} x={`Stock insuficiente: ${st} de ${p.cantidad}`} />
  return <Chip t="ok" icon={CircleCheck} x={`Disponible · ${st}`} />
}

const Linea = ({ p }: { p: ProductoElegido }) => (
  <div className="ln" role="row">
    <span className="pn">{p.nombre}</span>
    <span className="q num"><span className="lab-m">Cant. </span>{p.cantidad}</span>
    <span className="pc num"><span className="lab-m">Precio del servidor</span>{money(p.precio)}</span>
    {p.precio_declarado != null && p.precio_declarado !== p.precio
      ? <span className="dc">{I(TriangleAlert, 14)}<span>El cliente envió {money(p.precio_declarado)}</span></span>
      : <span className="dc none">Sin discrepancia</span>}
    <span className="sk2"><Stock p={p} /></span>
  </div>
)

const Fld = ({ k, children, full }: { k: string; children: ReactNode; full?: boolean }) => (
  <div className={`fld${full ? " full" : ""}`}><span className="k">{k}</span><span className="v">{children}</span></div>
)

/** Pedido segun el modo: marketplace (lineas + IGV), presupuesto (tier, uso...) o ensamble propio (mensaje). */
export function SarOrder({ s }: { s: SolicitudEnsamble }) {
  const msg = s.mensaje ? <div style={{ marginTop: 12 }}><p className="rok">Mensaje del cliente</p><p className="ro">{clean(s.mensaje)}</p></div> : null
  if (s.modo === "marketplace") {
    const k = s.resumen_catalogo
    return (
      <section className="sec">
        <div className="sech"><h3>Pedido · marketplace</h3><small>Precios del servidor; la discrepancia solo la ve el equipo</small></div>
        <div className="lines" role="table" aria-label="Líneas del pedido">
          <div className="lh" role="row"><span>Pieza</span><span className="q">Cant.</span><span className="num">Precio</span><span>Discrepancia</span><span>Stock</span></div>
          {(s.productos ?? []).map((p, i) => <Linea key={`${p.id_producto}-${i}`} p={p} />)}
        </div>
        {k && (
          <div className="igv">
            <div><span>Subtotal sin IGV</span><span>{money(k.subtotal_sin_igv)}</span></div>
            <div><span>IGV (18 %)</span><span>{money(k.igv)}</span></div>
            <div className="tot2"><span>Total de catálogo</span><span>{money(k.total_catalogo)}</span></div>
          </div>
        )}
        {msg}
      </section>
    )
  }
  if (s.modo === "presupuesto") {
    const tier = s.tier_presupuesto === "otro" && s.presupuesto_personalizado != null ? `Otro presupuesto: ${money(s.presupuesto_personalizado)}` : s.tier_presupuesto ? TIER_LABELS[s.tier_presupuesto] : "No indicó"
    return (
      <section className="sec">
        <div className="sech"><h3>Pedido · por presupuesto</h3></div>
        <div className="fl">
          <Fld k="Presupuesto">{tier}</Fld>
          <Fld k="Periféricos">{s.incluye_perifericos === "con_perifericos" ? "Con periféricos" : "Solo el PC"}</Fld>
          <Fld k="Marcas de preferencia">{s.marcas_preferencia || "Sin preferencia"}</Fld>
          <Fld k="Prioridades (hasta 2)" full>{s.prioridades?.length ? <span className="pri-l">{s.prioridades.map(p => <span className="tp" key={p}>{PRIORIDAD_LABELS[p]}</span>)}</span> : "Sin prioridades"}</Fld>
          <Fld k="Uso" full>{s.uso_descripcion ? clean(s.uso_descripcion) : "No indicó"}</Fld>
        </div>
        {msg}
      </section>
    )
  }
  return (
    <section className="sec">
      <div className="sech"><h3>Pedido · solo ensamblaje</h3></div>
      <p className="rok">Mensaje del cliente: las piezas que trae</p>
      <p className="ro">{s.mensaje ? clean(s.mensaje) : "No dejó mensaje."}</p>
    </section>
  )
}
