// URL del backend de facturación
const FACTURADOR_API_URL = import.meta.env.VITE_FACTURADOR_API_URL || "http://localhost:8000/api"
// URL del backend principal
import { API_URL } from "../config/api"
import { DateTime } from "luxon"

// Interfaz para la respuesta de SUNAT
export interface SunatResponse {
  success: boolean
  cdrDescription?: string
  error?: string
}

// Interfaz para la respuesta del envío de factura
export interface InvoiceSendResponse {
  xml: string
  hash: string
  sunatResponse: SunatResponse
}

// Modificar las interfaces para incluir el tipo de documento y datos del cliente
// Buscar la interfaz InvoiceData y añadir el campo descuentoGlobal:

// Modificar la interfaz InvoiceData para incluir el campo descuentoGlobal
export interface InvoiceData {
  ublVersion: string
  tipoDoc: string // "01" para Factura, "03" para Boleta
  tipoOperacion: string
  serie: string // F001 para Factura, B001 para Boleta
  correlativo: string
  fechaEmision: string
  formaPago: {
    moneda: string
    tipo: string
  }
  tipoMoneda: string
  company: {
    ruc: number
    razonSocial: string
    nombreComercial: string
    address: {
      ubigueo: string
      departamento: string
      provincia: string
      distrito: string
      urbanizacion: string
      direccion: string
      codLocal: string
    }
  }
  client: {
    tipoDoc: string // "6" para RUC, "1" para DNI
    numDoc: number
    rznSocial: string
  }
  details: Array<{
    tipAfeIgv: number
    codProducto: string
    unidad: string
    descripcion: string
    cantidad: number
    mtoValorUnitario: number
    mtoValorVenta: number
    mtoBaseIgv: number
    porcentajeIgv: number
    igv: number
    totalImpuestos: number
    mtoPrecioUnitario: number
    factorIcbper?: number
    icbper?: number
  }>
  // Nuevos campos para series y correlativo
  serieFactura?: string
  correlativoFactura?: number
  serieBoleta?: string
  correlativoBoleta?: number
  // Nuevo campo para descuento global
  descuentoGlobal?: number
}

// Interfaz para respuesta de consulta de cliente
export interface ClienteConsultaResponse {
  // Campos comunes
  tipoDocumento: string
  numeroDocumento: string
  // Campos para RUC
  razonSocial?: string
  estado?: string
  condicion?: string
  direccion?: string
  ubigeo?: string
  distrito?: string
  provincia?: string
  departamento?: string
  // Campos para DNI
  nombre?: string
  nombres?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
}

// Modificar las funciones consultarRuc y consultarDni para usar el backend local

// Función para consultar RUC
export const consultarRuc = async (ruc: string): Promise<ClienteConsultaResponse> => {
  try {
    const token = localStorage.getItem("token")

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }    // Usar la URL del backend principal
    const response = await fetch(`${API_URL}/ruc/${ruc}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error al consultar RUC: ${response.statusText}`)
    }

    const data = await response.json()

    // Adaptar la respuesta al formato esperado por el frontend
    return {
      tipoDocumento: "6", // RUC
      numeroDocumento: ruc,
      razonSocial: data.nombre,
      direccion: data.direccion,
      estado: "ACTIVO", // Asumimos que está activo ya que el backend no lo devuelve
      condicion: "HABIDO", // Asumimos que está habido ya que el backend no lo devuelve
    }
  } catch (error) {
    throw error
  }
}

// Función para consultar DNI
export const consultarDni = async (dni: string): Promise<ClienteConsultaResponse> => {
  try {
    const token = localStorage.getItem("token")

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }    // Usar la URL del backend principal
    const response = await fetch(`${API_URL}/dni/${dni}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error al consultar DNI: ${response.statusText}`)
    }

    const data = await response.json()

    // Adaptar la respuesta al formato esperado por el frontend
    // El backend solo devuelve nombreCompleto, así que lo usamos para el nombre
    return {
      tipoDocumento: "1", // DNI
      numeroDocumento: dni,
      nombre: data.nombreCompleto,
      // No tenemos apellidos separados, así que dejamos estos campos vacíos
      apellidoPaterno: "",
      apellidoMaterno: "",
      nombres: data.nombreCompleto,
    }
  } catch (error) {
    throw error
  }
}

