const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** `S/ 1,234.56` */
export const money = (n: number) => `S/ ${nf.format(n)}`
/** `+S/ 12.00` / `−S/ 12.00` (signo tipográfico) */
export const signedMoney = (n: number) => `${n < 0 ? "−" : "+"}S/ ${nf.format(Math.abs(n))}`
/** Importe real de una venta: total con IGV menos el descuento si lo hubo. */
export const saleAmount = (sale: { total_con_igv: string | number; es_descuento?: boolean; descuento?: number | null }) =>
  (Number(sale.total_con_igv) || 0) - (sale.es_descuento && sale.descuento ? Number(sale.descuento) : 0)

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000
/** Fecha `YYYY-MM-DD` en hora de Lima para un instante (la BD guarda UTC). */
export const limaDate = (input: string | number | Date): string => {
  const raw = typeof input === "string" && /^\d{4}-\d{2}-\d{2} /.test(input) ? input.replace(" ", "T") + "Z" : input
  return new Date(new Date(raw).getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10)
}
export const todayLima = () => limaDate(Date.now())
/** Suma días a una fecha `YYYY-MM-DD` sin depender de la zona del navegador. */
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
/** Lunes de la semana de una fecha `YYYY-MM-DD`. */
export const mondayOf = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay() // 0 = domingo
  return addDays(date, day === 0 ? -6 : 1 - day)
}
/** `2026-10-10` → `10/10` */
export const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
/** `2026-10-10` → `10/10/2026` */
export const longDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
export const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

/** Etiquetas de ejes: 1500 → `1.5k` (ejes) / `1.5k` (valores directos). */
export const tickK = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))
export const valueK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))
/** Una diferencia de caja menor a un centavo cuenta como cuadrada. */
export const isBalanced = (difference: number) => Math.abs(difference) < 0.01
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
export const phoneFmt = (t: string) => t.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")
/** `2026-10-10T…Z` → `10/10/2026 4:45 a. m.` (hora de Lima) */
export const dateTimeLima = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 5 * 3_600_000)
  const h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, "0")
  return `${longDate(d.toISOString().slice(0, 10))} ${((h + 11) % 12) + 1}:${m} ${h < 12 ? "a. m." : "p. m."}`
}
