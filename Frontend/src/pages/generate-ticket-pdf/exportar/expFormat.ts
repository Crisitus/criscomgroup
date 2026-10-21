export const pl = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

const dos = (n: number) => String(n).padStart(2, "0")

/** `10/10/2026` */
export const fechaDMA = (d: Date) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`
/** `8:36 p. m.` */
export const horaAmPm = (d: Date) => {
  const h = d.getHours()
  return `${h % 12 || 12}:${dos(d.getMinutes())} ${h < 12 ? "a. m." : "p. m."}`
}

export const MOTIVO_COSTOS =
  "Tu rol no puede ver costos. Solo Gerencia, Administración, Auditoría, superusuario temporal o quien tenga permiso de Inventario o Compras pueden exportarlos."

/** Valor de una celda extra tal como se ve en la vista previa (dinero con 2 decimales). */
export const textoCelda = (v: string | number | undefined): string =>
  typeof v === "number" ? v.toFixed(2) : (v ?? "")
