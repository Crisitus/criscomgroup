// Logica compartida del catalogo y la ficha de producto (port criscom-ecom-catalogo).
// Contrato: GET /productos devuelve TODO sin paginar; filtros, orden y paginacion son del cliente.
import type { Product } from "@/services/ecommerceApi"
import { IMAGE_BASE_URL } from "@/config/constants"
import type { CartItemHome } from "@/components/home/homeShared"
import { isSeed } from "@/components/home/homeShared"

export const PER_PAGE = 12

// URL de imagen: absoluta tal cual; relativa contra IMAGE_BASE_URL con /storage.
export const buildImageUrl = (path?: string | null): string => {
  if (!path) return ""
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\/+/, "")
  return clean.startsWith("storage/") ? `${IMAGE_BASE_URL}/${clean}` : `${IMAGE_BASE_URL}/storage/${clean}`
}

// Texto visible: sin marcas internas seed-* (nunca crudas en pantalla).
export const cleanTexto = (s?: string | null): string => {
  const t = String(s || "").replace(/seed-[\w-]+/gi, "").replace(/[|]/g, " ").replace(/\s{2,}/g, " ").trim()
  return t
}

// Descripcion mostrable: null si es solo una marca seed.
export const descVisible = (s?: string | null): string | null => {
  if (!s || isSeed(s)) return null
  const t = cleanTexto(s)
  return t || null
}

// Precio efectivo (oferta vigente si la hay).
export const precioEfectivo = (p: Product): number => Number(p.precio_de_oferta ?? p.price) || 0

export interface StockInfo { kind: "ok" | "lw" | "no"; label: string }
export const stockInfo = (stock: number): StockInfo =>
  stock <= 0 ? { kind: "no", label: "Agotado" }
    : stock <= 3 ? { kind: "lw", label: `Últimas ${stock}` }
    : { kind: "ok", label: "En stock" }

// ===== Filtros del cliente =====
export interface Filtros {
  q: string
  cats: number[]
  oferta: boolean
  stock: boolean
  min: string
  max: string
  orden: "nombre" | "pa" | "pd" | "rec"
  page: number
}

export const F0 = (): Filtros => ({ q: "", cats: [], oferta: false, stock: false, min: "", max: "", orden: "nombre", page: 1 })

export const nActivos = (f: Filtros): number =>
  f.cats.length + (f.oferta ? 1 : 0) + (f.stock ? 1 : 0) + (f.min !== "" || f.max !== "" ? 1 : 0)

export const norm = (s?: string | null): string =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

const NUM = new Intl.NumberFormat("en-US")
const mn0 = (v: string): string => `S/ ${NUM.format(Number(v))}`

export const precioLbl = (f: Filtros): string =>
  f.min !== "" && f.max !== "" ? `${mn0(f.min)} - ${mn0(f.max)}`
    : f.min !== "" ? `Desde ${mn0(f.min)}`
    : f.max !== "" ? `Hasta ${mn0(f.max)}` : "Precio"

export function filtrar(productos: Product[], f: Filtros): Product[] {
  const q = norm(f.q).trim()
  const l = productos.filter((p) => {
    if (q && !(norm(p.name).includes(q) || norm(p.description).includes(q) || norm(p.category?.name).includes(q))) return false
    if (f.cats.length && !f.cats.includes(p.category_id)) return false
    if (f.oferta && p.precio_de_oferta == null) return false
    if (f.stock && p.stock <= 0) return false
    if (f.min !== "" && precioEfectivo(p) < Number(f.min)) return false
    if (f.max !== "" && precioEfectivo(p) > Number(f.max)) return false
    return true
  })
  const S: Record<string, (a: Product, b: Product) => number> = {
    nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    pa: (a, b) => precioEfectivo(a) - precioEfectivo(b),
    pd: (a, b) => precioEfectivo(b) - precioEfectivo(a),
    rec: (a, b) => b.id - a.id, // el contrato no trae fecha: id desc
  }
  return l.sort(S[f.orden] || S.nombre)
}

// Agregar al carrito de invitado limitado al stock (mismo contrato que homeShared.addToCartHome).
// Devuelve las unidades realmente agregadas (0 = ya no caben).
export const addToCartQty = (item: Omit<CartItemHome, "quantity">, qty: number, stock: number): number => {
  try {
    const saved = localStorage.getItem("catalogo_cart_items")
    const cart: CartItemHome[] = saved ? JSON.parse(saved) : []
    const found = cart.find((it) => it.productId === item.productId)
    const actual = found?.quantity || 0
    const caben = Math.max(0, Math.min(qty, stock - actual))
    if (caben <= 0) return 0
    const next = found
      ? cart.map((it) => (it.productId === item.productId ? { ...it, quantity: it.quantity + caben } : it))
      : [...cart, { ...item, quantity: caben }]
    localStorage.setItem("catalogo_cart_items", JSON.stringify(next))
    window.dispatchEvent(new Event("catalogo_cart_items_updated"))
    window.dispatchEvent(
      new CustomEvent("criscom:cart-added", { detail: { productName: item.name, quantity: caben, productId: item.productId } }),
    )
    return caben
  } catch {
    return 0
  }
}
