import { agregarCodigosBarras, actualizarCantidadCodigoBarras, eliminarCodigoBarras } from "../../../services/codigoBarrasService"
import { deleteProductImage } from "../../../services/productService"
import { saveFicha, uploadImage, type SavePayload } from "./api"
import type { Code, Draft, Ficha } from "./types"
import type { CodeModel, PendingState } from "./usePending"
import { intOf, moneyOf, net, r2 } from "./shared"

/** Traduce el borrador a lo que espera el backend (precios sin IGV = con IGV / 1.18). */
export function buildPayload(d: Draft, cm: CodeModel): SavePayload {
  const con = r2(moneyOf(d.precio))
  const mayCon = d.mayorista.trim() === "" ? null : r2(moneyOf(d.mayorista))
  return {
    sku: d.sku.trim(),
    nombre: d.nombre.trim(),
    descripcion: d.descripcion.trim(),
    id_categoria: Number(d.categoria),
    precio_unitario: r2(net(con)),
    precio_unitario_con_igv: con,
    precio_mayoritario: mayCon == null ? null : r2(net(mayCon)),
    precio_mayoritario_con_igv: mayCon,
    condicion: d.condicion,
    origen: d.origen,
    garantia_meses: intOf(d.garantia),
    estado_observaciones: d.obs.trim(),
    stock_minimo: intOf(d.minimo),
    // El stock sale de los codigos SOLO si el producto se controla por codigos; sin codigos la ficha no lo toca.
    ...(cm.usa ? { stock: cm.suma } : {}),
  }
}

export interface SaveInput {
  id: number
  saved: Ficha
  draft: Draft
  codes: Code[]
  pending: PendingState
  model: CodeModel
}

/** Orden: ficha (lo que mas falla va primero), codigos quitados, codigos nuevos, cantidades, imagen. */
export async function saveAll(x: SaveInput, onTouched: () => void): Promise<Ficha> {
  const { id, pending: p, model: cm } = x
  let product = await saveFicha(id, buildPayload(x.draft, cm))
  onTouched()
  if (p.del.length) await Promise.all(p.del.map(cid => eliminarCodigoBarras(cid)))
  if (p.tmp.length) await agregarCodigosBarras(id, p.tmp.map(t => ({ codigo: t.codigo, cantidad: intOf(t.cantidad) })))
  for (const c of cm.qtyChanged) await actualizarCantidadCodigoBarras(c.codigo, intOf(p.qty[c.id]))
  if (p.removeImg && x.saved.imagen_url) await deleteProductImage(id)
  if (p.file) product = await uploadImage(id, p.file)
  return product
}
