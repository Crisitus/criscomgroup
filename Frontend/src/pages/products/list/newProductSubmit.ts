import { toast } from "sonner"
import { createProduct } from "../../../services/productService"
import { agregarCodigosBarras, type CodigoBarrasItem } from "../../../services/codigoBarrasService"
import { errMsg } from "./prodShared"

export interface NewVals {
  sku: string; nombre: string; descripcion: string; id_categoria: number; precio: number; mayor: number
  condicion: "nuevo" | "segunda_mano"; origen: "local" | "importado"; garantia: number; obs: string
}
const net = (v: number) => Number((v / 1.18).toFixed(2))

/** Crea el producto (precios netos calculados como en la pantalla original) y luego sus códigos de barras. */
export async function submitNew(v: NewVals, codes: CodigoBarrasItem[], image: File | null) {
  const stock = codes.reduce((s, c) => s + c.cantidad, 0)
  const created = await createProduct({
    sku: v.sku.trim(), nombre: v.nombre.trim(), descripcion: v.descripcion.trim(),
    precio_unitario: net(v.precio), precio_unitario_con_igv: v.precio,
    precio_mayoritario: v.mayor > 0 ? net(v.mayor) : null, precio_mayoritario_con_igv: v.mayor > 0 ? v.mayor : null,
    stock, id_categoria: v.id_categoria, condicion: v.condicion, origen: v.origen, garantia_meses: v.garantia,
    estado_observaciones: v.obs.trim(), imagen: image || undefined,
  })
  if (codes.length) {
    try { await agregarCodigosBarras(created.id_producto, codes.map(c => ({ codigo: c.codigo, cantidad: c.cantidad }))) }
    catch (e) { toast.warning(`Producto creado, pero: ${errMsg(e, "Error al agregar códigos de barras")}`) }
  }
  return created
}
