import { useLayoutEffect, useRef, useState } from "react"

/** Ancho del contenedor (no del viewport): decide movil (<640) y laptop (<1100). */
export function useAudWidth() {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { host, mob: width < 640, compact: width < 1100 }
}