// Función para validar los datos de la factura
export const validateInvoiceData = (data: InvoiceData): boolean => {
  // Verificar que todos los detalles tengan valores válidos
  for (const detail of data.details) {
    if (
      !detail.cantidad ||
      detail.cantidad <= 0 ||
      !detail.mtoValorUnitario ||
      detail.mtoValorUnitario <= 0 ||
      !detail.mtoValorVenta ||
      detail.mtoValorVenta <= 0 ||
      !detail.mtoPrecioUnitario ||
      detail.mtoPrecioUnitario <= 0
    ) {
      return false
    }
  }
  return true
}

// Modificar la función sendInvoiceToSunat para mejorar el manejo de errores y agregar logs
export const sendInvoiceToSunat = async (invoiceData: InvoiceData, ventaId?: number): Promise<InvoiceSendResponse> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No se encontró token de autenticación")
  }

  // Validar datos antes de enviar
  if (!validateInvoiceData(invoiceData)) {
    throw new Error(
      "Los datos de la factura contienen valores inválidos. Verifica que todos los precios y cantidades sean mayores a cero.",
    )
  }

  try {
    const requestData = {
      ...invoiceData,
      is_sales_user: true,
    }

    const response = await fetch(`${FACTURADOR_API_URL}/invoices/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("text/html")) {
        const htmlText = await response.text()
        let errorMessage = "Error al enviar factura a SUNAT"

        if (htmlText.includes("404 Not Found")) {
          errorMessage = "Servicio de facturación no encontrado (404). Verifique que el servicio esté activo."
        } else if (htmlText.includes("500 Internal Server Error")) {
          errorMessage = "Error interno en el servidor de facturación (500)."
        } else if (htmlText.includes("403 Forbidden")) {
          errorMessage = "Acceso denegado al servicio de facturación (403)."
        }

        // Actualizar estado como fallido si tenemos ventaId
        if (ventaId) {
          try {
            await updateComprobanteStatus(ventaId, false)
          } catch (updateError) {
            console.error("Error al actualizar estado del comprobante:", updateError)
          }
        }

        throw new Error(errorMessage)
      }

      try {
        const errorData = await response.json()

        // Actualizar estado como fallido si tenemos ventaId
        if (ventaId) {
          try {
            await updateComprobanteStatus(ventaId, false)
          } catch (updateError) {
            console.error("Error al actualizar estado del comprobante:", updateError)
          }
        }

        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      } catch (jsonError) {
        // Actualizar estado como fallido si tenemos ventaId
        if (ventaId) {
          try {
            await updateComprobanteStatus(ventaId, false)
          } catch (updateError) {
            console.error("Error al actualizar estado del comprobante:", updateError)
          }
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
    }

    const data = await response.json()

    // Actualizar estado según el resultado de SUNAT si tenemos ventaId
    if (ventaId) {
      try {
        await updateComprobanteStatus(ventaId, data.sunatResponse?.success || false, data)
      } catch (updateError) {
        console.error("Error al actualizar estado del comprobante:", updateError)
      }
    }

    return data
  } catch (error: any) {
    // Actualizar estado como fallido si tenemos ventaId
    if (ventaId) {
      try {
        await updateComprobanteStatus(ventaId, false)
      } catch (updateError) {
        console.error("Error al actualizar estado del comprobante:", updateError)
      }
    }

    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      throw new Error(
        "No se pudo conectar al servicio de facturación. Verifique que el servicio esté activo y accesible.",
      )
    }

    throw error
  }
}


// Modificar la función getInvoicePdf para mejorar el manejo de errores
export const getInvoicePdf = async (invoiceData: InvoiceData): Promise<Blob | string> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No se encontró token de autenticación")
  }

  // Validar datos antes de enviar
  if (!validateInvoiceData(invoiceData)) {
    throw new Error(
      "Los datos de la factura contienen valores inválidos. Verifica que todos los precios y cantidades sean mayores a cero.",
    )
  }

  try {
    // Añadir un parámetro para indicar que es una solicitud de un usuario de ventas
    const requestData = {
      ...invoiceData,
      // Añadir un flag para indicar que podría ser un usuario de ventas
      is_sales_user: true,
    }

    const response = await fetch(`${FACTURADOR_API_URL}/invoices/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || ""

      // Si la respuesta es HTML, extraer un mensaje más útil
      if (contentType.includes("text/html")) {
        const htmlText = await response.text()

        // Intentar extraer un mensaje de error útil del HTML
        let errorMessage = "Error al obtener el PDF de la factura"

        // Buscar mensajes de error comunes en el HTML
        if (htmlText.includes("404 Not Found")) {
          errorMessage = "Servicio de generación de PDF no encontrado (404). Verifique que el servicio esté activo."
        } else if (htmlText.includes("500 Internal Server Error")) {
          errorMessage = "Error interno en el servidor al generar PDF (500)."
        }

        throw new Error(errorMessage)
      }      // Intentar parsear como JSON
      try {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      } catch (jsonError) {
        // Si no es JSON, usar el status code
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
    }    // Verificar el tipo de contenido de la respuesta
    const contentType = response.headers.get("content-type")

    if (contentType && contentType.includes("application/pdf")) {
      // Si es un PDF, devolvemos el blob
      return await response.blob()
    } else if (contentType && contentType.includes("application/json")) {
      // Nueva lógica para manejar respuesta JSON con HTML dentro
      const jsonResponse = await response.json()
      
      if (jsonResponse.success && jsonResponse.data && jsonResponse.data.html) {
        const htmlContent = jsonResponse.data.html
        // Asegurarnos de que el HTML tenga los estilos necesarios para impresión térmica
        const enhancedHtml = enhanceTicketHtml(htmlContent)
        return enhancedHtml
      } else {
        throw new Error(jsonResponse.message || "Error al obtener el HTML de la factura")
      }
    } else if (contentType && contentType.includes("text/html")) {
      // Si es HTML directo, devolvemos el texto HTML (mantener compatibilidad)
      const htmlContent = await response.text()

      // Asegurarnos de que el HTML tenga los estilos necesarios para impresión térmica
      const enhancedHtml = enhanceTicketHtml(htmlContent)
      return enhancedHtml
    } else {
      // Si no es ni PDF ni HTML ni JSON, intentamos leer como texto para depuración
      const text = await response.text()
      return text
    }
  } catch (error: any) {
    // Verificar si el error es de red (CORS, conexión, etc.)
    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      throw new Error(
        "No se pudo conectar al servicio de generación de PDF. Verifique que el servicio esté activo y accesible.",
      )
    }

    throw error
  }
}

