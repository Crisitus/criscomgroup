"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/ticket-dialog"
import { Button } from "../components/ui/button"
import { Printer, Download, X, FileText } from "lucide-react"

// Actualizar la interfaz TicketViewerProps para incluir el tipo de documento
interface TicketViewerProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  title?: string
  documentType?: string // "Factura" o "Boleta"
  pdfBlob?: Blob | null // Nuevo: Blob del PDF si ya existe
  fileName?: string // Nombre personalizado para el archivo
}

// Componente TicketViewer con diseño consistente independiente del tema
const TicketViewer: React.FC<TicketViewerProps> = ({
  isOpen,
  onClose,
  htmlContent,
  title = "Ticket de Venta",
  documentType = "Ticket",
  pdfBlob = null,
  fileName,
}) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Función para imprimir el documento
  const handlePrint = () => {
    if (pdfUrl) {
      // Si tenemos un PDF, abrimos una nueva ventana con el PDF y lo imprimimos
      const printWindow = window.open(pdfUrl, "_blank")
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        alert("Por favor, permita ventanas emergentes para imprimir el documento")
      }
    } else if (htmlContent) {
      // Imprimir el HTML si no hay PDF
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        // Modificar el HTML para optimizarlo para impresión térmica
        const printContent = htmlContent
          .replace(
            "<body",
            '<body style="margin:0;padding:0;width:80mm;max-width:80mm;font-family:monospace;background-color:white;color:black;"',
          )
          .replace(
            "</style>",
            `
             @media print {
               body {
                 width: 80mm !important;
                 margin: 0 !important;
                 padding: 0 !important;
                 background-color: white !important;
                 color: black !important;
               }
               * {
                 color: black !important;
                 background-color: white !important;
               }
               @page {
                 size: 80mm auto;
                 margin: 0mm !important;
               }
             }
           </style>`,
          )

        printWindow.document.write(printContent)
        printWindow.document.close()

        // Esperar a que se carguen los recursos antes de imprimir
        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
        }
      } else {
        alert("Por favor, permita ventanas emergentes para imprimir el documento")
      }
    }
  }
  // Función para descargar el PDF
  const handleDownloadPdf = () => {
    if (pdfUrl) {
      const a = document.createElement("a")
      a.href = pdfUrl
      // Usar el nombre personalizado si está disponible, sino usar el formato anterior
      a.download = fileName ? `${fileName}.pdf` : `${documentType.toLowerCase()}-${new Date().getTime()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else if (htmlContent) {
      // Si no hay PDF pero hay HTML, descargamos el HTML
      const blob = new Blob([htmlContent], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      // Usar el nombre personalizado si está disponible, sino usar el formato anterior
      a.download = fileName ? `${fileName}.html` : `${documentType.toLowerCase()}-${new Date().getTime()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      alert("No hay un documento disponible para descargar")
    }
  }

  // Función para aplicar estilos al iframe después de que se cargue
  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      try {
        const iframeDoc = iframeRef.current.contentDocument

        // Crear un estilo para forzar texto negro en fondo blanco
        const style = iframeDoc.createElement("style")
        style.textContent = `
          body, div, p, span, h1, h2, h3, h4, h5, h6, table, tr, td, th {
            color: black !important;
            background-color: white !important;
          }
          
          * {
            color: black !important;
            background-color: white !important;
          }
        `

        // Añadir el estilo al head del documento
        if (iframeDoc.head) {
          iframeDoc.head.appendChild(style)

          // Añadir estilos específicos para centrar códigos QR
          const qrStyle = iframeDoc.createElement("style")
          qrStyle.textContent = `
            img[src*="qr"], img[alt*="QR"], img.qr-code {
              display: block !important;
              margin: 0 auto !important;
              text-align: center !important;
            }
            
            .qr-container, div:has(> img[src*="qr"]), div:has(> img[alt*="QR"]) {
              text-align: center !important;
              width: 100% !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
          `
          iframeDoc.head.appendChild(qrStyle)
        }

        // Establecer el color de fondo y texto del body
        if (iframeDoc.body) {
          iframeDoc.body.style.backgroundColor = "white"
          iframeDoc.body.style.color = "black"
        }
      } catch (error) {
        console.error("Error al aplicar estilos al iframe:", error)
      }

      // Indicar que la carga ha terminado
      setIsLoading(false)
    }
  }

  // Preparar el PDF o HTML cuando se abre el modal
  useEffect(() => {
    let isMounted = true
    let objectUrlToRevoke: string | null = null

    const prepareDocument = async () => {
      if (!isOpen) return

      setIsLoading(true)
      setErrorMessage(null)

      // Pequeño retraso para asegurar que el modal esté completamente abierto
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Si ya tenemos un blob de PDF, usarlo directamente
      if (pdfBlob) {
        try {
          const url = URL.createObjectURL(pdfBlob)
          objectUrlToRevoke = url
          if (isMounted) {
            setPdfUrl(url)
            // El estado de carga se actualizará cuando el iframe termine de cargar
          }
        } catch (error) {
          console.error("Error al crear URL para el PDF:", error)
          if (isMounted) {
            setErrorMessage("Error al procesar el PDF.")
            setIsLoading(false)
          }
        }
      } else if (htmlContent) {
        // Si no hay PDF pero hay HTML, intentar convertir a PDF
        if (isMounted) setIsPdfGenerating(true)

        try {
          // Importar la función de conversión dinámicamente
          const { convertHtmlToPdf } = await import("../services/invoiceService")

          try {
            const pdfResult = await convertHtmlToPdf(htmlContent)
            const url = URL.createObjectURL(pdfResult)
            objectUrlToRevoke = url

            if (isMounted) {
              setPdfUrl(url)
              setIsPdfGenerating(false)
              // El estado de carga se actualizará cuando el iframe termine de cargar
            }
          } catch (error) {
            console.error("Error al convertir HTML a PDF:", error)
            if (isMounted) {
              setErrorMessage("No se pudo generar el PDF.")
              setIsPdfGenerating(false)
              setIsLoading(false)
            }
          }
        } catch (error) {
          console.error("Error al importar el servicio de conversión:", error)
          if (isMounted) {
            setErrorMessage("No se pudo generar el PDF.")
            setIsPdfGenerating(false)
            setIsLoading(false)
          }
        }
      } else {
        // Si no hay ni PDF ni HTML, mostrar mensaje de error
        if (isMounted) {
          setErrorMessage("No se pudo generar el documento. Contacte al administrador.")
          setIsLoading(false)
        }
      }
    }

    if (isOpen) {
      prepareDocument()
    }

    // Limpiar URL y estado al cerrar
    return () => {
      isMounted = false
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
      setPdfUrl(null)
      setIsLoading(true)
    }
  }, [isOpen, pdfBlob, htmlContent])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 border-0 transition-all duration-300"
        style={{
          backgroundColor: "#1f2937", // Fondo oscuro fijo para el modal
          color: "#f9fafb",
          borderRadius: "0.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          opacity: isLoading ? "0.95" : "1",
        }}
      >
        <DialogHeader
          className="p-4 border-b"
          style={{
            borderBottomColor: "#374151",
            backgroundColor: "#1f2937",
          }}
        >
          <DialogTitle style={{ color: "#f9fafb", fontSize: "1.125rem", fontWeight: "600" }}>{title}</DialogTitle>
          <DialogDescription style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            Vista previa del {documentType.toLowerCase()} para impresión
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-auto p-0 transition-all duration-300"
          style={{
            backgroundColor: "#111827",
            position: "relative",
          }}
        >
          {/* Overlay de carga que cubre todo el contenido */}
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300"
              style={{
                backgroundColor: "#111827",
                opacity: "0.95",
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2 mb-3"
                  style={{ borderColor: "#f9fafb" }}
                ></div>
                <span style={{ color: "#f9fafb" }}>
                  {isPdfGenerating ? "Generando PDF..." : "Cargando documento..."}
                </span>
              </div>
            </div>
          )}

          {errorMessage ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center p-8"
              style={{ color: "#f9fafb" }}
            >
              <FileText className="h-16 w-16 mb-4" style={{ color: "#9ca3af" }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: "#f9fafb" }}>
                Error al cargar el documento
              </h3>
              <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
                {errorMessage}
              </p>
            </div>
          ) : pdfUrl ? (
            // Vista previa del PDF usando iframe con fondo blanco
            <div
              className="w-full h-full"
              style={{
                minHeight: "500px",
                backgroundColor: "#111827",
                padding: "1rem",
              }}
            >
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                className="w-full h-full border-0"
                style={{
                  minHeight: "500px",
                  backgroundColor: "white", // Siempre fondo blanco para el PDF
                  borderRadius: "0.375rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
                title={`Vista previa de ${documentType}`}
                onLoad={handleIframeLoad}
              />
            </div>
          ) : htmlContent ? (
            // Vista previa del HTML con fondo blanco
            <div
              className="w-full h-full p-4 overflow-auto"
              style={{
                minHeight: "500px",
                backgroundColor: "#111827",
              }}
            >
              <div
                className="w-full mx-auto border rounded shadow-sm"
                style={{
                  maxWidth: "80mm",
                  backgroundColor: "white", // Siempre fondo blanco para el HTML
                  color: "black", // Siempre texto negro para el HTML
                  borderColor: "#374151",
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    htmlContent +
                    `
                    <script>
                      // Script para centrar códigos QR
                      document.addEventListener('DOMContentLoaded', function() {
                        const qrImages = document.querySelectorAll('img[src*="qr"], img[alt*="QR"], img.qr-code');
                        qrImages.forEach(img => {
                          const parent = img.parentElement;
                          parent.style.textAlign = 'center';
                          parent.style.width = '100%';
                          img.style.margin = '0 auto';
                          img.style.display = 'block';
                        });
                      });
                    </script>
                  `,
                }}
              />
            </div>
          ) : (
            // Espacio reservado mientras se carga
            <div style={{ minHeight: "500px" }}></div>
          )}
        </div>

        <DialogFooter
          className="p-4 border-t flex justify-between"
          style={{
            borderTopColor: "#374151",
            backgroundColor: "#1f2937",
          }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              borderColor: "#4b5563",
              color: "#d1d5db",
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              disabled={(!pdfUrl && !htmlContent) || isLoading}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={(!pdfUrl && !htmlContent) || isLoading}
              style={{
                backgroundColor: "transparent",
                borderColor: "#3b82f6",
                color: "#60a5fa",
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TicketViewer
