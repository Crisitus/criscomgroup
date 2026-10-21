import { Text, View } from "@react-pdf/renderer"
import type { Product } from "../../../services/productService"
import { codigoTicket, num } from "../productData"
import type { TicketConfig } from "./ticketConfig"
import type { EstilosTicket } from "./ticketStyles"
import { TicketBarras, TicketQr } from "./TicketCodes"

const partesPrecio = (valor: string | number | null | undefined) => {
  const precio = Math.max(0, num(valor))
  const entera = Math.floor(precio)
  return { entera, decimal: (precio - entera).toFixed(2).substring(2), total: precio }
}

// El precio grande cabe en 132 pt hasta 2 digitos; con 3 o 4 se reduce para no salirse de la etiqueta.
const escalaPrecio = (digitos: number) => (digitos <= 2 ? 1 : digitos === 3 ? 0.8 : 0.62)

const recortar = (texto: string, limite: number) => (texto.length > limite ? `${texto.substring(0, limite)}...` : texto)

interface Props {
  producto: Product
  config: TicketConfig
  estilos: EstilosTicket
}

/** Una etiqueta: nombre, QR (o "Antes" si hay oferta), precio con IGV, código de barras y precio por docena. */
export function TicketCard({ producto, config, estilos: e }: Props) {
  const unitario = partesPrecio(producto.precio_unitario_con_igv)
  const oferta = partesPrecio(producto.precio_oferta_con_igv)
  const mayorista = partesPrecio(producto.precio_mayoritario_con_igv)
  const tieneOferta = config.mostrarPrecioOferta && Boolean(producto.es_oferta) && oferta.total > 0
  const tieneMayorista = config.mostrarPrecioMayorista && mayorista.total > 0
  const nombre = recortar(producto.nombre || "Producto sin nombre", tieneOferta ? 40 : 60)
  const principal = tieneOferta ? oferta : unitario
  const codigo = codigoTicket(producto)
  const k = escalaPrecio(String(principal.entera).length)
  const textoAntes = `S/ ${unitario.entera}.${unitario.decimal}`

  return (
    <View style={e.ticket}>
      {tieneOferta ? (
        <>
          <View style={e.fila1}><View style={e.cajaOferta}><Text style={e.textoOferta}>OFERTA</Text></View></View>
          <View style={e.fila2}><Text style={e.nombre}>{nombre}</Text></View>
        </>
      ) : (
        <View style={e.fila1y2}><Text style={e.nombreGrande}>{nombre}</Text></View>
      )}

      <View style={e.fila3}>
        <View style={e.lineaFila3} />
        <View style={e.col1Fila3}>
          {tieneOferta ? (
            <View style={e.antes}>
              <Text style={e.labelAntes}>Antes</Text>
              <Text style={{ ...e.precioAntes, fontSize: textoAntes.length > 9 ? 6.5 : 8 }}>{textoAntes}</Text>
            </View>
          ) : config.mostrarQr ? (
            <TicketQr idProducto={producto.id_producto} lado={38} />
          ) : null}
        </View>
        <View style={e.col2Fila3}>
          <View style={e.precioPrincipal}>
            <Text style={{ ...e.simbolo, fontSize: Number(e.simbolo.fontSize) * k }}>S/</Text>
            <Text style={{ ...e.entero, fontSize: Number(e.entero.fontSize) * k }}>{principal.entera}</Text>
            <Text style={{ ...e.punto, fontSize: Number(e.punto.fontSize) * k }}>.</Text>
            <Text style={{ ...e.decimal, fontSize: Number(e.decimal.fontSize) * Math.max(k, 0.8), marginTop: 16 * k }}>{principal.decimal}</Text>
          </View>
        </View>
      </View>

      <View style={e.fila4}>
        <View style={e.lineaFila4} />
        <View style={e.col1Fila4}>
          {config.mostrarCodigoBarras && <TicketBarras codigo={codigo} ancho={84} alto={11} fuente={5} />}
        </View>
        <View style={e.col2Fila4}>
          {tieneMayorista && (
            <View style={e.mayorista}>
              <Text style={e.labelDocena}>Docena:</Text>
              <Text style={e.precioMayorista}>S/. {mayorista.entera}.{mayorista.decimal}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