// Función para mejorar el HTML del ticket para impresión térmica
export const enhanceTicketHtml = (html: string): string => {
  // Solo agregar estilos mínimos si no vienen del backend
  if (!html.includes("@page") && !html.includes("@media print")) {
    // Solo estilos básicos para PDF de 80mm, sin interferir con el diseño del backend
    const styleTag = `
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      
      body {
        width: 80mm;
        margin: 0;
        padding: 0;
      }
    </style>
    `

    // Insertar los estilos en el HTML
    html = html.replace("</head>", `${styleTag}</head>`)

    // Si no hay etiqueta head, agregarla
    if (!html.includes("<head>")) {
      html = `<!DOCTYPE html>
<html>
<head>
${styleTag}
</head>
<body>
${html}
</body>
</html>`
    }
  }

  return html
}

// Modificar la función prepareInvoiceData para incluir el descuento global
// Buscar la función prepareInvoiceData y modificarla:

// Modificar la función prepareInvoiceData para incluir el descuento global
export const prepareInvoiceData = (
  sale: any,
  company: any,
  tipoDocumento: string,
  cliente: ClienteConsultaResponse | null,
  series: { facturaActual: number; boletaActual: number },
  nuevoCorrelativo?: number, // Nuevo parámetro opcional
): InvoiceData => {
  // Usar la fecha de la venta en lugar de la fecha actual
  // La fecha puede venir en formato "2025-07-11 20:57:59", necesitamos convertirla a ISO
  let fechaEmision = "";
  try {
    // Intentar parsear la fecha con diferentes formatos
    let dateTime;
    if (sale.fecha.includes('T')) {
      // Ya está en formato ISO
      dateTime = DateTime.fromISO(sale.fecha);
    } else {
      // Formato "YYYY-MM-DD HH:mm:ss", reemplazar espacio con 'T'
      const isoDateString = sale.fecha.replace(' ', 'T');
      dateTime = DateTime.fromISO(isoDateString);
    }
    
    if (dateTime.isValid) {
      fechaEmision = dateTime.setZone("America/Lima").toISO({ suppressMilliseconds: true }) ?? "";
    } else {
      // Si falla, usar la fecha actual como fallback
      console.warn('No se pudo parsear la fecha de la venta:', sale.fecha, 'usando fecha actual');
      fechaEmision = DateTime.now().setZone("America/Lima").toISO({ suppressMilliseconds: true }) ?? "";
    }
  } catch (error) {
    console.error('Error al procesar fecha de venta:', error, 'fecha:', sale.fecha);
    fechaEmision = DateTime.now().setZone("America/Lima").toISO({ suppressMilliseconds: true }) ?? "";
  }
  // Determinar serie y correlativo según tipo de documento
  let serie, correlativo

  // Usar la serie de la venta si existe
  if (sale.serie) {
    serie = sale.serie
  } else {
    // Si no tiene serie, usar el formato estándar
    if (tipoDocumento === "01") {
      serie = "F001"
    } else {
      serie = "B001"
    }
  }

  // Usar el correlativo de la venta si existe
  if (sale.correlativo) {
    correlativo = String(sale.correlativo).padStart(8, "0")
  } else if (nuevoCorrelativo) {
    correlativo = String(nuevoCorrelativo).padStart(8, "0")
  } else {
    // Si no tiene correlativo, usar el valor por defecto
    if (tipoDocumento === "01") {
      correlativo = String(series.facturaActual).padStart(8, "0")
    } else {
      correlativo = String(series.boletaActual).padStart(8, "0")
    }
  }

  // Preparar detalles de productos
  const details = sale.items.map((item: any) => {
    // Asegurar que los valores sean números válidos mayores que cero
    const precioUnitario = Math.max(0.01, Number.parseFloat(item.precio_unitario_con_igv) || 0.01)
    const cantidad = Math.max(0.01, item.cantidad || 0.01)
    const valorUnitario = Math.max(0.01, precioUnitario / 1.18) // Valor sin IGV
    const valorVenta = Math.max(0.01, valorUnitario * cantidad)
    const igv = Math.max(0.01, valorVenta * 0.18)

    return {
      tipAfeIgv: 10, // Gravado - Operación Onerosa
      codProducto: item.producto_id.toString(),
      unidad: "NIU", // Unidad (pieza)
      descripcion: item.nombre || "Producto",
      cantidad: Number(cantidad.toFixed(2)),
      mtoValorUnitario: Number(valorUnitario.toFixed(2)),
      mtoValorVenta: Number(valorVenta.toFixed(2)),
      mtoBaseIgv: Number(valorVenta.toFixed(2)),
      porcentajeIgv: 18,
      igv: Number(igv.toFixed(2)),
      totalImpuestos: Number(igv.toFixed(2)),
      mtoPrecioUnitario: Number(precioUnitario.toFixed(2)),
    }
  })

  // Datos del cliente según tipo de documento
  const clientData = {
    tipoDoc: tipoDocumento === "01" ? "6" : "1", // 6 para RUC, 1 para DNI
    numDoc: 0,
    rznSocial: "CLIENTE GENERAL",
  }

  // Priorizar los datos de cliente de la venta
  if (sale.cliente_numero_documento && sale.cliente_nombre) {
    clientData.numDoc = Number(sale.cliente_numero_documento)
    clientData.rznSocial = sale.cliente_nombre
    clientData.tipoDoc = sale.cliente_tipo_documento || (tipoDocumento === "01" ? "6" : "1")
  } else if (cliente) {
    // Si no hay datos en la venta, usar los datos del objeto cliente
    clientData.numDoc = Number(cliente.numeroDocumento)

    if (tipoDocumento === "01") {
      // Factura
      clientData.rznSocial = cliente.razonSocial || "CLIENTE GENERAL"
    } else {
      // Boleta
      // Para boleta, concatenamos nombres y apellidos
      clientData.rznSocial =
        cliente.nombre ||
        `${cliente.apellidoPaterno || ""} ${cliente.apellidoMaterno || ""} ${cliente.nombres || ""}`.trim()
    }
  }

  // Construir objeto de factura
  const invoiceData: InvoiceData = {
    ublVersion: "2.1",
    tipoDoc: tipoDocumento, // "01" Factura o "03" Boleta
    tipoOperacion: "0101", // Venta interna
    serie,
    correlativo,
    fechaEmision,
    formaPago: {
      moneda: "PEN",
      tipo: "Contado", // Podría ser configurable
    },
    tipoMoneda: "PEN",
    company: {
      ruc: Number(company.ruc),
      razonSocial: company.razon_social || "EMPRESA",
      nombreComercial: company.razon_social || "EMPRESA",
      address: {
        ubigueo: "150101", // Podría ser configurable
        departamento: "AREQUIPA", // Podría ser configurable
        provincia: "AREQUIPA", // Podría ser configurable
        distrito: "AREQUIPA", // Podría ser configurable
        urbanizacion: "-",
        direccion: company.direccion || "DIRECCIÓN NO ESPECIFICADA",
        codLocal: "0000",
      },
    },
    client: clientData,
    details,
    // Guardar las series actuales
    serieFactura: "F001",
    correlativoFactura: series.facturaActual,
    serieBoleta: "B001",
    correlativoBoleta: series.boletaActual,  }
  
  // Añadir descuento global si existe en la venta
  // Verificar múltiples formas en que puede venir el descuento
  if (sale.es_descuento && sale.descuento) {
    // El descuento ya está almacenado como cantidad monetaria, no como porcentaje
    invoiceData.descuentoGlobal = Number(sale.descuento)
  } else if (sale.descuento && Number(sale.descuento) > 0) {
    // Descuento directo sin flag es_descuento
    invoiceData.descuentoGlobal = Number(sale.descuento)
  }

  // Si se proporciona un descuento global directamente, usarlo
  if (sale.descuentoGlobal) {
    invoiceData.descuentoGlobal = Number(sale.descuentoGlobal)
  }

  return invoiceData
}

