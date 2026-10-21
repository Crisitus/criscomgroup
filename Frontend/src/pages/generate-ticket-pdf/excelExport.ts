import type { Product } from "../../services/productService"
import { cantidadPar, codigosDe, nombreCategoria, num } from "./productData"

export const COLUMNAS_EXCEL = [
  { header: "Producto", key: "Producto", width: 40 },
  { header: "Código de Barras", key: "Código de Barras", width: 35 },
  { header: "Cantidad", key: "Cantidad", width: 12 },
  { header: "Cantidad (Par)", key: "Cantidad (Par)", width: 15 },
] as const

export interface FilaExcel {
  Producto: string
  "Código de Barras": string
  Cantidad: number
  "Cantidad (Par)": number
  /** Columnas opcionales (solo existen si se pidieron). */
  [columna: string]: string | number
}

/** Columnas opcionales, a la derecha de las 4 fijas y apagadas por defecto. */
export interface OpcionesExcel {
  sku?: boolean
  categoria?: boolean
  precio?: boolean
  /** Costo promedio y último costo: el llamador solo lo activa si el listado los trae. */
  costos?: boolean
}

interface ColumnaExcel { header: string; key: string; width: number; numFmt?: string }
const MONEDA = "#,##0.00"

export const columnasExcel = (o: OpcionesExcel = {}): ColumnaExcel[] => [
  ...COLUMNAS_EXCEL,
  ...(o.sku ? [{ header: "SKU", key: "SKU", width: 20 }] : []),
  ...(o.categoria ? [{ header: "Categoría", key: "Categoría", width: 22 }] : []),
  ...(o.precio ? [{ header: "Precio con IGV (S/)", key: "Precio con IGV (S/)", width: 20, numFmt: MONEDA }] : []),
  ...(o.costos ? [
    { header: "Costo promedio (S/)", key: "Costo promedio (S/)", width: 20, numFmt: MONEDA },
    { header: "Último costo (S/)", key: "Último costo (S/)", width: 18, numFmt: MONEDA },
  ] : []),
]

/**
 * Una fila por producto con los datos del listado (cero peticiones extra).
 * Todos los lotes separados por coma; sin código de barras se escribe el SKU.
 */
export const construirFilas = (productos: Product[], o: OpcionesExcel = {}): FilaExcel[] =>
  productos.map(p => {
    const codigos = codigosDe(p)
    const fila: FilaExcel = {
      Producto: p.nombre,
      "Código de Barras": codigos.length ? codigos.join(", ") : p.sku,
      Cantidad: num(p.stock),
      "Cantidad (Par)": cantidadPar(num(p.stock)),
    }
    if (o.sku) fila.SKU = p.sku
    if (o.categoria) fila["Categoría"] = nombreCategoria(p)
    if (o.precio) fila["Precio con IGV (S/)"] = num(p.precio_unitario_con_igv)
    if (o.costos) {
      fila["Costo promedio (S/)"] = num(p.costo_promedio)
      fila["Último costo (S/)"] = num(p.ultimo_costo)
    }
    return fila
  })

const dosDigitos = (n: number) => String(n).padStart(2, "0")

export const nombreArchivoExcel = (soloModificados: boolean, soloConStock: boolean, ahora = new Date()) => {
  const dia = `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`
  const hora = `${dosDigitos(ahora.getHours())}${dosDigitos(ahora.getMinutes())}`
  return `productos_${soloModificados ? "modificados" : "todos"}_${soloConStock ? "con_stock" : "completo"}_${dia}_${hora}.xlsx`
}

/** ExcelJS se carga solo al exportar para no engordar la descarga inicial del ERP. */
export const generarExcel = async (filas: FilaExcel[], o: OpcionesExcel = {}): Promise<Blob> => {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "CRISCOM Group"
  workbook.created = new Date()
  const hoja = workbook.addWorksheet("Productos")
  hoja.columns = columnasExcel(o).map(({ numFmt, ...c }) => (numFmt ? { ...c, style: { numFmt } } : { ...c }))
  hoja.addRows(filas)
  hoja.getRow(1).font = { bold: true }
  hoja.views = [{ state: "frozen", ySplit: 1 }]
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export const descargarBlob = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = nombre
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
