import { CircleAlert, FilterX, RefreshCw, ScanBarcode, CircleCheck, Tag } from "lucide-react"
import { ARROW, Q } from "./ofeCalc"
import { I } from "./ofeShared"
import { OfeColgroup } from "./OfeTable"
import type { CodeHit } from "./useOfeFilter"

const Sk = ({ w, h = 14, mt = 0, right }: { w: number | string; h?: number; mt?: number; right?: boolean }) => (
  <span className="skb" style={{ width: w, height: h, marginTop: mt, marginLeft: right ? "auto" : undefined }} />
)

export function OfeSkeleton() {
  const row = (i: number) => (
    <tr key={i} className="sk">
      <td /><td><Sk w="62%" /><Sk w="34%" h={10} mt={6} /></td><td><Sk w={30} right /></td><td><Sk w={70} right /></td>
      <td><Sk w={90} /></td><td><Sk w={60} right /></td><td><Sk w={88} h={32} right /></td>
    </tr>
  )
  return (
    <div className="tcard" aria-busy="true" role="status">
      <span className="sr">Cargando productos…</span>
      <table className="tb">
        <OfeColgroup />
        <thead><tr><th /><th>Producto</th><th className="r">Stock</th><th className="r">Precio normal</th><th>Oferta actual</th><th className="r">Margen</th><th /></tr></thead>
        <tbody>{Array.from({ length: 12 }, (_, i) => row(i))}</tbody>
      </table>
    </div>
  )
}

export function OfeKpiSkeleton() {
  const c = (i: number) => <div key={i} className="cell"><Sk w={90} h={12} /><Sk w={56} h={22} mt={6} /></div>
  return <div className="strip" aria-busy="true">{[0, 1, 2, 3].map(c)}</div>
}

export function OfeError({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <div className="errc" role="alert">
      <div className="ei">{I(CircleAlert, 22)}</div>
      <div className="tx"><b>No se pudo cargar el listado de productos</b><p>No se ha cambiado ningún precio. {detail ? `${detail}. ` : ""}Revisa tu conexión e inténtalo de nuevo.</p></div>
      <button type="button" className="btn" onClick={onRetry}>{I(RefreshCw, 16)}Reintentar</button>
    </div>
  )
}

export function OfeEmpty({ total, onlyOffers, q, onClear, onAll }: { total: number; onlyOffers: boolean; q: string; onClear: () => void; onAll: () => void }) {
  if (total === 0) {
    return (
      <div className="tcard"><div className="empty" role="status"><div className="ei">{I(Tag, 22)}</div><h2>No hay productos disponibles</h2><p>Crea productos en Inventario para poder aplicarles ofertas.</p></div></div>
    )
  }
  if (onlyOffers) {
    return (
      <div className="tcard"><div className="empty" role="status"><div className="ei">{I(Tag, 22)}</div><h2>Aún no hay productos en oferta</h2><p>Los {total} productos se venden a su precio normal. Marca productos y aplica una oferta para que aparezcan aquí.</p><button type="button" className="btn out" onClick={onAll}>Ver los {total} productos</button></div></div>
    )
  }
  return (
    <div className="tcard"><div className="empty" role="status"><div className="ei">{I(FilterX, 22)}</div>
      <h2>{q ? <>Ningún producto coincide con {Q(q)}</> : "Ningún producto coincide con los filtros"}</h2>
      <p>Prueba con otro nombre o SKU, o quita los filtros para ver los {total} productos.</p>
      <button type="button" className="btn out" onClick={onClear}>{I(FilterX, 16)}Limpiar filtros</button></div></div>
  )
}

export function OfeScan({ hit, q }: { hit: CodeHit | null; q: string }) {
  const code = q.trim()
  if (!hit || hit.code !== code) return null
  if (hit.id !== null) {
    return (
      <p className="ctx ok scan" role="status">{I(CircleCheck, 16)}<span>Código <b className="num">{hit.code}</b> {ARROW} <b>{hit.name}</b></span></p>
    )
  }
  if (!/^\d{5,}$/.test(code)) return null
  return (
    <p className="ctx bad scan" role="alert">{I(ScanBarcode, 16)}<span>No existe ningún producto con el código <b className="num">{hit.code}</b>. Revísalo o busca por nombre o SKU.</span></p>
  )
}
