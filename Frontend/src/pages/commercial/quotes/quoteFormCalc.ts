import { num, phone, type StockProduct } from "./quotesShared"

export interface FormLine { id: number; cant: string; precio: string }
export interface FormState {
  nombre: string; tel: string; doc: string; mail: string; esc: string; vig: string; desc: string; notas: string
  more: boolean; nOpen: boolean; lines: FormLine[]; tried: boolean
}
export const blankForm = (): FormState => ({
  nombre: "", tel: "", doc: "", mail: "", esc: "personalizada", vig: "7", desc: "", notas: "",
  more: false, nOpen: false, lines: [], tried: false,
})

export function calc(f: FormState, products: StockProduct[]) {
  const sub = f.lines.reduce((s, l) => s + num(l.cant) * num(l.precio), 0)
  const desc = num(f.desc), tot = sub - desc
  const cost = f.lines.reduce((s, l) => s + num(l.cant) * num(products.find(p => p.id_producto === l.id)?.costo_promedio), 0)
  return { sub, desc, tot, cost, mg: Math.round((tot / 1.18 - cost) * 100) / 100 }
}

export function validate(f: FormState, products: StockProduct[]): Record<string, string> {
  const e: Record<string, string> = {}, k = calc(f, products)
  if (!f.nombre.trim()) e.nombre = "Escribe el nombre del cliente."
  if (f.mail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.mail.trim())) e.mail = "El correo no es válido."
  const v = Number(f.vig)
  if (!Number.isInteger(v) || v < 1 || v > 90) e.vig = "De 1 a 90 días."
  if (!f.lines.length) e.lines = "Agrega al menos un producto."
  for (const l of f.lines) {
    const st = products.find(p => p.id_producto === l.id)?.stock ?? 0, c = Number(l.cant)
    if (!Number.isInteger(c) || c < 1) e[`q${l.id}`] = "Escribe una cantidad entera de 1 o más."
    else if (c > st) e[`q${l.id}`] = `Solo hay ${st} en stock.`
    if (!(num(l.precio) > 0)) e[`p${l.id}`] = "El precio debe ser mayor que 0."
  }
  if (f.lines.length && (k.desc < 0)) e.desc = "El descuento no puede ser negativo."
  else if (f.lines.length && k.desc >= k.sub) e.desc = "El descuento debe ser menor que el subtotal."
  return e
}
export const canWa = (f: FormState) => !!phone(f.tel)
