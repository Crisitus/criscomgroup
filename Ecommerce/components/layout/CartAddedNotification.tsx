'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ShoppingCart, X } from 'lucide-react'

type CartAddedDetail = { productName?: string; quantity?: number }

export default function CartAddedNotification() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleCartAdded = (event: Event) => {
      const { productName, quantity = 1 } = (event as CustomEvent<CartAddedDetail>).detail || {}
      const safeName = productName?.trim() || 'El producto'
      const units = quantity > 1 ? ` (${quantity} unidades)` : ''
      setMessage(`${safeName} se agregó al carrito${units}`)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setMessage(null), 3500)
    }
    window.addEventListener('criscom:cart-added', handleCartAdded)
    return () => {
      window.removeEventListener('criscom:cart-added', handleCartAdded)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!message) return null

  return (
    <div className="fixed right-4 top-4 z-[10000] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-3 fade-in duration-200" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 fill-slate-950 text-emerald-400" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-400">¡Agregado correctamente!</p>
          <p className="truncate text-sm text-slate-200">{message}</p>
        </div>
        <button type="button" onClick={() => setMessage(null)} className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar notificación">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
