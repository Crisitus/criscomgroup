import { describe, expect, it } from "vitest"
import type { Product } from "../../../services/productService"
import { contadoresChips, hojasDe, motivoAccion, precioEfectivo } from "./tkLogic"

const prod = (extra: Partial<Product>): Product => extra as Product

describe("tkLogic", () => {
  it("hojasDe: 21 etiquetas por hoja A4, 0 etiquetas = 0 hojas", () => {
    expect(hojasDe(0)).toBe(0)
    expect(hojasDe(21)).toBe(1)
    expect(hojasDe(22)).toBe(2)
    expect(hojasDe(30)).toBe(2)
  })

  it("motivoAccion: prioriza carga/permiso, luego seleccion vacia y tope de 600", () => {
    expect(motivoAccion("loading", 5, 5)).toBe("Cargando productos…")
    expect(motivoAccion("403", 5, 5)).toBe("No tienes permiso para ver los productos")
    expect(motivoAccion("ok", 0, 0)).toBe("Selecciona al menos un producto")
    expect(motivoAccion("ok", 31, 620)).toBe("Máximo 600 etiquetas por PDF")
    expect(motivoAccion("ok", 2, 2)).toBe("")
  })

  it("precioEfectivo: oferta solo cuando es_oferta y el precio de oferta es > 0", () => {
    expect(precioEfectivo(prod({ es_oferta: true, precio_oferta_con_igv: "69.62", precio_unitario_con_igv: "93.22" })))
      .toEqual({ actual: 69.62, antes: 93.22 })
    expect(precioEfectivo(prod({ es_oferta: false, precio_oferta_con_igv: "69.62", precio_unitario_con_igv: "93.22" })))
      .toEqual({ actual: 93.22, antes: null })
    expect(precioEfectivo(prod({ es_oferta: true, precio_oferta_con_igv: "0", precio_unitario_con_igv: "93.22" })))
      .toEqual({ actual: 93.22, antes: null })
  })

  it("contadoresChips: cuenta stock > 0 y ofertas del catalogo", () => {
    const lista = [prod({ stock: 5, es_oferta: false }), prod({ stock: 0, es_oferta: true }), prod({ stock: 3, es_oferta: true })]
    expect(contadoresChips(lista)).toEqual({ stock: 2, oferta: 2 })
  })
})