// Añadir la función getLastCorrelativo al final del archivo

// Modificar la función getLastCorrelativo para convertir el formato del tipo de documento
export const getLastCorrelativo = async (tipoDocumento: string): Promise<number> => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No hay token de autenticación")
    }

    // Convertir el formato del tipo de documento de "01"/"03" a "1"/"3" que espera el backend
    const tipoDocBackend = tipoDocumento === "01" ? "1" : "3"

    const response = await fetch(`${API_URL}/ventas/ultimo-correlativo/${tipoDocBackend}`, {
      method: "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al obtener el último correlativo")    }

    const data = await response.json()
    return data.correlativo
  } catch (error) {
    return 0 // Valor por defecto en caso de error
  }
}

// Función para detectar dispositivos móviles o con poca memoria
export const isMobileOrLowEndDevice = (): boolean => {
  // Detectar dispositivos móviles
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Detectar dispositivos con poca memoria RAM (si está disponible)
  const hasLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4
  
  // Detectar conexión lenta
  const hasSlowConnection = (navigator as any).connection && 
    ((navigator as any).connection.effectiveType === 'slow-2g' || 
     (navigator as any).connection.effectiveType === '2g' ||
     (navigator as any).connection.effectiveType === '3g')
  
  return isMobile || hasLowMemory || hasSlowConnection
}

