import { describe, expect, it } from "vitest"
import { qrMatriz, qrPath } from "./qrcode"

// Filas esperadas generadas con bwip-js 4.10 (qrcode, correccion M) para la misma URL.
const URL_40 = "https://criscomgroup.pe/producto/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
const ESPERADO = ["1111111000001000011011110010101111111", "1000001001011111101101001111001000001", "1011101010110011101111001011001011101", "1000001000000001001001101000100010001", "1111111010011101110100111100001010111"]

describe("qrcode", () => {
  it("coincide con la libreria de referencia (version 5, correccion M)", () => {
    const m = qrMatriz(URL_40).map(f => f.map(c => (c ? "1" : "0")).join(""))
    expect(m).toHaveLength(37)
    expect([...m.slice(0, 3), ...m.slice(-2)]).toEqual(ESPERADO)
  })

  it("elige la version minima: URL de producto corta = 29 modulos (version 3)", () => {
    expect(qrMatriz("https://criscomgroup.pe/producto/12")).toHaveLength(29)
  })

  it("rechaza textos que no caben", () => {
    expect(() => qrMatriz("x".repeat(300))).toThrow()
  })

  it("el camino SVG suma la quiet zone", () => {
    const { size, d } = qrPath("https://criscomgroup.pe/producto/12", 2)
    expect(size).toBe(33)
    expect(d.startsWith("M2 2h7")).toBe(true)
  })
})
