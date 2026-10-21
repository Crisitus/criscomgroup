import { useEffect, useRef } from "react"

/** Vuelve arriba al cambiar de solicitud o al aparecer un aviso (si no, queda fuera de vista). */
export function useSarScroll(id: number, banner: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: 0 }) }, [id, banner])
  return ref
}
