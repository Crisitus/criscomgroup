import { StyleSheet } from "@react-pdf/renderer"
import { PAGINA_PADDING_V, TICKET_ALTO, TICKET_ANCHO } from "./ticketConfig"

const centro = { justifyContent: "center", alignItems: "center" } as const
const linea = { position: "absolute", top: 0, bottom: 0, width: 0.5, backgroundColor: "#000000" } as const

/** Estilos de la etiqueta; solo dependen del tamaño de fuente configurado. */
export const crearEstilosTicket = (fuente: number) =>
  StyleSheet.create({
    page: { flexDirection: "column", backgroundColor: "#ffffff", paddingHorizontal: 10, paddingVertical: PAGINA_PADDING_V },
    fila: { flexDirection: "row", justifyContent: "flex-start", paddingHorizontal: 10 },
    ticket: { width: TICKET_ANCHO, height: TICKET_ALTO, border: "1pt solid #000", backgroundColor: "#ffffff", flexDirection: "column" },

    fila1: { height: 20, position: "relative", borderBottom: "0.5pt solid #000" },
    fila2: { height: 20, borderBottom: "0.5pt solid #000", paddingHorizontal: 4, ...centro },
    fila1y2: { height: 40, borderBottom: "0.5pt solid #000", paddingHorizontal: 4, ...centro },
    fila3: { height: 58, position: "relative", borderBottom: "0.5pt solid #000", flexDirection: "row" },
    fila4: { height: 20, position: "relative", flexDirection: "row" },
    lineaFila3: { ...linea, left: "25%" },
    lineaFila4: { ...linea, left: "50%" },

    cajaOferta: { position: "absolute", top: 2, left: 4, backgroundColor: "#dc2626", paddingHorizontal: 6, paddingVertical: 2 },
    textoOferta: { fontSize: Math.max(6, fuente - 4), color: "#ffffff", fontWeight: "bold", textAlign: "center" },
    nombre: { fontSize: Math.max(7, fuente - 2), color: "#000000", textAlign: "center", lineHeight: 1.1 },
    nombreGrande: { fontSize: Math.max(8, fuente - 1), color: "#000000", textAlign: "center", lineHeight: 1.1 },

    col1Fila3: { width: "25%", paddingHorizontal: 1, flex: 1, ...centro },
    col2Fila3: { width: "75%", paddingLeft: 1, flex: 3, ...centro },
    antes: { alignItems: "center", justifyContent: "center", flex: 1 },
    labelAntes: { fontSize: Math.max(7, fuente - 4), color: "#000000", fontWeight: "bold", textAlign: "center", marginBottom: 2 },
    precioAntes: { fontSize: Math.max(10, fuente - 1), color: "#000000", fontWeight: "bold", textAlign: "center", textDecoration: "line-through", lineHeight: 1 },

    precioPrincipal: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", height: "100%", flex: 1 },
    simbolo: { fontSize: Math.max(32, fuente + 22), color: "#000000", fontWeight: "bold", marginRight: 2, lineHeight: 1, alignSelf: "center" },
    entero: { fontSize: Math.max(48, fuente + 38), color: "#000000", fontWeight: "bold", lineHeight: 0.9 },
    punto: { fontSize: Math.max(32, fuente + 22), color: "#000000", fontWeight: "bold", lineHeight: 0.9 },
    decimal: { fontSize: Math.max(14, fuente + 4), color: "#000000", fontWeight: "bold", alignSelf: "flex-start", marginTop: 16 },

    col1Fila4: { width: "50%", paddingHorizontal: 2, ...centro },
    col2Fila4: { width: "50%", paddingHorizontal: 2, ...centro },
    mayorista: { alignItems: "center", justifyContent: "center" },
    labelDocena: { fontSize: Math.max(6, fuente - 3), color: "#000000", textAlign: "center" },
    precioMayorista: { fontSize: Math.max(8, fuente - 1), color: "#000000", textAlign: "center", fontWeight: "bold" },
  })

export type EstilosTicket = ReturnType<typeof crearEstilosTicket>