// Función para limpiar la caché y liberar memoria
export const clearMemoryCache = (): void => {
  try {
    // Forzar garbage collection si está disponible
    if ((window as any).gc) {
      (window as any).gc()
    }
    
    // Limpiar canvas temporales si existen
    const canvases = document.querySelectorAll('canvas[data-temp="true"]')
    canvases.forEach(canvas => canvas.remove())
    
  } catch (error) {
    console.warn('No se pudo limpiar la caché de memoria:', error)
  }
}

// Función optimizada para convertir HTML a PDF con soporte para dispositivos móviles

// Función mejorada para convertir HTML a PDF en el frontend
export const convertHtmlToPdf = async (htmlContent: string): Promise<Blob> => {
  // Verificar si es un dispositivo móvil o con recursos limitados
  const isLowEndDevice = isMobileOrLowEndDevice()
  
  try {
    // Limpiar memoria antes de comenzar
    clearMemoryCache()
    
    // Configurar timeout más corto para dispositivos móviles
    const timeoutMs = isLowEndDevice ? 15000 : 30000 // 15s móvil, 30s desktop
    
    // Crear una promesa con timeout
    const conversionPromise = (async (): Promise<Blob> => {
      try {
        // Importar jsPDF y html2canvas dinámicamente con timeout
        const loadLibrariesPromise = Promise.all([
          import("jspdf"),
          import("html2canvas")
        ])
        
        const libraries = await Promise.race([
          loadLibrariesPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout al cargar librerías')), 10000)
          )
        ]) as [typeof import("jspdf"), typeof import("html2canvas")]
        
        const { jsPDF } = libraries[0]
        const html2canvas = libraries[1].default

        // Asegurarnos de que el HTML tenga fondo blanco y texto negro
        let processedHtml = htmlContent
        if (!processedHtml.includes("background-color: white")) {
          processedHtml = processedHtml.replace(
            "<body",
            '<body style="background-color: white !important; color: black !important;"',
          )

          // Agregar estilos para forzar texto negro en todos los elementos
          const styleForceBlackText = `
          <style>
            body, div, p, span, h1, h2, h3, h4, h5, h6, table, tr, td, th {
              color: black !important;
              background-color: white !important;
            }
          </style>
          `

          // Insertar los estilos en el HTML
          if (processedHtml.includes("<head>")) {
            processedHtml = processedHtml.replace("</head>", `${styleForceBlackText}</head>`)
          } else {
            processedHtml = `<!DOCTYPE html><html><head>${styleForceBlackText}</head>${processedHtml}</html>`
          }
        }        // Crear un contenedor temporal para el HTML con fondo blanco y texto negro
        const container = document.createElement("div")
        container.innerHTML = processedHtml
        container.style.width = "80mm"
        container.style.padding = "10px"
        container.style.fontFamily = "monospace"
        container.style.fontSize = "12px" // Mantener tamaño consistente
        container.style.lineHeight = "1.4" // Mejor espaciado entre líneas
        container.style.position = "absolute"
        container.style.left = "-9999px"
        container.style.top = "0"
        container.style.backgroundColor = "white"
        container.style.color = "black"
        container.style.boxSizing = "border-box"
        container.setAttribute('data-temp', 'true')
        document.body.appendChild(container)        // Forzar color negro en todos los elementos de texto y mejor espaciado
        const textElements = container.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, table, tr, td, th, div")
        textElements.forEach((el) => {
          ;(el as HTMLElement).style.color = "black"          ;(el as HTMLElement).style.backgroundColor = "white"
          ;(el as HTMLElement).style.margin = "2px 0" // Espaciado entre elementos
          ;(el as HTMLElement).style.padding = "1px 0" // Padding interno
        })

        // Asegurar que el contenedor tenga altura dinámica y espacio al final
        container.style.minHeight = "auto"
        container.style.overflow = "visible"
        
        // Agregar espacio extra al final del ticket si no existe
        const lastElement = container.lastElementChild
        if (lastElement) {
          (lastElement as HTMLElement).style.marginBottom = "20px"
        }

        // Esperar a que el contenedor se renderice completamente y calcule su altura real
        await new Promise(resolve => setTimeout(resolve, 200))        // Configurar opciones de html2canvas optimizadas para dispositivos móviles
        const canvasOptions = {
          scale: isLowEndDevice ? 1.5 : 2, // Reducir escala para menor tamaño de archivo
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "white",
          // Usar las dimensiones reales del contenedor
          width: container.scrollWidth || container.offsetWidth,
          height: container.scrollHeight || container.offsetHeight,
          // Configuraciones adicionales para mejor calidad
          scrollX: 0,
          scrollY: 0,
          windowWidth: container.scrollWidth || container.offsetWidth,
          windowHeight: container.scrollHeight || container.offsetHeight,
          imageTimeout: 0,
          removeContainer: true
        }

        // Renderizar el HTML a un canvas con fondo blanco
        const canvas = await html2canvas(container, canvasOptions)
        canvas.setAttribute('data-temp', 'true')

        // Limpiar el contenedor temporal inmediatamente
        document.body.removeChild(container)        // Crear un PDF con el tamaño adecuado basado en el contenido real
        // Usar JPEG con compresión para reducir el tamaño del archivo
        const imgData = canvas.toDataURL("image/jpeg", 0.85) // 85% de calidad para balance entre calidad y tamaño
        
        // Calcular la altura del PDF basada en la proporción del canvas
        // Ancho fijo de 80mm, altura proporcional
        const pdfWidth = 80
        const pdfHeight = Math.max((canvas.height * pdfWidth) / canvas.width, 100) // Mínimo 100mm de altura
        
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidth, pdfHeight],
          compress: true // Habilitar compresión del PDF
        })

        // Añadir la imagen al PDF con las dimensiones calculadas
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)

        // Limpiar el canvas temporal
        canvas.remove()
        
        // Limpiar memoria después de la conversión
        clearMemoryCache()

        // Devolver el PDF como blob
        return pdf.output("blob")
        
      } catch (error) {
        throw new Error("No se pudo convertir el HTML a PDF: " + ((error as Error).message || "Error desconocido"))
      }
    })()
    
    // Aplicar timeout a la conversión completa
    const result = await Promise.race([
      conversionPromise,
      new Promise<Blob>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La conversión tardó demasiado tiempo')), timeoutMs)
      )
    ])
    
    return result
    
  } catch (error) {
    // Limpiar memoria en caso de error
    clearMemoryCache()
    
    // Limpiar contenedores temporales en caso de error
    const tempContainers = document.querySelectorAll('[data-temp="true"]')
    tempContainers.forEach(container => container.remove())
    
    throw new Error("No se pudo convertir el HTML a PDF: " + ((error as Error).message || "Error desconocido"))
  }
}

