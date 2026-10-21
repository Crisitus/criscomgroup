// Texto legal LITERAL de odd/opendesign/criscom-ecom-contenido/contenido-data.json.
// Contrato: no reescribir, resumir ni añadir cláusulas; solo jerarquía, índice y anclas.
export type LegalSection = { h2: string; parrafos: string[] }
export type LegalDoc = {
  h1: string
  actualizado: string // fecha ya formateada dd/mm/aaaa
  secciones: LegalSection[]
  enlacesCierre: { texto: string; href: string }[]
}

export const TERMINOS: LegalDoc = {
  h1: "Términos y condiciones",
  actualizado: "13/08/2026",
  secciones: [
    { h2: "Pedidos y aceptación", parrafos: [
      "Un pedido web constituye una solicitud de compra. Se confirma después de validar identidad cuando corresponda, disponibilidad, precio, entrega y pago. Si el stock cambia antes de la confirmación, coordinaremos una alternativa o devolución sin cargos adicionales.",
    ] },
    { h2: "Precios, pagos y comprobantes", parrafos: [
      "Los precios se expresan en soles. El medio de pago disponible se muestra durante el checkout. Los datos completos de tarjeta son procesados por el proveedor de pagos y no se almacenan en nuestros sistemas. La emisión de boleta o factura requiere los datos tributarios correctos del comprador.",
    ] },
    { h2: "Entrega, recojo y plazo desde 24 horas", parrafos: [
      "La entrega desde 24 horas es una disponibilidad estimada para productos con stock confirmado y destinos con cobertura, contada desde la confirmación del pedido y del pago cuando corresponda. El plazo definitivo se informa según destino, horario de compra, preparación del equipo, modalidad elegida y operador logístico.",
      "El comprador debe proporcionar una dirección y datos de contacto correctos, facilitar la recepción y revisar el estado exterior del paquete al recibirlo. Una dirección incompleta, ausencia del receptor o reprogramación solicitada puede ampliar el plazo y generar un costo adicional previamente informado.",
      "CRISCOM comunicará reprogramaciones ocasionadas por alta demanda, incidencias del transportista, restricciones de tránsito, fenómenos naturales, caso fortuito o fuerza mayor. Estas situaciones no eliminan los derechos irrenunciables del consumidor ni la obligación de ofrecer una solución cuando corresponda.",
    ] },
    { h2: "Productos, servicios y garantías", parrafos: [
      "Cada ficha debe indicar condición, características relevantes y garantía comercial. Los productos de segunda mano se ofrecen con su estado conocido. Los diagnósticos, reparaciones y ensamblajes se rigen además por la cotización y orden de servicio aceptadas.",
    ] },
    { h2: "Cambios, devoluciones y reclamos", parrafos: [
      "Las solicitudes se evalúan según el estado del bien, la causa y las normas de protección al consumidor. Consulta la política detallada y conserva pedido, comprobante, accesorios y evidencias.",
    ] },
    { h2: "Uso del sitio", parrafos: [
      "No se permite intentar vulnerar el servicio, suplantar identidades, automatizar compras abusivas ni utilizar información falsa. Podemos bloquear operaciones con indicios razonables de fraude mientras se verifican.",
      "Estos términos no restringen derechos irrenunciables reconocidos por la legislación peruana.",
    ] },
  ],
  enlacesCierre: [
    { texto: "Cambios y devoluciones", href: "/cambios-devoluciones" },
    { texto: "Libro de reclamaciones", href: "/libro-reclamaciones" },
  ],
}

export const PRIVACIDAD: LegalDoc = {
  h1: "Política de privacidad",
  actualizado: "11/08/2026",
  secciones: [
    { h2: "Datos tratados", parrafos: [
      "Podemos recibir datos de identificación, contacto, facturación, entrega, cuentas, pedidos, solicitudes técnicas, comunicaciones y reclamaciones. El proveedor de pagos tokeniza la tarjeta; Criscom Group no almacena el número completo ni el CVV.",
    ] },
    { h2: "Finalidades", parrafos: [
      "Tratamos la información para crear cuentas, atender consultas, cotizar, vender, entregar, brindar soporte, prevenir fraude, emitir comprobantes, responder reclamaciones y cumplir obligaciones legales.",
    ] },
    { h2: "Base y comunicaciones", parrafos: [
      "Usamos datos necesarios para ejecutar solicitudes y contratos, cumplir obligaciones o atender intereses legítimos de seguridad. Las comunicaciones promocionales requieren consentimiento y deben ofrecer una forma de dejar de recibirlas.",
    ] },
    { h2: "Proveedores y transferencias", parrafos: [
      "Podemos usar proveedores de infraestructura, correo, autenticación, pagos, logística y facturación bajo deberes de seguridad y confidencialidad. Algunos pueden procesar información fuera del Perú conforme a sus condiciones y salvaguardas aplicables.",
    ] },
    { h2: "Seguridad y conservación", parrafos: [
      "Aplicamos HTTPS, control por roles, hash de contraseñas, auditoría y copias de seguridad. Conservamos la información durante la relación y los plazos necesarios para soporte, seguridad y obligaciones tributarias o legales.",
    ] },
    { h2: "Derechos y contacto", parrafos: [
      "Puedes solicitar acceso, actualización, rectificación, cancelación u oposición cuando corresponda. Envía tu solicitud desde contacto, identificándote y describiendo el derecho que deseas ejercer.",
    ] },
  ],
  // /contacto fue borrada en el port del home: «Contactar» se resuelve a
  // WhatsApp (config-publica) con respaldo al inicio, en LegalDoc.tsx.
  enlacesCierre: [
    { texto: "Contactar", href: "/contacto" },
    { texto: "Libro de reclamaciones", href: "/libro-reclamaciones" },
  ],
}
