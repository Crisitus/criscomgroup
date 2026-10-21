import { useEffect, useRef } from "react"

/** Vuelve arriba al cambiar de hoja o al aparecer un aviso (si no, queda fuera de vista). */
export function useScrollTop(id: number, banner: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: 0 }) }, [id, banner])
  return ref
}
