# Integraciones SUNAT y Culqi

## Principios

- Los secretos se inyectan en tiempo de ejecución; nunca se incluyen en imágenes, JavaScript público o Git.
- Las llaves públicas de Culqi pueden llegar al checkout; la llave secreta solo existe en el backend.
- El certificado y la clave SOL solo existen en el backend/Secret Manager.
- Sandbox y producción usan secretos distintos.

## Culqi

Flujo:

1. El backend crea el pedido y devuelve un token opaco de autorización de pago.
2. Culqi Checkout tokeniza la tarjeta en el navegador.
3. El backend calcula el monto desde la base de datos y crea un intento idempotente.
4. Culqi realiza el cargo.
5. El backend registra venta y descuenta stock una sola vez.
6. El webhook recupera el cargo directamente desde la API de Culqi y valida monto, moneda y número de pedido.

Webhook previsto:

`https://criscomgroup.com.pe/api/pedidos/webhooks/culqi`

Si Culqi aprueba el cargo pero falla la finalización local, el pago queda en conciliación. El cliente recibe HTTP 202 y no debe reintentar el cobro.

## SUNAT

El backend genera UBL 2.1, firma el XML, crea el ZIP, llama a `sendBill` y conserva XML/CDR. Los artefactos son privados.

Variables principales por emisor:

- `SUNAT_RUC10_RUC`
- `SUNAT_RUC10_SOL_USER`
- `SUNAT_RUC10_SOL_PASSWORD`
- `SUNAT_RUC10_PFX_PATH`
- `SUNAT_RUC10_PFX_PASSWORD_B64`
- `SUNAT_RUC10_BILL_SERVICE_URL`

El segundo emisor usa el prefijo `SUNAT_RUC20_`, pero permanece deshabilitado hasta completar su configuración.

## Separación documental

- Boleta/factura: comprobante electrónico sujeto a SUNAT.
- Nota de venta: control interno; no se ofrece en el checkout público y no se envía a SUNAT.
- Expediente de adquisición usada: evidencia interna de procedencia; no convierte una compraventa en donación ni reemplaza obligaciones tributarias.

La clasificación tributaria definitiva debe ser revisada por un contador peruano con los documentos reales de cada operación.

