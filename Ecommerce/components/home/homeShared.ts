// Utilidades compartidas del home (port criscom-ecom-home).
import type { LucideIcon } from "lucide-react"
import { Cpu, Key, Laptop, Monitor, Mouse, Network, Package, Wrench } from "lucide-react"

// Moneda peruana con separador de miles: S/ 1,234.56 (tabular-nums en CSS).
export const money = (v: number | string): string =>
  "S/ " + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// % de descuento derivado de precio / precio_oferta (derivar está permitido).
export const pctOferta = (precio: string, precioOferta: string): number =>
  Math.round((1 - Number(precioOferta) / Number(precio)) * 100)

// Los datos sembrados llevan prefijo interno "seed-*": nunca se muestra crudo.
export const isSeed = (s?: string | null): boolean => /^seed-/i.test((s || "").trim())

const TITULOS_CONOCIDOS: Record<string, string> = {
  "Servicio tecnico express": "Servicio técnico exprés",
  "Video presentacion": "Conoce Criscom Group",
}

export const cleanTitulo = (s?: string | null): string => {
  const t = String(s || "").replace(/^seed-[\w]+\s*\|?\s*/i, "").trim()
  return TITULOS_CONOCIDOS[t] || t
}

// Fecha del blog en hora de Lima, formato dd/mm/aaaa.
export const fmtFecha = (iso: string): string => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${partes.day}/${partes.month}/${partes.year}`
}

// Número crudo (solo dígitos) -> URL wa.me. Vacío si no hay número.
export const waHref = (numero?: string | null): string | null => {
  const digitos = String(numero || "").replace(/\D/g, "")
  return digitos ? `https://wa.me/${digitos}` : null
}

// Icono lucide por nombre de categoría (el backend no manda icono).
const CAT_ICON: [RegExp, LucideIcon][] = [
  [/repuesto|reparaci/i, Wrench],
  [/laptop/i, Laptop],
  [/componente/i, Cpu],
  [/accesorio/i, Mouse],
  [/monitor/i, Monitor],
  [/red/i, Network],
  [/software|licencia/i, Key],
]
export const catIcon = (nombre: string): LucideIcon =>
  (CAT_ICON.find(([re]) => re.test(nombre)) || [null, Package])[1]

// Carrito de invitado en localStorage (contrato: catalogo_cart_items).
export interface CartItemHome {
  productId: number
  name: string
  price: number
  imagen?: string
  affiliate_business_id?: number | null
  quantity: number
}

export const addToCartHome = (item: Omit<CartItemHome, "quantity">): void => {
  try {
    const saved = localStorage.getItem("catalogo_cart_items")
    const cart: CartItemHome[] = saved ? JSON.parse(saved) : []
    const found = cart.find((it) => it.productId === item.productId)
    const next = found
      ? cart.map((it) => (it.productId === item.productId ? { ...it, quantity: it.quantity + 1 } : it))
      : [...cart, { ...item, quantity: 1 }]
    localStorage.setItem("catalogo_cart_items", JSON.stringify(next))
    window.dispatchEvent(new Event("catalogo_cart_items_updated"))
    window.dispatchEvent(
      new CustomEvent("criscom:cart-added", { detail: { productName: item.name, quantity: 1, productId: item.productId } }),
    )
  } catch {
    // localStorage lleno o bloqueado: el badge simplemente no se actualiza.
  }
}
