import { calc, type Calc, type Mode, type OfeRow } from "./ofeCalc"

export interface RowCtx {
  mode: Mode; pct: number; fix: Record<number, string>; sel: number[]
  off: boolean; hasResult: boolean; busy: boolean
  onPrice: (id: number, v: string) => void; onBlur: (id: number) => void
  onPick: (r: OfeRow) => void; setMany: (ids: number[], on: boolean) => void
  onOfertar: (r: OfeRow) => void; onQuitar: (r: OfeRow) => void
}

export interface RowView { on: boolean; dis: boolean; c: Calc | null }
export const rowView = (r: OfeRow, x: RowCtx): RowView => {
  const dis = r.normal <= 0
  const on = x.sel.includes(r.id)
  return { on, dis, c: on && !dis ? calc(r, x.mode, x.pct, x.fix) : null }
}

