export interface TicketConfig {
  mostrarCodigoBarras: boolean
  mostrarQr: boolean
  mostrarPrecioMayorista: boolean
  mostrarPrecioOferta: boolean
  tamanoFuente: number
  /** Etiquetas por producto (1 = una). */
  copias: number
}

export const CONFIG_TICKET: TicketConfig = {
  mostrarCodigoBarras: true,
  mostrarQr: true,
  mostrarPrecioMayorista: true,
  mostrarPrecioOferta: true,
  tamanoFuente: 12,
  copias: 1,
}

// Etiqueta de 177 x 118 pt (6,24 x 4,16 cm), 3 por fila, A4 vertical (595,28 x 841,89 pt).
export const TICKET_ANCHO = 177
export const TICKET_ALTO = 118
export const TICKETS_POR_FILA = 3
export const PAGINA_ALTO = 841.89
// 7 filas x 118 = 826 pt: caben solo con 7 pt de margen vertical (827,9 pt utiles).
export const PAGINA_PADDING_V = 7
export const FILAS_POR_PAGINA = 7
export const TICKETS_POR_PAGINA = TICKETS_POR_FILA * FILAS_POR_PAGINA

export const MAX_COPIAS = 20
/** Tope de etiquetas por PDF para no bloquear el navegador al generarlo. */
export const MAX_TICKETS = 600
