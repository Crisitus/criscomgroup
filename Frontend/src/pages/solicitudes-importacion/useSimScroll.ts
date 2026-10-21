import { useEffect, useRef } from "react"

/** Vuelve arriba al cambiar de solicitud o al aparecer un aviso. */
export function useScrollTop(id: number, aviso: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: 0 }) }, [id, aviso])
  return ref
}
