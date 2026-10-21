import type { Product } from "../../../services/productService"
import { num } from "../productData"
import { FILTROS_TICKET, type FiltrosTicket } from "../productFilters"
import { MAX_TICKETS, TICKETS_POR_PAGINA } from "./ticketConfig"

export const pl = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

export type Fase = "loading" | "vacio" | "error" | "403" | "ok"
/** Estado de la ultima generacion/descarga (aviso persistente hasta la siguiente accion). */
export type GenPdf = "" | "gen" | "done" | "aud" | "generr"

export interface ResultadoPdf {
  tipo: "ok" | "aud"
  nombre: string
  etiquetas: number
  hojas: number
}

/** Motivo escrito de por que no se puede previsualizar/descargar ("" = se puede). */
export const motivoAccion = (fase: Fase, seleccionados: number, etiquetas: number): string => {
  if (fase === "loading") return "Cargando productos…"
  if (fase === "403") return "No tienes permiso para ver los productos"
  if (fase === "error") return "No hay productos cargados"
  if (fase === "vacio") return "Todavía no hay productos"
  if (seleccionados === 0) return "Selecciona al menos un producto"
  if (etiquetas > MAX_TICKETS) return `Máximo ${MAX_TICKETS} etiquetas por PDF`
  return ""
}

export const hayFiltrosActivos = (f: FiltrosTicket) =>
  f.busqueda !== "" || f.categoria !== "" || f.precioMin !== "" || f.precioMax !== ""
  || f.ordenamiento !== FILTROS_TICKET.ordenamiento
  || f.soloConStock !== FILTROS_TICKET.soloConStock || f.soloOfertas

/** Cuenta los filtros que se apartan del estado inicial (para el boton «Filtros (N)» de movil). */
export const cuentaFiltros = (f: FiltrosTicket) =>
  (f.busqueda.trim() ? 1 : 0) + (f.categoria ? 1 : 0) + (f.precioMin !== "" || f.precioMax !== "" ? 1 : 0)
  + (f.soloConStock !== FILTROS_TICKET.soloConStock ? 1 : 0) + (f.soloOfertas ? 1 : 0)

/** Contadores de los chips sobre el catalogo completo. */
export const contadoresChips = (productos: Product[]) => ({
  stock: productos.filter(p => num(p.stock) > 0).length,
  oferta: productos.filter(p => Boolean(p.es_oferta)).length,
})

/** Hojas A4 necesarias (0 etiquetas = 0 hojas: la interfaz muestra «Hoja — de —»). */
export const hojasDe = (etiquetas: number) => Math.ceil(etiquetas / TICKETS_POR_PAGINA)

/** Precio que imprime la etiqueta: el de oferta si la hay, si no el unitario (ambos con IGV). */
export const precioEfectivo = (p: Product): { actual: number; antes: number | null } => {
  const unitario = num(p.precio_unitario_con_igv)
  const oferta = num(p.precio_oferta_con_igv)
  return p.es_oferta && oferta > 0 ? { actual: oferta, antes: unitario } : { actual: unitario, antes: null }
}
