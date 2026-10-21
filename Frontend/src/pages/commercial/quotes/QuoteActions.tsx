import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Info, MessageCircle, MoreHorizontal, RotateCcw, Send, ShoppingCart } from "lucide-react"
import { I, venceInfo, ventaId, type Estado, type Quote } from "./quotesShared"

export interface Handlers {
  busy: boolean
  onWa: (q: Quote) => void
  onConvert: () => void
  onReject: () => void
  onTo: (e: Estado) => void
}
const MENU: Partial<Record<Estado, [Estado, string, typeof Send]>> = {
  borrador: ["enviada", "Marcar como enviada", Send],
  enviada: ["borrador", "Volver a borrador", RotateCcw],
  aprobada: ["enviada", "Volver a enviada", RotateCcw],
}

function Menu({ q, h }: { q: Quote; h: Handlers }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key)
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key) }
  }, [open])
  const m = MENU[q.estado]
  if (!m || !q.transiciones.includes(m[0])) return null
  const [to, label, Icon] = m
  return (
    <span className="hw" ref={ref}>
      <button type="button" className="btn out sq" aria-label="Más acciones" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>{I(MoreHorizontal, 18)}</button>
      {open && <div className="menu" role="menu"><button type="button" role="menuitem" disabled={h.busy} onClick={() => { setOpen(false); h.onTo(to) }}>{I(Icon, 16)}{label}</button></div>}
    </span>
  )
}

export function actionsFor(q: Quote, h: Handlers, whyId: string): { p: ReactNode; s: ReactNode; w: ReactNode } {
  const e = q.estado
  const convert = <button type="button" className="btn" aria-disabled={h.busy} onClick={() => !h.busy && h.onConvert()}>{I(ShoppingCart, 16)}Convertir en venta</button>
  const disabled = <span className="hw"><button type="button" className="btn" aria-disabled="true" aria-describedby={whyId}>{I(ShoppingCart, 16)}Convertir en venta</button></span>
  const wa = (primary: boolean) => <button type="button" className={primary ? "btn" : "btn out"} aria-disabled={h.busy} onClick={() => !h.busy && h.onWa(q)}>{I(MessageCircle, 16)}Enviar por WhatsApp</button>
  const rej = q.transiciones.includes("rechazada") ? <button type="button" className="btn out" aria-disabled={h.busy} onClick={() => !h.busy && h.onReject()}>Rechazar</button> : null
  const why = (t: string, tone: string) => <p className={`why ${tone}`} id={whyId}>{I(Info, 16)}<span>{t}</span></p>
  if (e === "borrador") return { p: wa(true), s: <>{disabled}<span className="end">{rej}<Menu q={q} h={h} /></span></>, w: why("Envía la cotización primero: solo se convierte una enviada o aprobada.", "neu") }
  if (e === "enviada") return {
    p: convert, w: null,
    s: <>{q.transiciones.includes("aprobada") && <button type="button" className="btn out" aria-disabled={h.busy} onClick={() => !h.busy && h.onTo("aprobada")}>Marcar aprobada</button>}{wa(false)}<span className="end">{rej}<Menu q={q} h={h} /></span></>,
  }
  if (e === "aprobada") return { p: convert, w: null, s: <>{wa(false)}<span className="end">{rej}<Menu q={q} h={h} /></span></> }
  if (e === "vencida") return { p: disabled, s: null, w: why(`${venceInfo(q)?.long}. Es solo de lectura: no se convierte ni cambia de estado.`, "warn") }
  if (e === "rechazada") return { p: disabled, s: null, w: why("Rechazada: es un estado final, ya no se convierte ni cambia de estado.", "neu") }
  const v = ventaId(q)
  return { p: v ? <Link className="btn" to={`/sales/${v}`}>{I(ShoppingCart, 16)}Ver venta #{v}</Link> : null, s: null, w: null }
}
