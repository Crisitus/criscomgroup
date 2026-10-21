"use client"

import React from "react"
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer"

interface Product {
  id_producto: number
  nombre: string
  sku: string
  precio_unitario_con_igv?: string | number
  precio_mayoritario_con_igv?: string | number
  precio_oferta_con_igv?: string | number
  stock?: number
  es_oferta?: boolean
  categoria?: { nombre?: string } | string
}

interface ProductPDFDocumentProps {
  productos: Product[]
  codigosBarras: Record<number, string[]>
  config: {
    mostrarImagen: boolean
    mostrarCodigoBarras: boolean
    mostrarPrecioUnitario: boolean
    mostrarPrecioMayorista: boolean
    mostrarPrecioOferta: boolean
    usarPrecioOfertaEnLugarUnitario: boolean
    tamanoFuente: number
    colorFondo: string
    colorTexto: string
    margenInterno: number
  }
}

// Función helper para validar y obtener precio de forma segura
const obtenerPrecioSeguro = (valor: string | number | undefined | null): number => {
  if (valor === null || valor === undefined || valor === "") return 0
  const precio = typeof valor === "string" ? Number.parseFloat(valor) : Number(valor)
  return isNaN(precio) ? 0 : precio
}

// Función helper para obtener precio con validación estricta
const obtenerPrecioMostrar = (producto: Product, tipo: "unitario" | "mayorista" | "oferta") => {
  let precio = 0

  try {
    switch (tipo) {
      case "unitario":
        precio = obtenerPrecioSeguro(producto.precio_unitario_con_igv)
        break
      case "mayorista":
        precio = obtenerPrecioSeguro(producto.precio_mayoritario_con_igv)
        break
      case "oferta":
        precio = obtenerPrecioSeguro(producto.precio_oferta_con_igv)
        break
      default:
        precio = 0
    }
  } catch (error) {
    console.warn(`Error al obtener precio ${tipo}:`, error)
    precio = 0
  }

  // Asegurar que el precio sea válido
  if (!Number.isFinite(precio) || precio < 0) {
    precio = 0
  }

  const parteEntera = Math.floor(precio)
  const parteDecimal = Math.abs(precio - parteEntera)
    .toFixed(2)
    .substring(2)

  return { parteEntera, parteDecimal, precioCompleto: precio }
}

// Función para validar producto con validación estricta
const validarProducto = (producto: any): producto is Product => {
  return (
    producto &&
    typeof producto === "object" &&
    typeof producto.id_producto === "number" &&
    typeof producto.nombre === "string" &&
    typeof producto.sku === "string" &&
    producto.nombre.length > 0 &&
    producto.sku.length > 0
  )
}

