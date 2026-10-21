import type { Product } from "../../services/productService"
import { SEP } from "./acqShared"

/** Productos que pueden recibir una unidad usada: segunda mano, o cualquiera sin stock. */
export const elegibles = (ps: Product[]) => ps.filter(p => p.condicion === "segunda_mano" || Number(p.stock) === 0)

export function ProductPicker({ products, value, onChange, label, none, err }: {
  products: Product[]; value: number | null; onChange: (id: number | null) => void; label: string; none?: boolean; err?: boolean
}) {
  return (
    <div className="pks" role="radiogroup" aria-label={label}>
      {products.map(p => (
        <button type="button" key={p.id_producto} className={`pk${err && value === p.id_producto ? " err" : ""}`} role="radio" aria-checked={value === p.id_producto} onClick={() => onChange(p.id_producto)}>
          <span className="rd" /><span><b>{p.nombre}</b><small>{p.sku}{SEP}{p.condicion === "nuevo" ? "Producto nuevo" : "Segunda mano"}{SEP}Stock {p.stock}</small></span>
        </button>
      ))}
      {none && (
        <button type="button" className="pk" role="radio" aria-checked={value === null} onClick={() => onChange(null)}>
          <span className="rd" /><span><b>Registrar sin producto por ahora</b><small>Se podrá asignar e ingresar al stock después, desde el detalle</small></span>
        </button>
      )}
      {!products.length && <span className="hint">No hay productos de segunda mano ni sin stock. Crea uno en Productos.</span>}
    </div>
  )
}
