import { describe, expect, it } from "vitest"
import { code128Modulos, code128Path, code128Valores, esCode128Valido } from "./barcode128"

// Esperado generado con bwip-js 4.10 (referencia independiente).
const SKU_123 = "1101001000011011101000101100011101101110111010011011100100111001101100111001011001011100111011010001100011101011"
const LAP_HP_14 = "11010010000100011011101010001100011101110110100110111001100010100011101110110100110111001001110011011001001110101100100001100011101011"

describe("barcode128", () => {
  it("solo acepta ASCII imprimible", () => {
    expect(esCode128Valido("LAP-HP-14")).toBe(true)
    expect(esCode128Valido("")).toBe(false)
    expect(esCode128Valido("ñandú")).toBe(false)
  })

  it("codifica en Code B igual que la libreria de referencia", () => {
    expect(code128Modulos("SKU-123")).toBe(SKU_123)
    expect(code128Modulos("LAP-HP-14")).toBe(LAP_HP_14)
  })

  it("usa Code C para rachas largas de digitos (13 digitos: el primero va en B)", () => {
    expect(code128Valores("7751234567890")).toEqual([104, 23, 99, 75, 12, 34, 56, 78, 90])
    expect(code128Modulos("1234")).toHaveLength(57)
    expect(code128Modulos("AB1234")).toHaveLength(90)
  })

  it("el camino SVG incluye quiet zone y solo barras", () => {
    const { d, anchoModulos } = code128Path("A", 6)
    expect(anchoModulos).toBe(46 + 12)
    expect(d.startsWith("M6 0h2v1h-2z")).toBe(true)
  })
})