// Componente de ticket individual para evitar re-renders problemáticos
const TicketIndividual: React.FC<{
  producto: Product
  codigoBarras: string
  config: ProductPDFDocumentProps["config"]
  estilos: any
}> = ({ producto, codigoBarras, config, estilos }) => {
  // Pre-calcular todos los valores para evitar cálculos dinámicos
  const precioUnitario = obtenerPrecioMostrar(producto, "unitario")
  const precioOferta = obtenerPrecioMostrar(producto, "oferta")
  const precioMayorista = obtenerPrecioMostrar(producto, "mayorista")

  // Determinar si tiene oferta válida
  const tieneOferta = Boolean(config.mostrarPrecioOferta && producto.es_oferta && precioOferta.precioCompleto > 0)
  
  // Determinar si tiene precio mayorista válido
  const tienePrecioMayorista = Boolean(config.mostrarPrecioMayorista && precioMayorista.precioCompleto > 0)

  // Validar nombre del producto
  const nombreProducto = producto.nombre || "Producto sin nombre"
  // Ajustar límite de caracteres según si hay oferta o no - más generoso para usar mejor el espacio
  const limiteCaracteres = tieneOferta ? 40 : 60 // Más caracteres para aprovechar las líneas
  const nombreParaMostrar = nombreProducto.length > limiteCaracteres ? nombreProducto.substring(0, limiteCaracteres) + "..." : nombreProducto

  // Precio principal a mostrar
  const precioAMostrar = tieneOferta ? precioOferta : precioUnitario

  return (
    <View style={estilos.ticket}>
      {tieneOferta ? (
        <>
          {/* FILA 1: Etiqueta OFERTA */}
          <View style={estilos.fila1}>
            <View style={estilos.contenedorEtiquetaOferta}>
              <Text style={estilos.etiquetaOferta}>OFERTA</Text>
            </View>
          </View>

          {/* FILA 2: Nombre del producto */}
          <View style={estilos.fila2}>
            <Text style={estilos.nombreProducto}>{nombreParaMostrar}</Text>
          </View>
        </>
      ) : (
        /* FILA 1+2 COMBINADAS: Nombre del producto cuando no hay oferta */
        <View style={estilos.fila1y2Combinadas}>
          <Text style={estilos.nombreProductoGrande}>{nombreParaMostrar}</Text>
        </View>
      )}

      {/* FILA 3: QR/Precio Antes + Precio Principal */}
      <View style={estilos.fila3}>
        {/* Línea vertical separando columnas en fila 3 */}
        <View style={estilos.lineaVerticalFila3} />
        
        {/* Columna 1: QR Code o Precio "Antes" (25% del ancho) */}
        <View style={estilos.columna1Fila3}>
          {tieneOferta ? (
            /* Precio "Antes" tachado */
            <View style={estilos.contenedorPrecioAntes}>
              <Text style={estilos.labelAntes}>Antes</Text>
              <Text style={estilos.precioAntes}>
                S/ {precioUnitario.parteEntera}.{precioUnitario.parteDecimal}
              </Text>
            </View>
          ) : (
            /* QR Code */
            <View style={estilos.contenedorQRCode}>
              <Image
                style={estilos.qrCodeImage}
                src="/qr.jpg"
              />
            </View>
          )}
        </View>

        {/* Columna 2: Precio Principal (75% del ancho) */}
        <View style={estilos.columna2Fila3}>
          <View style={estilos.contenedorPrecioPrincipal}>
            <Text style={estilos.simboloMoneda}>S/</Text>
            <Text style={estilos.precioEntero}>
              {precioAMostrar.parteEntera}
            </Text>
            <Text style={estilos.punto}>.</Text>
            <Text style={estilos.precioDecimal}>
              {precioAMostrar.parteDecimal}
            </Text>
          </View>
        </View>
      </View>

      {/* FILA 4: Código de barras + Precio mayorista/Búscanos */}
      <View style={estilos.fila4}>
        {/* Línea vertical separando columnas en fila 4 */}
        <View style={estilos.lineaVerticalFila4} />
        
        {/* Columna 1: Código de barras (50% del ancho) */}
        <View style={estilos.columna1Fila4}>
          {config.mostrarCodigoBarras && codigoBarras && (
            <View style={estilos.contenedorCodigoBarras}>
              <Text style={estilos.codigoBarrasTexto}>{codigoBarras}</Text>
            </View>
          )}
        </View>

        {/* Columna 2: Precio mayorista o texto "Búscanos" (50% del ancho) */}
        <View style={estilos.columna2Fila4}>
          {tienePrecioMayorista ? (
            <View style={estilos.contenedorPrecioMayorista}>
              <Text style={estilos.labelDocena}>Docena:</Text>
              <Text style={estilos.precioMayorista}>
                S/. {precioMayorista.parteEntera}.{precioMayorista.parteDecimal}
              </Text>
            </View>
          ) : (
            // TODO: añadir campo dominio al modelo Empresa para mostrar URL dinámica
            null
          )}
        </View>
      </View>
    </View>
  )
}

