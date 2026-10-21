export interface DraftLine { key: string; producto_id: number; nombre: string; sku: string; stock: number; q: string; c: string }

const num = (v: string) => { const n = parseFloat(String(v).replace(/,/g, "")); return Number.isFinite(n) ? n : 0 }
export const qtyOf = (l: DraftLine) => Math.floor(num(l.q))
export const costOf = (l: DraftLine) => num(l.c)

/** Mismo prorrateo que el backend: flete por valor entre las lineas; todo a soles con el TC si es USD. */
export function calc(lines: DraftLine[], flete: number, usd: boolean, tc: number) {
  const val = lines.reduce((s, l) => s + qtyOf(l) * costOf(l), 0)
  const k = val ? flete / val : 0
  const r2 = (n: number) => Math.round(n * 100 + 1e-9) / 100
  const rows = lines.map(l => {
    const raw = costOf(l) * (1 + k)
    const pen = r2(raw * (usd ? tc : 1))
    // En soles el backend redondea el costo asignado y luego multiplica; en USD muestra el valor del documento.
    const asig = usd ? r2(raw) : pen
    return { asig, sub: usd ? qtyOf(l) * raw : r2(qtyOf(l) * pen), pen }
  })
  const total = val + flete
  return { rows, val, total, uni: lines.reduce((s, l) => s + qtyOf(l), 0), pen: total * (usd ? tc : 1) }
}
export const toNum = num
