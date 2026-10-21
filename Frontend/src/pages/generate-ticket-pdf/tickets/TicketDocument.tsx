import { useMemo } from "react"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import type { Product } from "../../../services/productService"
import { TICKETS_POR_FILA, type TicketConfig } from "./ticketConfig"
import { paginarTickets } from "./ticketPages"
import { crearEstilosTicket } from "./ticketStyles"
import { TicketCard } from "./TicketCard"

/** `tickets` ya viene expandido por copias: una entrada por etiqueta impresa. */
export function TicketDocument({ tickets, config }: { tickets: Product[]; config: TicketConfig }) {
  const estilos = useMemo(() => crearEstilosTicket(config.tamanoFuente), [config.tamanoFuente])
  const paginas = useMemo(() => paginarTickets(tickets), [tickets])

  if (paginas.length === 0) {
    return (
      <Document>
        <Page size="A4" style={{ padding: 20 }}>
          <Text style={{ fontSize: 14, textAlign: "center", color: "#666666" }}>No hay productos para imprimir</Text>
        </Page>
      </Document>
    )
  }
  return (
    <Document title="Tickets de productos" author="CRISCOM Group">
      {paginas.map((filas, p) => (
        <Page key={`p-${p}`} size="A4" orientation="portrait" style={estilos.page}>
          {filas.map((fila, f) => (
            <View key={`f-${p}-${f}`} style={estilos.fila} wrap={false}>
              {fila.map((producto, t) => (
                <View key={`t-${p}-${f}-${t}-${producto.id_producto}`} style={{ marginRight: t < TICKETS_POR_FILA - 1 ? 10 : 0 }}>
                  <TicketCard producto={producto} config={config} estilos={estilos} />
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  )
}
