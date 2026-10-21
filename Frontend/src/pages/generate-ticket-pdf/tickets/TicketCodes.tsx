import { Path, Svg, Text, View } from "@react-pdf/renderer"
import { code128Path } from "../../../utils/barcode128"
import { qrPath } from "../../../utils/qrcode"
import { urlPublicaProducto } from "../../../utils/qrProductoUrl"
import type { CodigoTicket } from "../productData"

const cacheQr = new Map<number, { d: string; size: number }>()
const cacheBarras = new Map<string, { d: string; anchoModulos: number }>()

/** QR (vector, escaneable) con la URL publica del producto. Quiet zone de 2 modulos. */
export function TicketQr({ idProducto, lado }: { idProducto: number; lado: number }) {
  let qr = cacheQr.get(idProducto)
  if (!qr) { qr = qrPath(urlPublicaProducto(idProducto), 2); cacheQr.set(idProducto, qr) }
  return (
    <Svg width={lado} height={lado} viewBox={`0 0 ${qr.size} ${qr.size}`}>
      <Path d={qr.d} fill="#000000" />
    </Svg>
  )
}

/**
 * Code 128 vectorial con el codigo debajo. Si el codigo viene del SKU se marca "SKU:".
 * Si el texto no se puede dibujar (caracteres no ASCII) se imprime solo como texto.
 */
export function TicketBarras({ codigo, ancho, alto, fuente }: { codigo: CodigoTicket; ancho: number; alto: number; fuente: number }) {
  const etiqueta = codigo.origen === "sku" ? `SKU: ${codigo.texto}` : codigo.texto
  let barras = codigo.escaneable ? cacheBarras.get(codigo.texto) : undefined
  if (codigo.escaneable && !barras) { barras = code128Path(codigo.texto, 6); cacheBarras.set(codigo.texto, barras) }
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: ancho }}>
      {barras && (
        <Svg width={ancho} height={alto} viewBox={`0 0 ${barras.anchoModulos} 1`} preserveAspectRatio="none">
          <Path d={barras.d} fill="#000000" />
        </Svg>
      )}
      <Text style={{ fontSize: fuente, color: "#000000", textAlign: "center", marginTop: 0.5 }}>{etiqueta.length > 26 ? `${etiqueta.slice(0, 24)}...` : etiqueta}</Text>
    </View>
  )
}
