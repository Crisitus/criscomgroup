import { code128Path } from "../../../utils/barcode128"
import { qrPath } from "../../../utils/qrcode"
import { urlPublicaProducto } from "../../../utils/qrProductoUrl"
import type { Product } from "../../../services/productService"
import { codigoTicket, num } from "../productData"
import { TICKETS_POR_PAGINA, type TicketConfig } from "./ticketConfig"

/* Replica en HTML de la etiqueta de papel (177 x 118 pt): SIEMPRE blanca con tinta negra.
   Usa los mismos datos y reglas que el PDF real (TicketCard). */

const f2 = (n: number) => n.toFixed(2)
const trunc = (s: string, m: number) => (s.length > m ? `${s.slice(0, m)}...` : s)
const A4W = 595.28
const A4H = 841.89

const cacheBarras = new Map<string, { d: string; ancho: number }>()
const barrasDe = (texto: string) => {
  let b = cacheBarras.get(texto)
  if (!b) { const r = code128Path(texto, 6); b = { d: r.d, ancho: r.anchoModulos }; cacheBarras.set(texto, b) }
  return b
}
const cacheQr = new Map<number, { d: string; size: number }>()
const qrDe = (id: number) => {
  let q = cacheQr.get(id)
  if (!q) { q = qrPath(urlPublicaProducto(id), 2); cacheQr.set(id, q) }
  return q
}

/** Una etiqueta: misma jerarquia que el PDF (OFERTA+nombre / QR o Antes + precio / codigo + docena). */
export function TicketHtml({ p, config }: { p: Product; config: TicketConfig }) {
  const of = config.mostrarPrecioOferta && Boolean(p.es_oferta) && num(p.precio_oferta_con_igv) > 0
  const c = codigoTicket(p)
  const precio = of ? num(p.precio_oferta_con_igv) : num(p.precio_unitario_con_igv)
  const [ent, dec] = f2(Math.max(0, precio)).split(".")
  const fsz = ent.length >= 4 ? 31 : ent.length === 3 ? 40 : 50
  const nombre = trunc(p.nombre || "Producto sin nombre", of ? 40 : 60)
  const mayorista = config.mostrarPrecioMayorista ? num(p.precio_mayoritario_con_igv) : 0

  const top = of
    ? <div className="r1 of"><div className="of1"><span className="ob">OFERTA</span></div><div className="of2">{nombre}</div></div>
    : <div className="r1"><span>{nombre}</span></div>
  const izquierda = of
    ? <div className="a"><div>Antes<s>S/ {f2(num(p.precio_unitario_con_igv))}</s></div></div>
    : <div className="a">{config.mostrarQr ? (() => { const q = qrDe(p.id_producto); return <svg className="qrs qrp" width={38} height={38} viewBox={`0 0 ${q.size} ${q.size}`} fill="#000" shapeRendering="crispEdges" aria-hidden="true"><path d={q.d} /></svg> })() : null}</div>
  const barras = config.mostrarCodigoBarras
    ? <div className="b">{c.escaneable ? (() => { const b = barrasDe(c.texto); return <svg className="qrs" width={84} height={11} viewBox={`0 0 ${b.ancho} 1`} preserveAspectRatio="none" fill="#000" shapeRendering="crispEdges" aria-hidden="true"><path d={b.d} /></svg> })() : null}<i>{c.origen === "sku" ? "SKU: " : ""}{c.texto}</i></div>
    : <div className="b" />
  const dz = mayorista > 0
    ? <div className="dz">Docena:<b>S/. {f2(mayorista)}</b></div>
    : <div className="dz" />

  return (
    <div className="lbl" style={{ "--fs": config.tamanoFuente } as React.CSSProperties}>
      {top}
      <div className="r3">{izquierda}<div className="p"><span className="m">S/</span><span className="e" style={{ fontSize: fsz }}>{ent}</span><span className="d">.{dec}</span></div></div>
      <div className="r4">{barras}{dz}</div>
    </div>
  )
}

/** Hoja A4 en miniatura (papel blanco tambien en oscuro). `items` ya viene expandido por copias. */
export function HojaA4({ items, config, pagina, ancho }: { items: Product[]; config: TicketConfig; pagina: number; ancho: number }) {
  const s = ancho / A4W
  const slice = items.slice(pagina * TICKETS_POR_PAGINA, (pagina + 1) * TICKETS_POR_PAGINA)
  if (items.length === 0) {
    return (
      <div className="shw" style={{ width: ancho, height: A4H * s }}>
        <div className="blank" style={{ fontSize: Math.max(11, 13 / s * 0.5) }}>Sin etiquetas todavía<br /><span style={{ fontWeight: 400 }}>Selecciona al menos un producto</span></div>
      </div>
    )
  }
  return (
    <div className="shw" style={{ width: ancho, height: A4H * s }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: A4W, height: A4H, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <div className="sh">{slice.map((p, i) => <TicketHtml key={`${p.id_producto}-${pagina}-${i}`} p={p} config={config} />)}</div>
      </div>
    </div>
  )
}
