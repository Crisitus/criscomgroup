"use client"

import React, { useState, useCallback } from "react"
import { PDFViewer, pdf } from "@react-pdf/renderer"
import { ProductPDFDocument } from "./product-pdf-document-stable.tsx"
import { ErrorBoundary } from "./error-boundary"
import { Button } from "../components/ui/button"
import { Download, Eye } from "lucide-react"

interface PDFWrapperProps {
  productos: any[]
  codigosBarras: Record<number, string[]>
  config: any
  productosSeleccionados: Set<number>
  onCargarCodigosBarras?: (productos: any[]) => Promise<void>
}

export const PDFWrapper: React.FC<PDFWrapperProps> = ({ 
  productos, 
  codigosBarras, 
  config, 
  productosSeleccionados,
  onCargarCodigosBarras 
}) => {
  const [pdfKey, setPdfKey] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [cargandoCodigos, setCargandoCodigos] = useState(false)

  // Crear una key única basada en la configuración para forzar re-renders
  const configKey = React.useMemo(() => {
    return JSON.stringify({
      usarPrecioOfertaEnLugarUnitario: config.usarPrecioOfertaEnLugarUnitario,
      mostrarPrecioOferta: config.mostrarPrecioOferta,
      mostrarPrecioUnitario: config.mostrarPrecioUnitario,
      mostrarPrecioMayorista: config.mostrarPrecioMayorista,
      mostrarCodigoBarras: config.mostrarCodigoBarras,
      tamanoFuente: config.tamanoFuente,
    })
  }, [config])

  // Forzar re-creación del componente PDF cuando cambie la configuración crítica
  const handleConfigChange = useCallback(() => {
    setPdfKey((prev) => prev + 1)
    // Cerrar vista previa si está abierta para evitar mostrar contenido desactualizado
    setShowPreview(false)
  }, [])

  // Detectar cambios en configuración crítica usando configKey
  React.useEffect(() => {
    handleConfigChange()
  }, [configKey, handleConfigChange])

  const productosParaPDF = React.useMemo(() => {
    try {
      const productosSeleccionadosArray = Array.from(productosSeleccionados)

      return productos
        .filter((p) => productosSeleccionadosArray.includes(p.id_producto))
        .map((producto) => ({
          ...producto,
          precio_unitario_con_igv: producto.precio_unitario_con_igv || "0",
          precio_mayoritario_con_igv: producto.precio_mayoritario_con_igv || "0",
          precio_oferta_con_igv: producto.precio_oferta_con_igv || "0",
          stock: producto.stock || 0,
          es_oferta: Boolean(producto.es_oferta),
          nombre: producto.nombre || "Producto sin nombre",
          sku: producto.sku || "Sin SKU",
        }))
    } catch (error) {
      console.error("Error al preparar productos para PDF:", error)
      return []
    }
  }, [productos, productosSeleccionados])

  // Función para cargar códigos de barras antes de generar PDF
  const cargarCodigosYGenerar = useCallback(async (callback: () => void) => {
    if (productosParaPDF.length === 0) return

    setCargandoCodigos(true)
    try {
      if (onCargarCodigosBarras) {
        await onCargarCodigosBarras(productosParaPDF)
      }
      callback()
    } catch (error) {
      console.error("Error al cargar códigos:", error)
    } finally {
      setCargandoCodigos(false)
    }
  }, [productosParaPDF, onCargarCodigosBarras])

  // Función para descargar PDF manualmente
  const descargarPDFManual = useCallback(async () => {
    try {
      setCargandoCodigos(true)
      if (onCargarCodigosBarras) {
        await onCargarCodigosBarras(productosParaPDF)
      }
      
      const doc = <ProductPDFDocument productos={productosParaPDF} codigosBarras={codigosBarras} config={config} />
      const pdfBlob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tickets-productos-${new Date().toISOString().split("T")[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al generar PDF:", error)
    } finally {
      setCargandoCodigos(false)
    }
  }, [productosParaPDF, codigosBarras, config, onCargarCodigosBarras])

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={productosSeleccionados.size === 0 || cargandoCodigos}
          onClick={() => cargarCodigosYGenerar(() => setShowPreview(true))}
        >
          <Eye className="h-4 w-4 mr-2" />
          {cargandoCodigos ? "Cargando..." : "Vista previa"}
        </Button>

        <ErrorBoundary key={`pdf-wrapper-${pdfKey}-${configKey}`}>
          {productosParaPDF.length > 0 ? (
            <Button
              disabled={productosSeleccionados.size === 0 || cargandoCodigos}
              onClick={descargarPDFManual}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Download className="h-4 w-4 mr-2" />
              {cargandoCodigos ? "Preparando..." : "Descargar PDF"}
            </Button>
          ) : (
            <Button
              disabled={true}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Selecciona productos
            </Button>
          )}
        </ErrorBoundary>
      </div>

      {/* Modal de vista previa */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border max-w-4xl w-full h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <span className="font-semibold text-lg">Vista previa PDF</span>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <ErrorBoundary key={`pdf-viewer-${pdfKey}-${configKey}`}>
                <PDFViewer width="100%" height="100%">
                  <ProductPDFDocument productos={productosParaPDF} codigosBarras={codigosBarras} config={config} />
                </PDFViewer>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
