# Port criscom-ecom-checkout -> Ecommerce Next.js (informe)

Estado: **done**. Pagos reales NO ejecutados (backend en PAYMENTS_MODE=sandbox y sin clave publica Culqi: el modal no abre; verificado hasta antes del cobro).

## Archivos

Reescritos (backup en odd/backup/ecommerce/checkout/):
- `Ecommerce/app/(public)/checkout/page.tsx` — entrada fina (server, metadata) -> components/checkout/CheckoutPage.
- `Ecommerce/app/(public)/order-confirmation/[numeroPedido]/page.tsx` — entrada fina -> ConfirmationPage.
- `Ecommerce/app/(public)/payment-success/page.tsx` — entrada fina + Suspense -> PaymentSuccessView.
- `Ecommerce/app/(public)/payment-error/page.tsx` — entrada fina + Suspense -> PaymentErrorView.

Nuevos:
- `Ecommerce/styles/checkout.css` — .pg-checkout con tokens globales (0 degradados/sombras/blur; fix oscuro `.dark .pg-checkout span:not(...)` para ganar a la regla global con :not()).
- `Ecommerce/components/checkout/`: CheckoutPage (orquestador), ContactSection, DeliverySection, PaymentSection, ReceiptSection (+NotesSection), OrderSummary (aside desktop + resumen plegado movil + barra fija), ConfirmationPage, PaymentSuccessView, PaymentErrorView, Fields, RadioCard, checkoutShared (money S/ miles, fechaLarga es-PE, chips icono+palabra, waAyuda).

## Defectos D1..D10 eliminados

- D1: 0 degradados / 0 backdrop-filter / 0 sombras en .pg-checkout (medido); fuera la caja navy de Comprobante y la caja azul "Compra segura".
- D2: radios = tarjetas-radio de 64px+ con input full-cover; inputs/selects 48px; botones 52px; 0 objetivos <44px medidos.
- D3: sin "GRATIS" falso: sin cotizacion dice "Se calcula con tu direccion" y el total avisa "sin envio"; recojo muestra S/ 0.00; 422 bajo el campo direccion.
- D4/D6: money() con miles y tabular-nums en todo; fecha es-PE larga ("11 de octubre de 2026"); chips con icono+palabra; eliminado el boton gigante "Actualizar estado".
- D5: 5 metodos como tarjetas-radio con icono + consecuencia; notas por metodo (ERP valida Yape/Plin/transferencia; Culqi no almacena tarjeta; contraentrega al recibir).
- D7: payment-error sin "razones comunes"; muestra el mensaje real del backend + Reintentar pago real (POST /reintentar-pago).
- D8: checkout 1440 = 2260px (antes 3601); 390 = 3284px (antes 5958); confirmacion 1440 = 1302px (antes 2752).
- D9: h1 dentro del flujo, alineado al contenido; sin glow.
- D10: esqueleto de cotizacion, spinner "Creando tu pedido…" deshabilitado (sin doble submit), carrito vacio con "Ir al catalogo", 404 de confirmacion, pendiente de pago con "Que sigue".

## Verificacion observada

- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T ecommerce sh -c 'npx tsc --noEmit'` -> 0 errores en mis rutas (los errores TS existentes son de otros writers: catalogo/CatalogoClient.tsx, cuenta/SeguimientoPanel.tsx, servicios/ImportacionesForm.tsx).
- `... exec -T ecommerce sh -c 'npx eslint "app/(public)/checkout/page.tsx" "app/(public)/order-confirmation/[numeroPedido]/page.tsx" "app/(public)/payment-success/page.tsx" "app/(public)/payment-error/page.tsx" components/checkout'` -> 0 problemas.
- Playwright (headless shell 1243, contexto propio), localhost:3000, en .pg-checkout:
  - checkout 1440/1280/390 claro+oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras, 0 objetivos <44px, sin overflow-x, 0 pageerror. Alturas: 2260 / 2260 / 3284.
  - confirmacion 1440/1280/390 claro+oscuro: idem, 0 en todo (1302/2129 px).
  - payment-success 1440/390 claro + 1440 oscuro: 0 en todo. payment-error 1440/390 claro+oscuro: 0 en todo (tras fix del enlace inline "iniciar sesion" -> .lnki 44px). 404 1440/390: 0 en todo.
  - Capturas en /tmp/ecom-checkout/ (flow-01..15, m-*, final-*).
- Flujo real (sin pagos):
  - Cotizacion real: Arequipa "Calle Mercaderes 214" -> S/ 7.00 (arequipa_centro, 1.3 km); Lima Miraflores "Av. Larco 345" -> S/ 38.50 (lima_distancia, 9.1 km); Cusco -> S/ 30.00 (interprovincial fijo); "Urb. Los Pinos Mz B Lt 9" -> 422 bajo el campo ("No pudimos ubicar la direccion. Agrega avenida, numero y distrito.").
  - Pedido real guest Yape: POST /api/pedidos -> 201, numero CG-MV41DR71-A01027F1FD2B4461 (id 26). Confirmacion muestra el pedido real via GET seguimiento: chips Pendiente de pago/Pago pendiente, fecha "11 de octubre de 2026", total S/ 184.00 (177 + 7 envio).
  - Validacion cliente: factura con RUC de 10 -> errores bajo campo ("El RUC debe tener 11 digitos; ingresaste 10." + razon social), 0 llamadas a POST /api/pedidos.
  - Error 400 servidor: carrito con 99 und de producto 27 (stock 30) -> 400 y UN mensaje arriba "Stock insuficiente para Cable HDMI 2.0 de 2 metros" con ancla "Ir al resumen".
  - Reintentar pago autenticado (usuario seed 9015, JWT firmado en el contenedor): payment-error?id=28 -> POST /api/pedidos/28/reintentar-pago -> 200 con payment_token nuevo; luego falla "Culqi aun no esta configurado" en pantalla (no hay clave publica; NUNCA hubo cobro). Guest: boton deshabilitado con motivo + enlace a iniciar sesion (el backend exige sesion y propiedad, 401 sin token).

## Diferencias diseno vs backend (gana el backend)

- Tipo de documento: el diseno muestra DNI/CE/Pasaporte; el contrato real es DNI|RUC|CE -> se usa DNI / RUC / Carne de extranjeria.
- Departamento/Provincia/Distrito: el diseno usa selects con opciones inventadas; el backend acepta texto libre y cotiza con geocoding -> inputs de texto de 48px.
- "Envio y cargos" en confirmacion = total_final - suma de items (el seguimiento publico no devuelve el desglose de envio).
- "Ver seguimiento": no existe pagina publica de seguimiento de pedidos distinta; la propia confirmacion ES el seguimiento (GET /api/pedidos/seguimiento/:numero), asi que el boton re-consulta el estado en vivo.
- El navbar queda en su modo global (logo + links + carrito): el modo minimo del diseno requeriria tocar components/layout/* (prohibido).
- metodo_pago: el tipo TS acepta tambien mercadopago/niubiz, pero el contrato (checkout-data.json) limita a 5 -> solo 5 tarjetas.

## Pendientes (fuera de mi superficie)

- Navbar modo minimo (logo+carrito) para checkout/confirmaciones: requiere components/layout/Header.tsx.
- El ThemeToggle fijo (layout) tapa contenido abajo-izquierda en movil; visible en confirmacion 390.
- PageTransition del layout muestra una copia fantasma atenuada durante la transicion (capturas con doble render breve).
- Culqi sin NEXT_PUBLIC_CULQI_PUBLIC_KEY/CULQI_PUBLIC_KEY: el modal no abre en este entorno. Con clave sandbox, el flujo completo ya esta cableado (tokenizacion lib/culqi + X-Order-Payment-Token intactos).

## Seeds creados (marca seed-ecom)

- Pedido 26 · CG-MV41DR71-A01027F1FD2B4461 · guest "Seed Ecom Playwright" <seed-ecom@example.invalid> · yape · pendiente · S/ 184.00 · notas/ref "seed-ecom port checkout".
- Pedido 27 · CG-MV41QFIH-9521866AD8756383 · guest (token JWT mal pegado en el primer intento) · tarjeta · pendiente · S/ 119.00 · notas "seed-ecom retry tarjeta".
- Pedido 28 · CG-MV41XZO4-2F22F3FD8A4076D8 · user 9015 seed-ecom-cliente@example.com · tarjeta · pendiente · S/ 119.00 · notas "seed-ecom retry tarjeta" (usado para probar reintentar-pago).