// Agregar una función para verificar la disponibilidad del servicio de facturación
export const checkFacturadorService = async (): Promise<boolean> => {  try {
    const response = await fetch(`${FACTURADOR_API_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // Timeout de 5 segundos
      signal: AbortSignal.timeout(5000),
    })

    return response.ok
  } catch (error) {
    return false
  }
}

// Nueva función para obtener el PDF del documento exacto enviado a SUNAT
export const getInvoicePdfFromSunatResponse = async (
  invoiceData: InvoiceData, 
  sunatResponse: InvoiceSendResponse
): Promise<Blob | string> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No se encontró token de autenticación")
  }

  try {
    // Enviar los datos originales junto con la respuesta de SUNAT para garantizar consistencia
    const requestData = {
      ...invoiceData,
      is_sales_user: true,
      // Datos del documento ya enviado a SUNAT para garantizar consistencia
      sunat_xml: sunatResponse.xml,
      sunat_hash: sunatResponse.hash,
      sunat_success: sunatResponse.sunatResponse.success,
      sunat_cdr_description: sunatResponse.sunatResponse.cdrDescription,
      // Flag para indicar que queremos el PDF del documento ya enviado
      use_sent_document: true
    }

    const response = await fetch(`${FACTURADOR_API_URL}/invoices/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || ""

      // Si la respuesta es HTML, extraer un mensaje más útil
      if (contentType.includes("text/html")) {
        const htmlText = await response.text()

        // Intentar extraer un mensaje de error útil del HTML
        let errorMessage = "Error al obtener el PDF del documento enviado a SUNAT"

        // Buscar mensajes de error comunes en el HTML
        if (htmlText.includes("404 Not Found")) {
          errorMessage = "Servicio de generación de PDF no encontrado (404). Verifique que el servicio esté activo."
        } else if (htmlText.includes("500 Internal Server Error")) {
          errorMessage = "Error interno en el servidor al generar PDF del documento enviado (500)."
        }

        throw new Error(errorMessage)
      }

      // Intentar parsear como JSON
      try {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      } catch (jsonError) {
        // Si no es JSON, usar el status code
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
    }

    // Verificar el tipo de contenido de la respuesta
    const contentType = response.headers.get("content-type")

    if (contentType && contentType.includes("application/pdf")) {
      // Si es un PDF, devolvemos el blob
      return await response.blob()
    } else if (contentType && contentType.includes("application/json")) {
      // Nueva lógica para manejar respuesta JSON con HTML dentro
      const jsonResponse = await response.json()
      
      if (jsonResponse.success && jsonResponse.data && jsonResponse.data.html) {
        const htmlContent = jsonResponse.data.html
        // Asegurarnos de que el HTML tenga los estilos necesarios para impresión térmica
        const enhancedHtml = enhanceTicketHtml(htmlContent)
        return enhancedHtml
      } else {
        throw new Error(jsonResponse.message || "Error al obtener el HTML del documento enviado a SUNAT")
      }
    } else if (contentType && contentType.includes("text/html")) {
      // Si es HTML directo, devolvemos el texto HTML (mantener compatibilidad)
      const htmlContent = await response.text()

      // Asegurarnos de que el HTML tenga los estilos necesarios para impresión térmica
      const enhancedHtml = enhanceTicketHtml(htmlContent)
      return enhancedHtml
    } else {
      // Si no es ni PDF ni HTML ni JSON, intentamos leer como texto para depuración
      const text = await response.text()
      return text
    }
  } catch (error: any) {
    // Verificar si el error es de red (CORS, conexión, etc.)
    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      throw new Error(
        "No se pudo conectar al servicio de generación de PDF del documento enviado. Verifique que el servicio esté activo y accesible.",
      )
    }

    throw error
  }
}

export const updateComprobanteStatus = async (ventaId: number, success: boolean, sunatData?: any): Promise<void> => {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No se encontró token de autenticación")
  }

  try {
    const response = await fetch(`${API_URL}/ventas/actualizar-comprobante/${ventaId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        comprobante_emitido: success,
        sunat_data: sunatData || null,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error al actualizar estado del comprobante: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error al actualizar estado del comprobante:", error)
    throw error
  }
}
