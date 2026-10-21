import { describe, expect, it } from "vitest"
import type { Product } from "../../services/productService"
import { columnasExcel, construirFilas, nombreArchivoExcel } from "./excelExport"
import { cantidadPar, codigoTicket, lotesNoCuadran, productoValido } from "./productData"
import { filtrarProductos, FILTROS_EXCEL, FILTROS_TICKET } from "./productFilters"
import { paginarTickets } from "./ticketPages"
import { expandirCopias } from "./ticketPdf"

const p = (id: number, extra: Partial<Product> = {}): Product => ({
  id_producto: id, sku: `SKU-${id}`, nombre: `Producto ${id}`, descripcion: null, precio_unitario: "10", precio_unitario_con_igv: "11.80",
  precio_mayoritario: null, precio_mayoritario_con_igv: null, es_oferta: false, stock: 12, condicion: "nuevo", origen: "local",
  garantia_meses: 0, estado_observaciones: null, id_categoria: 1, imagen_url: null, creado_en: "2026-01-01T00:00:00Z", actualizado_en: "2026-01-01T00:00:00Z",
  ...extra,
})

describe("exportar productos: datos", () => {
  it("Excel: usa los códigos del listado (todos los lotes) y el SKU si no hay", () => {
    const filas = construirFilas([
      p(1, { codigos_barras: [{ codigo_barras: "AAA", cantidad: 5 }, { codigo_barras: "BBB", cantidad: 7 }] }),
      p(2, { stock: 13 }),
    ])
    expect(filas[0]).toEqual({ Producto: "Producto 1", "Código de Barras": "AAA, BBB", Cantidad: 12, "Cantidad (Par)": 2 })
    expect(filas[1]["Código de Barras"]).toBe("SKU-2")
    expect(filas[1]["Cantidad (Par)"]).toBe(cantidadPar(13))
    expect(cantidadPar(13)).toBe(4)
  })

  it("nombre de archivo con fecha y hora", () => {
    expect(nombreArchivoExcel(true, false, new Date(2026, 9, 10, 15, 5))).toBe("productos_modificados_completo_2026-10-10_1505.xlsx")
  })

  it("ticket: lote con stock más antiguo; sin lotes cae al SKU marcado como tal", () => {
    expect(codigoTicket(p(1, { codigos_barras: [{ codigo_barras: "VACIO", cantidad: 0 }, { codigo_barras: "CON", cantidad: 3 }] }))).toEqual({ texto: "CON", origen: "lote", escaneable: true })
    expect(codigoTicket(p(2))).toEqual({ texto: "SKU-2", origen: "sku", escaneable: true })
    expect(codigoTicket(p(3, { codigos_barras: [{ codigo_barras: "ñ-1", cantidad: 1 }] })).escaneable).toBe(false)
  })

  it("detecta lotes que no suman el stock y productos inválidos", () => {
    expect(lotesNoCuadran(p(1, { codigos_barras: [{ codigo_barras: "A", cantidad: 5 }] }))).toBe(true)
    expect(lotesNoCuadran(p(1, { codigos_barras: [{ codigo_barras: "A", cantidad: 12 }] }))).toBe(false)
    expect(productoValido({ id_producto: 1, nombre: "x", sku: "" })).toBe(false)
  })

  it("filtros: stock por defecto, ofertas, modificados y rango de precio", () => {
    const lista = [p(1), p(2, { stock: 0 }), p(3, { es_oferta: true }), p(4, { actualizado_en: "2026-02-01T00:00:00Z", precio_unitario_con_igv: "50" })]
    expect(filtrarProductos(lista, FILTROS_TICKET).map(x => x.id_producto)).toEqual([4, 3, 1])
    expect(filtrarProductos(lista, { ...FILTROS_TICKET, soloConStock: false }).map(x => x.id_producto)).toEqual([4, 3, 2, 1])
    expect(filtrarProductos(lista, { ...FILTROS_EXCEL, soloModificados: true }).map(x => x.id_producto)).toEqual([4])
    expect(filtrarProductos(lista, { ...FILTROS_TICKET, precioMin: "20" }).map(x => x.id_producto)).toEqual([4])
    expect(filtrarProductos(lista, { ...FILTROS_TICKET, soloOfertas: true }).map(x => x.id_producto)).toEqual([3])
  })

  it("tickets: copias y 7 filas de 3 por hoja A4", () => {
    const tickets = expandirCopias([p(1), p(2)], 2)
    expect(tickets.map(t => t.id_producto)).toEqual([1, 1, 2, 2])
    const hojas = paginarTickets(Array.from({ length: 22 }, (_, i) => p(i + 1)))
    expect(hojas).toHaveLength(2)
    expect(hojas[0]).toHaveLength(7)
    expect(hojas[0][0]).toHaveLength(3)
    expect(hojas[1]).toHaveLength(1)
  })
})

describe("exportar productos: columnas opcionales", () => {
  const conCostos = p(7, { categoria: { nombre: "Laptops" }, precio_unitario_con_igv: "1768.82", costo_promedio: "616.67", ultimo_costo: "150.00" })

  it("sin opciones el archivo es el de siempre (4 columnas, mismas claves)", () => {
    expect(columnasExcel().map(c => c.header)).toEqual(["Producto", "Código de Barras", "Cantidad", "Cantidad (Par)"])
    expect(Object.keys(construirFilas([conCostos])[0])).toEqual(["Producto", "Código de Barras", "Cantidad", "Cantidad (Par)"])
  })

  it("SKU, Categoría y Precio van a la derecha de las fijas; los costos solo si se piden", () => {
    const o = { sku: true, categoria: true, precio: true }
    expect(columnasExcel(o).map(c => c.header).slice(4)).toEqual(["SKU", "Categoría", "Precio con IGV (S/)"])
    const fila = construirFilas([conCostos], o)[0]
    expect(fila).toMatchObject({ SKU: "SKU-7", "Categoría": "Laptops", "Precio con IGV (S/)": 1768.82 })
    expect(fila).not.toHaveProperty("Costo promedio (S/)")
    const costos = construirFilas([conCostos], { costos: true })[0]
    expect(costos).toMatchObject({ "Costo promedio (S/)": 616.67, "Último costo (S/)": 150 })
    expect(columnasExcel({ costos: true }).map(c => c.header).slice(4)).toEqual(["Costo promedio (S/)", "Último costo (S/)"])
  })

  it("producto sin categoría exporta «Sin categoría»", () => {
    expect(construirFilas([p(8)], { categoria: true })[0]["Categoría"]).toBe("Sin categoría")
  })
})
