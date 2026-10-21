import { describe, expect, it } from "vitest"
import { accessDate, daysLabel, fmtAccess, solByExpiry, solVigencia } from "./solCommon"

const NOW = new Date(2026, 9, 11, 10, 42) // 11/10/2026 10:42 local (Lima), como la maqueta

describe("accessDate (GET /access/my trae fechas de pared de Lima sin zona)", () => {
  it("lee 'YYYY-MM-DD HH:mm:ss' como hora local del servidor", () => {
    const d = accessDate("2026-10-17 18:00:00")
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getHours()).toBe(18)
  })
  it("acepta ISO con zona y rechaza basura", () => {
    expect(accessDate("2026-10-17T18:00:00-05:00")?.getUTCHours()).toBe(23)
    expect(accessDate("no-es-fecha")).toBeNull()
    expect(accessDate(null)).toBeNull()
  })
})

describe("solVigencia (chips icono + palabra)", () => {
  it("vencido / hoy / mañana / en N días", () => {
    expect(solVigencia("2026-10-10 18:00:00", NOW)).toMatchObject({ t: "Vencido", c: "bad" })
    expect(solVigencia("2026-10-11 18:00:00", NOW)).toMatchObject({ t: "Vence hoy", c: "warn" })
    expect(solVigencia("2026-10-12 09:00:00", NOW)).toMatchObject({ t: "Vence mañana", c: "warn" })
    expect(solVigencia("2026-10-17 18:00:00", NOW)).toMatchObject({ t: "Vence en 6 días", c: "neu" })
  })
  it("sin vencimiento es neutro", () => {
    expect(solVigencia(null, NOW).t).toBe("Sin vencimiento")
  })
})

describe("solByExpiry y etiquetas", () => {
  it("ordena por vencimiento, sin vencimiento al final", () => {
    const l = solByExpiry([{ expires_at: null }, { expires_at: "2026-10-17 18:00:00" }, { expires_at: "2026-10-11 18:00:00" }])
    expect(l.map(x => x.expires_at)).toEqual(["2026-10-11 18:00:00", "2026-10-17 18:00:00", null])
  })
  it("formato dd/mm/aaaa h:mm a. m. y etiqueta de días", () => {
    expect(fmtAccess("2026-10-17 18:00:00")).toBe("17/10/2026 6:00 p. m.")
    expect(daysLabel(1)).toBe("1 día")
    expect(daysLabel(30)).toBe("30 días")
  })
})
