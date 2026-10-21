import { describe, expect, it } from "vitest"
import { pickProfile } from "./manualProfile"

describe("pickProfile (regla corregida: es_maestra primero, nunca un correo)", () => {
  it("es_maestra gana aunque el rol sea otro", () => {
    expect(pickProfile({ es_maestra: true, id_role: 3 })).toBe("master")
  })
  it("roles 2, 5 y 6 dan admin, auditor y técnico", () => {
    expect(pickProfile({ id_role: 2 })).toBe("admin")
    expect(pickProfile({ id_role: 5 })).toBe("auditor")
    expect(pickProfile({ id_role: 6 })).toBe("technician")
  })
  it("tipo_vendedor afiliado da affiliate y el resto seller", () => {
    expect(pickProfile({ id_role: 3, tipo_vendedor: "afiliado" })).toBe("affiliate")
    expect(pickProfile({ id_role: 3, tipo_vendedor: "interno" })).toBe("seller")
  })
  it("un correo igual al maestro NO eleva el perfil (regla vieja eliminada)", () => {
    expect(pickProfile({ id_role: 3, es_maestra: false })).toBe("seller")
  })
  it("sin datos reconocibles cae en seller", () => {
    expect(pickProfile(null)).toBe("seller")
    expect(pickProfile({})).toBe("seller")
  })
})
