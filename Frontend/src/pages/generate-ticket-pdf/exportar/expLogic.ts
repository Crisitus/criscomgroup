import type { Product } from "../../../services/productService"
import { columnasExcel, construirFilas, type FilaExcel, type OpcionesExcel } from "../excelExport"
import { lotesNoCuadran, num, sinCodigoBarras } from "../productData"
import { FILTROS_EXCEL, type FiltrosExcel } from "../productFilters"

export type Fase = "loading" | "vacio" | "error" | "403" | "ok"

export interface Resultado {
  tipo: "ok" | "aud" | "gen"
  nombre: string
  cantidad: number
  sinCodigo: number
  cuando: Date
}

export const CLAVES_EXTRA = ["SKU", "Categoría", "Precio con IGV (S/)", "Costo promedio (S/)", "Último costo (S/)"]

export const hayFiltrosActivos = (f: FiltrosExcel) =>
  f.busqueda !== "" || f.categoria !== "" || f.ordenamiento !== FILTROS_EXCEL.ordenamiento
  || f.soloConStock !== FILTROS_EXCEL.soloConStock || f.soloOfertas || f.soloModificados

export const cuentaFiltros = (f: FiltrosExcel) =>
  (f.soloConStock ? 1 : 0) + (f.soloOfertas ? 1 : 0) + (f.soloModificados ? 1 : 0) + (f.categoria ? 1 : 0) + (f.busqueda.trim() ? 1 : 0)

const modificado = (p: Product) => new Date(p.actualizado_en).getTime() > new Date(p.creado_en).getTime()

/** Contadores de los chips: sobre el catalogo con «Con stock» aplicado si esta activo. */
export const contadoresChips = (productos: Product[], soloConStock: boolean) => {
  const base = soloConStock ? productos.filter(p => num(p.stock) > 0) : productos
  return {
    stock: productos.filter(p => num(p.stock) > 0).length,
    oferta: base.filter(p => p.es_oferta).length,
    modif: base.filter(modificado).length,
  }
}

export const sumaLotes = (p: Product) => (p.codigos_barras ?? []).reduce((s, c) => s + num(c.cantidad), 0)

/** Motivo escrito de por que no se puede descargar ("" = se puede). */
export const motivoDescarga = (fase: Fase, enviar: number, seleccionTotal: number) => {
  if (fase === "loading") return "Cargando productos…"
  if (fase === "vacio") return "No hay productos para exportar"
  if (fase === "error") return "No hay productos cargados para exportar"
  if (fase === "403") return "No tienes permiso para ver los productos"
  if (enviar > 0) return ""
  return seleccionTotal > 0 ? "Ningún seleccionado está en el filtro actual" : "Selecciona al menos un producto para descargar"
}

export interface VistaArchivo {
  columnas: string[]
  filas: FilaExcel[]
}

/** La vista previa usa el mismo constructor que el archivo: lo que se ve es lo que sale. */
export const vistaPrevia = (aExportar: Product[], opciones: OpcionesExcel): VistaArchivo => ({
  columnas: columnasExcel(opciones).map(c => c.header),
  filas: construirFilas(aExportar.slice(0, 5), opciones),
})

export const resumenAvisos = (aExportar: Product[]) => ({
  sinCodigo: aExportar.filter(sinCodigoBarras),
  lotes: aExportar.filter(lotesNoCuadran),
  unidades: aExportar.reduce((s, p) => s + num(p.stock), 0),
})