export const ProductPDFDocument: React.FC<ProductPDFDocumentProps> = ({ productos, codigosBarras, config }) => {
  // Validar y filtrar productos de forma estable
  const productosValidos = React.useMemo(() => {
    return productos.filter(validarProducto)
  }, [productos])

  // Crear estilos de forma estable
  const estilosPDF = React.useMemo(
    () =>
      StyleSheet.create({
        page: {
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 10, // Mínimo padding para que los tickets de 4cm exactos calcen bien
        },
        fila: {
          flexDirection: "row",
          marginBottom: 0, // Sin espacio entre filas - el espacio está incluido en los 4cm
          justifyContent: "space-between", // Distribuir tickets uniformemente en el ancho
          paddingHorizontal: 10, // Padding lateral mínimo
        },
        ticket: {
          width: 177, // Aumentado para obtener exactamente 6cm físicos (6.2cm en puntos)
          height: 118, // Aumentado para obtener exactamente 4cm físicos (4.15cm en puntos)
          minHeight: 118,
          maxHeight: 118,
          border: "1pt solid #000",
          backgroundColor: "#ffffff",
          position: "relative",
          flexDirection: "column",
          marginRight: 0, // Sin margen derecho - el ancho de 6cm incluye todo
        },

        // === FILAS DEL TICKET ===
        fila1: {
          height: 20,
          position: "relative",
          borderBottom: "0.5pt solid #000",
        },
        fila2: {
          height: 20,
          position: "relative",
          borderBottom: "0.5pt solid #000",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 4,
        },
        // Fila combinada 1+2 cuando no hay oferta
        fila1y2Combinadas: {
          height: 40, // Suma de fila1 (20) + fila2 (20)
          position: "relative",
          borderBottom: "0.5pt solid #000",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 4,
        },
        fila3: {
          height: 58, // Ajustado para nueva altura total (118pt - 20 - 20 - 20 = 58pt)
          position: "relative",
          borderBottom: "0.5pt solid #000",
          flexDirection: "row",
        },
        fila4: {
          height: 20, // Mantenido en 20pt para códigos de barras
          position: "relative",
          flexDirection: "row",
        },

        // === LÍNEAS VERTICALES ===
        // Solo línea vertical en fila 3 y 4 separando las 2 columnas
        lineaVerticalFila3: {
          position: "absolute",
          left: "25%",
          top: 0,
          bottom: 0,
          width: 0.5,
          backgroundColor: "#000000",
        },
        lineaVerticalFila4: {
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 0.5,
          backgroundColor: "#000000",
        },

        // === FILA 1: ETIQUETA OFERTA ===
        contenedorEtiquetaOferta: {
          position: "absolute",
          top: 2,
          left: 4,
          backgroundColor: "#dc2626",
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        etiquetaOferta: {
          fontSize: Math.max(6, config.tamanoFuente - 4),
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
        },

        // === FILA 2: NOMBRE PRODUCTO ===
        nombreProducto: {
          fontSize: Math.max(7, config.tamanoFuente - 2),
          color: "#000000",
          textAlign: "center",
          lineHeight: 1.1,
          fontWeight: "normal",
          flexWrap: "wrap", // Permite ajuste en múltiples líneas
        },
        // Nombre del producto más grande cuando no hay oferta
        nombreProductoGrande: {
          fontSize: Math.max(8, config.tamanoFuente - 1), // Ligeramente más grande pero controlado
          color: "#000000",
          textAlign: "center",
          lineHeight: 1.1, // Mejor espaciado entre líneas
          fontWeight: "normal",
          flexWrap: "wrap", // Permite que el texto se ajuste en múltiples líneas
        },

        // === FILA 3: COLUMNAS ===
        columna1Fila3: {
          width: "25%", // 1/4 del ancho para QR Code o precio "Antes"
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 1, // Reducir padding para más espacio
          flex: 1,
        },
        columna2Fila3: {
          width: "75%", // 3/4 del ancho para precio principal
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 1, // Reducir padding para más espacio
          flex: 3, // Proporcional al ancho
        },

        // QR Code - Tamaño óptimo para tickets de 4cm
        contenedorQRCode: {
          width: 38, // Restaurado a 38pt para aprovechar el espacio de 4cm de alto
          height: 38, // Restaurado a 38pt para aprovechar el espacio de 4cm de alto
        },
        qrCodeImage: {
          width: 38, // Restaurado a 38pt para aprovechar el espacio de 4cm de alto
          height: 38, // Restaurado a 38pt para aprovechar el espacio de 4cm de alto
        },

        // Precio "Antes" tachado
        contenedorPrecioAntes: {
          alignItems: "center",
          justifyContent: "center",
          flex: 1, // Ocupar todo el espacio disponible
        },
        labelAntes: {
          fontSize: Math.max(7, config.tamanoFuente - 4), // Más grande
          color: "#000000",
          fontWeight: "bold", // Negrita para mayor visibilidad
          textAlign: "center",
          marginBottom: 2,
        },
        precioAntes: {
          fontSize: Math.max(10, config.tamanoFuente - 1), // Mucho más grande
          color: "#000000",
          fontWeight: "bold", // Negrita
          textAlign: "center",
          textDecoration: "line-through",
          lineHeight: 1,
        },

        // Precio principal - OPTIMIZADO PARA OCUPAR TODO EL ESPACIO
        contenedorPrecioPrincipal: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-start", // Centrado para ocupar mejor el espacio
          height: "100%", // Ocupar toda la altura disponible
          flex: 1,
        },
        simboloMoneda: {
          fontSize: Math.max(32, config.tamanoFuente + 22), // Restaurado para aprovechar 4cm de alto
          color: "#000000",
          fontWeight: "bold",
          marginRight: 2,
          lineHeight: 1,
          alignSelf: "center", // Centrado verticalmente
        },
        precioEntero: {
          fontSize: Math.max(48, config.tamanoFuente + 38), // Restaurado para aprovechar 4cm de alto
          color: "#000000",
          fontWeight: "bold",
          lineHeight: 0.9, // Línea más compacta para ocupar más espacio
        },
        punto: {
          fontSize: Math.max(32, config.tamanoFuente + 22), // Restaurado para aprovechar 4cm de alto
          color: "#000000",
          fontWeight: "bold",
          lineHeight: 0.9,
        },
        precioDecimal: {
          fontSize: Math.max(14, config.tamanoFuente + 4), // Restaurado para aprovechar 4cm de alto
          color: "#000000",
          fontWeight: "bold",
          alignSelf: "flex-start", // Posicionado en la parte superior
          marginTop: 16, // Restaurado para aprovechar 4cm de alto
        },

        // === FILA 4: COLUMNAS ===
        columna1Fila4: {
          width: "50%", // 50% del ancho para código de barras
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 2,
        },
        columna2Fila4: {
          width: "50%", // 50% del ancho para precio mayorista/búscanos
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 2,
        },

        // Código de barras - Solo texto, más grande
        contenedorCodigoBarras: {
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        },
        codigoBarrasTexto: {
          fontSize: Math.max(8, config.tamanoFuente - 1), // Más grande
          color: "#000000",
          textAlign: "center",
          fontWeight: "bold",
        },

        // Precio mayorista con formato "Docena: S/. XX.XX"
        contenedorPrecioMayorista: {
          alignItems: "center",
          justifyContent: "center",
        },
        labelDocena: {
          fontSize: Math.max(6, config.tamanoFuente - 3),
          color: "#000000",
          textAlign: "center",
          fontWeight: "normal",
        },
        precioMayorista: {
          fontSize: Math.max(8, config.tamanoFuente - 1),
          color: "#000000",
          textAlign: "center",
          fontWeight: "bold",
        },

        // Texto "Búscanos" en color negro
        textoBuscar: {
          fontSize: Math.max(5, config.tamanoFuente - 4),
          color: "#000000", // Cambiado de azul a negro
          textAlign: "center",
          lineHeight: 1.0,
          fontWeight: "bold", // Negrita como solicita
        },
      }),
    [config.tamanoFuente],
  )

  if (productosValidos.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="portrait" style={{ padding: 20 }}>
          <View>
            <Text style={{ fontSize: 16, textAlign: "center", color: "#666" }}>
              No hay productos válidos para generar el PDF
            </Text>
          </View>
        </Page>
      </Document>
    )
  }

  // Calcular filas por página - A4 vertical con tickets de 6cm x 4cm exactos
  const filasPorPagina = 7 // 6 filas × 4.15cm = 25cm + márgenes caben en A4 (29.7cm)
  const totalFilas = Math.ceil(productosValidos.length / 3)

  // Crear páginas con control de flujo estricto
  const paginas = []
  let filaActual = 0

  while (filaActual < totalFilas) {
    const filasEnEstaPagina = Math.min(filasPorPagina, totalFilas - filaActual)
    
    paginas.push(
      <Page size="A4" orientation="portrait" style={estilosPDF.page} key={`pagina-${paginas.length}`} wrap={false}>
        {Array.from({ length: filasEnEstaPagina }).map((_, indiceFila) => {
          const indiceFilaGlobal = filaActual + indiceFila
          return (
            <View style={estilosPDF.fila} key={`fila-${indiceFilaGlobal}`} wrap={false}>
              {productosValidos.slice(indiceFilaGlobal * 3, indiceFilaGlobal * 3 + 3).map((producto) => {
                const codigoBarrasProducto = codigosBarras[producto.id_producto]?.[0] || ""

                return (
                  <TicketIndividual
                    key={`ticket-${producto.id_producto}`}
                    producto={producto}
                    codigoBarras={codigoBarrasProducto}
                    config={config}
                    estilos={estilosPDF}
                  />
                )
              })}
            </View>
          )
        })}
      </Page>
    )
    
    filaActual += filasEnEstaPagina
  }

  return <Document>{paginas}</Document>
}