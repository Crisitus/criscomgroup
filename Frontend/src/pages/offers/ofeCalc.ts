import type { Product } from "../../services/productService"

export const SEP = " · "
export const DASH = "—"
export const EN = "–"
export const ELL = "…"
export const MINUS = "−"
export const ARROW = "→"
export const Q = (s: string) => `«${s}»`

export const PAGE = 25
export const MAX_BATCH = 500
const IGV = 1.18

export type Mode = "pct" | "fix"
export type Seg = "all" | "on" | "off"
export type Sort = "oferta" | "name_asc" | "name_desc" | "desc" | "margen" | "stock_asc" | "stock_desc" | "id_desc" | "id_asc"

export interface OfeRow {
  p: Product
  id: number
  normal: number
  mayor: number | null
  offer: number | null
  pct: number | null
  /** null = costo no disponible; 0 = sin costo registrado */
  cost: number | null
}

export interface Calc {
  err?: string
  noprice?: boolean
  price?: number
  pct?: number
  save?: number
  m?: number | null
  nocost?: boolean
  below?: boolean
  rep?: string | null
}

export const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100
export const money = (n: number) => "S/ " + r2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fp = (n: number) => `${String(r2(n)).replace("-", MINUS)} %`
export const mg = (price: number, c: number | null) => (c !== null && c > 0 && price > 0 ? ((price / IGV - c) / (price / IGV)) * 100 : null)
export const mgs = (m: number) => `${(Math.round(m * 10) / 10).toFixed(1).replace("-", MINUS)} %`
export const plu = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

export function buildRow(p: Product, cost: number | null): OfeRow {
  const normal = Number(p.precio_unitario_con_igv) || 0
  const offer = p.es_oferta && p.precio_oferta_con_igv ? Number(p.precio_oferta_con_igv) : null
  return {
    p, id: p.id_producto, normal,
    mayor: p.precio_mayoritario_con_igv ? Number(p.precio_mayoritario_con_igv) : null,
    offer, pct: offer !== null && normal > 0 ? r2((1 - offer / normal) * 100) : null,
    cost,
  }
}

/** Qué quedaría si se aplica: porcentaje entero 1–99 o precio fijo con IGV menor al normal. */
export function calc(r: OfeRow, mode: Mode, pct: number, fix: Record<number, string>): Calc {
  if (r.normal <= 0) return { err: "Sin precio normal válido: no admite oferta", noprice: true }
  let price: number
  if (mode === "fix") {
    const raw = fix[r.id]
    if (raw === undefined || raw === "") return { err: "Escribe el precio con IGV" }
    price = Number(raw)
    if (!(price > 0)) return { err: "'precio_fijo' debe ser un número mayor a 0" }
    if (r2(price) >= r.normal) return { err: `'precio_fijo' (${r2(price)}) debe ser menor al precio normal con IGV (${r2(r.normal)})` }
  } else price = r2(r.normal * (1 - pct / 100))
  const np = r2((1 - price / r.normal) * 100)
  const m = mg(price, r.cost)
  return {
    price, pct: np, save: r2(r.normal - price), m, nocost: r.cost === 0, below: m !== null && m < 0,
    rep: r.pct !== null ? `Reemplaza ${fp(r.pct)} ${ARROW} ${fp(np)}` : null,
  }
}

export function summary(rows: OfeRow[], mode: Mode, pct: number, fix: Record<number, string>) {
  const cs = rows.map(r => ({ r, c: calc(r, mode, pct, fix) }))
  const ok = cs.filter(x => !x.c.err)
  const bad = cs.filter(x => x.c.err)
  const ms = ok.map(x => x.c.m).filter((m): m is number => m !== null && m !== undefined)
  return {
    n: rows.length, cs, ok, bad,
    avg: ok.length ? ok.reduce((a, x) => a + (x.c.price || 0), 0) / ok.length : null,
    save: ok.reduce((a, x) => a + (x.c.save || 0), 0),
    min: ms.length ? Math.min(...ms) : null,
    below: ok.filter(x => x.c.below).length,
    nocost: ok.filter(x => x.c.nocost).length,
    rep: ok.filter(x => x.c.rep).length,
    withOffer: rows.filter(r => r.offer !== null).length,
  }
}
export type Summ = ReturnType<typeof summary>

export function applyReason(off: boolean, S: Summ, mode: Mode): string | null {
  if (off) return "Fuera de horario: las ofertas solo se cambian dentro del horario laboral."
  if (S.n > MAX_BATCH) return `Máximo ${MAX_BATCH} productos por lote: quita ${S.n - MAX_BATCH} de la selección.`
  if (S.bad.length) {
    return mode === "fix"
      ? `Corrige ${plu(S.bad.length, "precio", "precios")}: cada precio fijo debe ser menor al precio normal.`
      : `${plu(S.bad.length, "producto", "productos")} sin precio normal válido: quítalos de la selección.`
  }
  return null
}
