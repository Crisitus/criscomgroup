import { useLayoutEffect, useRef, useState } from "react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ExpDesktop, ExpMovil } from "./exportar/ExpBody"
import { useExpPage } from "./exportar/useExpPage"
import "../../styles/exportar.css"

/** Exportar productos (Excel). Entrada fina: estado en useExpPage, piezas en ./exportar/. */
const GenerateExcelProductsPage = () => {
  useDocumentTitle("Exportar productos")
  const p = useExpPage()
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

  // La hoja «Archivo» termina justo sobre la barra fija: se mide su alto real.
  useLayoutEffect(() => {
    if (movil && barRef.current) setBarAlto(barRef.current.offsetHeight)
  }, [movil, p.motivo, p.busy, p.aExportar.length])

  return (
    <div ref={host} className={`pg-exportar${movil ? " fx" : ""}`} style={movil ? ({ "--bb": `${barAlto}px` } as React.CSSProperties) : undefined}>
      {movil
        ? <ExpMovil p={p} filtros={filtros} onFiltros={() => setFiltros(v => !v)} hoja={hoja} onHoja={setHoja} barRef={barRef} />
        : <ExpDesktop p={p} compacto={width < 1100} />}
    </div>
  )
}

export default GenerateExcelProductsPage
