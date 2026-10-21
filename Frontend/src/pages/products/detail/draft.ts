import type { Draft, Ficha } from "./types"
import { intOf, moneyOf } from "./shared"

const money2 = (s: string | null) => (s == null ? "" : Number(s).toFixed(2))

export const toDraft = (p: Ficha): Draft => ({
  sku: p.sku,
  nombre: p.nombre,
  descripcion: p.descripcion || "",
  categoria: String(p.id_categoria),
  precio: money2(p.precio_unitario_con_igv),
  mayorista: money2(p.precio_mayoritario_con_igv),
  condicion: p.condicion,
  origen: p.origen,
  garantia: String(p.garantia_meses),
  minimo: String(p.stock_minimo ?? 0),
  obs: p.estado_observaciones || "",
})

const samePrice = (a: string, b: string) =>
  a.trim() === "" || b.trim() === "" ? a.trim() === b.trim() : moneyOf(a) === moneyOf(b)

/** Campos del formulario que difieren del producto guardado. */
export const changedKeys = (d: Draft, base: Draft): (keyof Draft)[] =>
  (Object.keys(d) as (keyof Draft)[]).filter(k =>
    k === "precio" || k === "mayorista" ? !samePrice(d[k], base[k]) : d[k].trim() !== base[k].trim(),
  )

export type Errors = Partial<Record<keyof Draft, string>>

export const validate = (d: Draft): Errors => {
  const e: Errors = {}
  if (!d.sku.trim()) e.sku = "El SKU es obligatorio"
  if (!d.nombre.trim()) e.nombre = "El nombre es obligatorio"
  if (!d.categoria) e.categoria = "Elige una categor\u00eda"
  const precio = moneyOf(d.precio)
  if (!(precio > 0)) e.precio = "El precio con IGV debe ser mayor que cero"
  if (d.mayorista.trim() !== "" && !(moneyOf(d.mayorista) > 0)) e.mayorista = "El mayorista debe ser mayor que cero o quedar vac\u00edo"
  if (Number.isNaN(intOf(d.garantia))) e.garantia = "Entero de 0 o m\u00e1s"
  if (Number.isNaN(intOf(d.minimo))) e.minimo = "Entero de 0 o m\u00e1s"
  return e
}
