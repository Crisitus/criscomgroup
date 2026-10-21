import { useLayoutEffect, useRef, useState } from "react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { TkDesktop, TkMovilEnv } from "./tickets/TkBody"
import { useTkPage } from "./tickets/useTkPage"
import "../../styles/tickets.css"

/** Generador de Tickets PDF (/erp/generate-ticket-pdf). Entrada fina: estado en useTkPage, piezas en ./tickets/. */
const GenerateCardProductPage = () => {
  useDocumentTitle("Generador de Tickets PDF")
  const p = useTkPage()
  const host = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  const [filtros, setFiltros] = useState(false)
  const [hoja, setHoja] = useState(false)
  const [barAlto, setBarAlto] = useState(86)

  // Modo movil por el ancho del contenedor (no del viewport).
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const movil = width < 640

  // La hoja «A4 y opciones» termina justo sobre la barra fija: se mide su alto real.
  useLayoutEffect(() => {
    if (movil && barRef.current) setBarAlto(barRef.current.offsetHeight)
  }, [movil, p.motivo, p.gen, p.n])

  return (
    <div ref={host} className={`pg-tickets${movil ? " fx" : ""}`} style={movil ? ({ "--bb": `${barAlto}px` } as React.CSSProperties) : undefined}>
      {movil
        ? <TkMovilEnv p={p} filtros={filtros} onFiltros={() => setFiltros(v => !v)} hoja={hoja} onHoja={setHoja} barRef={barRef} />
        : <TkDesktop p={p} compacto={width < 1100} />}
    </div>
  )
}

export default GenerateCardProductPage
