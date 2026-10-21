import { createElement } from "react"
import type { Product } from "../../../services/productService"
import type { TicketConfig } from "./ticketConfig"
import { descargarBlob } from "../excelExport"

/** Una entrada por etiqueta impresa: cada producto repetido `copias` veces. */
export const expandirCopias = (productos: Product[], copias: number): Product[] =>
  productos.flatMap(p => Array.from({ length: copias }, () => p))

/** Genera el PDF en el navegador. @react-pdf se carga solo al usarlo. */
export const generarPdfTickets = async (productos: Product[], config: TicketConfig): Promise<Blob> => {
  const [{ pdf }, { TicketDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./TicketDocument")])
  const doc = createElement(TicketDocument, { tickets: expandirCopias(productos, config.copias), config })
  return pdf(doc as Parameters<typeof pdf>[0]).toBlob()
}

export const nombreArchivoTickets = (ahora = new Date()) => {
  const d = (n: number) => String(n).padStart(2, "0")
  return `tickets-productos-${ahora.getFullYear()}-${d(ahora.getMonth() + 1)}-${d(ahora.getDate())}_${d(ahora.getHours())}${d(ahora.getMinutes())}.pdf`
}

export const descargarPdfTickets = (blob: Blob) => descargarBlob(blob, nombreArchivoTickets())
