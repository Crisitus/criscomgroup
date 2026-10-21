import type { Product } from "../../../services/productService"
import { FILAS_POR_PAGINA, TICKETS_POR_FILA, TICKETS_POR_PAGINA } from "./ticketConfig"

/** Reparte las etiquetas en hojas A4 (3 columnas x FILAS_POR_PAGINA filas). */
export const paginarTickets = (tickets: Product[]): Product[][][] => {
  const paginas: Product[][][] = []
  for (let i = 0; i < tickets.length; i += TICKETS_POR_PAGINA) {
    const pagina = tickets.slice(i, i + TICKETS_POR_PAGINA)
    const filas: Product[][] = []
    for (let f = 0; f < FILAS_POR_PAGINA && f * TICKETS_POR_FILA < pagina.length; f++) {
      filas.push(pagina.slice(f * TICKETS_POR_FILA, (f + 1) * TICKETS_POR_FILA))
    }
    paginas.push(filas)
  }
  return paginas
}
