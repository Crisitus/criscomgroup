# Manual de operación — Criscom Group

## Jerarquía, menús y manuales por perfil (actualización 2026-08-10)

- **Cuenta maestra (Crisitus):** se identifica por el correo maestro configurado y el rol 1. Es la máxima autoridad. Controla usuarios, perfiles, afiliados, auditores, Servicio técnico, pagos/POS, importaciones y logs.
- **Administrador:** es la mano derecha operativa. Puede recibir superusuario con vencimiento concedido por Crisitus, pero nunca modificar a Crisitus, ampliar su propio plazo ni entrar a Importaciones.
- **Auditor temporal:** revisa pedidos, pagos, entregas y trazabilidad; puede corregir incidencias operativas verificables dejando evidencia, pero no cambia la estructura, usuarios ni elimina logs.
- **Técnico:** gestiona ingresos, órdenes, diagnósticos, cotizaciones técnicas, repuestos, pagos, evidencias, pruebas, entregas y garantías. Puede solicitar otras áreas a Crisitus.
- **Vendedor físico:** registra ventas de CRISCOM, consulta stock y opera su caja dentro del horario configurado.
- **Vendedor virtual:** registra ventas de CRISCOM, consulta stock y opera su caja sin la restricción del local físico.
- **Afiliado:** opera un negocio separado; inventario, ventas, caja, cierres y libros no se suman a CRISCOM. Solo ve su negocio y suscripción. En el primer acceso debe configurar nombre comercial y logo antes de operar.
- **Cliente:** usa la tienda pública y sus pedidos; no ingresa al ERP.

Los permisos adicionales se solicitan desde **Solicitudes de acceso**. Solo Crisitus puede aprobarlos, definir su vigencia o revocarlos. Importaciones y la protección de la cuenta maestra nunca se delegan. Una tienda afiliada puede habilitar su propia área técnica, aislada por negocio, pero no recibe la bandeja de solicitudes web de CRISCOM.

La identidad se configura en **Logo, nombre y suscripción**. El nombre admite de 3 a 120 caracteres. El logo debe ser PNG, JPG o WEBP, mínimo 256 × 256 px y máximo 2 MB; se encaja visualmente en 160 × 160 px sin recortarse ni deformarse. Después puede reemplazarse desde el mismo menú.

La cuenta maestra asigna perfiles desde **Vendedores y roles** usando el correo registrado en la web. Al cierre mensual se liquida el 8% de ventas afiliadas válidas, excluyendo anulaciones y devoluciones. El afiliado paga con tarjeta o presenta un pago manual. Solo la validación del gerente reactiva una cuenta suspendida. CRISCOM registra únicamente la comisión validada.

### Orden del menú

El menú sigue la frecuencia y el flujo natural de trabajo:

1. **Dashboard:** resumen y alertas.
2. **Ventas:** registrar venta, historial, pedidos/pagos web, entregas y caja diaria.
3. **Servicio técnico:** ingreso rápido, solicitudes web, órdenes y armado de PCs. Visible para Crisitus, técnicos y usuarios con concesión vigente.
4. **Inventario y compras:** consulta de stock, categorías, compras e importaciones.
5. **Marketing:** ofertas, redes y banners.
6. **Administración:** pagos/POS, empresa/SUNAT, roles, documentos, reclamos, solicitudes y auditoría.
7. **Manual de mi perfil:** guía calculada según correo, rol y tipo de vendedor.

Las opciones que no corresponden al perfil no se muestran. La ausencia de un menú es una protección deliberada, no un error de carga.

El **Centro de servicios** es la portada del área: Recepción crea el expediente; Servicio técnico y Armado de PCs abren vistas separadas sobre el mismo motor de órdenes; Solicitudes web convierte datos públicos sin copiarlos manualmente. Importaciones aparece como proceso relacionado solo para Crisitus y abre el expediente privado existente, nunca crea una segunda importación.

En Marketing, cero banners significa que la web usa únicamente su portada institucional; ya no se fuerza una imagen. Un banner puede quedar oculto sin eliminarse y cada recurso tiene título y orden. Con un solo banner no aparecen flechas; desde dos recursos el carrusel rota y permite navegación manual.

### Primer ingreso de cualquier usuario

1. Iniciar sesión con una cuenta personal; nunca compartir credenciales.
2. Confirmar nombre y perfil en el menú lateral.
3. Abrir **Manual de mi perfil** y leer “Lo que puedes hacer” y “Límites de tu perfil”.
4. Seguir el flujo detallado que aparece para su función.
5. Cerrar sesión al terminar, especialmente en equipos compartidos.

El manual dentro del ERP cambia automáticamente entre Cuenta maestra, Administrador, Auditor temporal, Técnico, Vendedor interno y Negocio afiliado. Cada versión explica primer acceso, flujo diario, tareas permitidas, límites, solicitudes de acceso y cierre de jornada.

### Control comercial unificado

- **Inventario avanzado:** muestra stock actual, mínimo, ubicación, último costo, costo promedio ponderado, valor almacenado y margen unitario/porcentual.
- **Compras y proveedores:** al recibir una compra distribuye flete y costos adicionales entre sus líneas, incrementa stock, actualiza último costo y recalcula el costo promedio ponderado.
- **Kardex:** cada compra, venta o ajuste conserva stock anterior, stock nuevo, costo, usuario, motivo y referencia.
- **Cotizaciones profesionales:** escenarios económica, recomendada, premium o personalizada; vigencia, descuento, costo total, precio total y margen. Una cotización aprobada puede convertirse en venta y descuenta stock dentro de una transacción.
- **Segunda mano:** conserva el expediente legal y de procedencia existente; no se mezcla con una compra ordinaria.
- **Importaciones:** permanece exclusivamente disponible para Crisitus.

CRISCOM usa registros con negocio principal. Cada afiliado utiliza su propio `affiliate_business_id`; proveedores, compras, productos, movimientos, cotizaciones, ventas, caja y servicio técnico no se cruzan entre tiendas. Crisitus conserva la supervisión consolidada.

Este documento describe el uso diario de la tienda y del ERP. No contiene contraseñas, llaves API ni certificados.

## 1. Tipos de usuario

- **Cliente:** compra, consulta sus pedidos y envía solicitudes. No accede al ERP.
- **Vendedor:** entra al ERP con su correo y contraseña. Solo consulta y registra sus propias ventas y estadísticas.
- **Administrador:** administra operaciones permitidas por su rol.
- **Cuenta maestra:** administra vendedores, roles, emisores fiscales y configuración general.

La tienda siempre abre en modo público. El ERP aparece únicamente después de iniciar sesión con una cuenta autorizada.

## 2. Venta por la tienda

1. Abrir el catálogo o la portada.
2. Revisar condición, stock, precio y garantía del producto.
3. Pulsar **Agregar al carrito**.
4. Abrir el carrito y pulsar **Finalizar compra**.
5. Completar contacto, entrega, pago y comprobante.
6. Elegir boleta o factura. Para factura son obligatorios RUC de 11 dígitos y razón social.
7. Confirmar el pedido.

El servidor vuelve a calcular precios, ofertas, envío y stock; nunca confía en el monto enviado por el navegador.

Si un producto aparece repetido en varias líneas, el servidor suma todas sus cantidades antes de validar el stock. El pedido no se acepta si el total solicitado supera las existencias disponibles.

### Pagos

- **Tarjeta:** Culqi tokeniza los datos; el sistema nunca recibe ni almacena el número completo o CVV.
- **Yape, Plin, transferencia o contraentrega:** el pedido queda pendiente hasta que un usuario autorizado confirme el pago.
- Si aparece **Pago recibido y en verificación**, no se debe volver a cobrar. El webhook o un administrador conciliará la operación.

## 3. Venta en el ERP

1. Entrar en **Ventas → Nueva venta**.
2. Seleccionar o escanear productos.
3. Confirmar cantidades, condición y precio.
4. Elegir método de pago y tipo de documento.
5. Registrar la venta.
6. Para boleta o factura, abrir el detalle y pulsar **Emitir comprobante** solo después de verificar los datos del cliente.

Las ventas web quedan asignadas a la cuenta maestra del sistema; las ventas del ERP quedan asociadas al vendedor autenticado.

### Relación entre venta, stock y kardex

- Confirmar una venta del ERP crea la venta y sus detalles, descuenta las existencias y registra el movimiento de kardex como una sola operación.
- Confirmar el pago de un pedido web genera su venta vinculada, descuenta stock y registra el mismo tipo de movimiento.
- El kardex conserva producto, cantidad, stock anterior, stock nuevo, costo disponible, usuario, negocio y referencia a la venta.
- Si falla cualquiera de esos pasos, la transacción se revierte; no debe quedar una venta confirmada sin su descuento y movimiento de inventario.
- Un pedido creado pero todavía impago no descuenta stock. Las existencias se vuelven a validar cuando se confirma el pago, por lo que un pedido puede requerir revisión si otro canal agotó el producto antes del cobro.

## 4. Productos nuevos y de segunda mano

- **Nuevo:** garantía comercial predeterminada de 12 meses, editable según el producto y las condiciones reales del proveedor.
- **Segunda mano:** garantía comercial predeterminada de 3 meses, con estado y observaciones visibles.
- Registrar primero la procedencia real en **Adquisiciones de usados**. No usar una donación para ocultar una compraventa.
- La nota de venta es un documento interno y no reemplaza una boleta o factura cuando estas sean legalmente exigibles.

Los textos de garantía son comerciales; cualquier cláusula debe respetar la normativa peruana de protección al consumidor. Revisar los casos especiales con contador o abogado.

## 5. Vendedores

La cuenta maestra abre **Vendedores → Administrar cuentas** para:

- consultar correos y estadísticas;
- asignar rol Cliente, Vendedor o Administrador;
- crear o actualizar cuentas.

Un vendedor no puede consultar correos, ventas ni estadísticas de otros vendedores, ni cambiar el emisor fiscal.

## 6. Facturación SUNAT

- **Nota de venta:** permanece interna y nunca se envía a SUNAT.
- **Boleta:** serie configurada para el emisor activo.
- **Factura:** requiere RUC y razón social válidos.
- El RUC 10 permanece como emisor predeterminado.
- Por ahora el sistema opera exclusivamente con el RUC 10. El RUC 20 no aparece ni puede seleccionarse en el flujo operativo.

Los datos no secretos del RUC 10 (razón social, domicilio fiscal y series) se administran en **Facturación SUNAT**. El certificado y las credenciales SOL permanecen privados en el servidor y el menú solo muestra su estado.

Consultar estados en **Facturación electrónica → Documentos recientes**. Un documento rechazado no debe reenviarse cambiando emisor o número; primero se corrige la causa.

## 7. Cierre diario

1. Revisar pagos pendientes o en conciliación.
2. Revisar comprobantes rechazados o con error.
3. Confirmar que las ventas y el stock coincidan.
4. Ejecutar el cierre de caja por vendedor.
5. Comprobar que la copia de seguridad automática finalizó.

### Cierre y facturación de Servicio Técnico

1. Registrar diagnóstico, trabajo, mano de obra, repuestos y pagos en la misma orden.
2. Una orden compuesta solamente por trabajo o mano de obra se clasifica automáticamente como recibo por honorarios.
3. Si existe al menos un producto o repuesto, la operación completa se clasifica como boleta o factura; con RUC de 11 dígitos se prepara factura y en los demás casos boleta.
4. Al completar el pago se crea la venta contable de servicios y queda pendiente la emisión electrónica correspondiente. Un adelanto parcial no genera el cierre contable.
5. No se puede marcar la orden como entregada con saldo pendiente. Una vez creada la venta, los importes y repuestos quedan bloqueados; las correcciones requieren el flujo contable de anulación.
6. Caja del taller muestra por separado venta de servicios, venta de repuestos, costo de repuestos, cobros por método, anulaciones y saldo por cobrar.

El estado `pendiente_emision` significa que la operación está clasificada y contabilizada, pero SUNAT todavía no confirmó el comprobante. No debe entregarse al cliente un número RHE, boleta o factura inventado manualmente desde el ERP.

## 8. Incidentes

- **Culqi aprobó pero el pedido no cambió:** no cobrar otra vez; revisar el pago y esperar/reprocesar el webhook.
- **Stock insuficiente tras un pago:** inmovilizar la operación y decidir reposición o devolución desde Culqi.
- **SUNAT rechazó:** conservar XML/CDR, corregir datos y seguir el procedimiento tributario correspondiente.
- **Cuenta comprometida:** desactivar la cuenta, cambiar contraseña y revisar auditoría.
# Importaciones y Aduanas

El menú privado **Importaciones y Aduanas** aparece únicamente para la cuenta maestra. Permite registrar proveedor, país de origen, tracking, régimen, DAM/DUA, estado, mercancía, flete, seguro, tributos y otros costos. Los registros son editables y pueden exportarse en CSV para el contador.

Las credenciales SOL y el certificado nunca se guardan en el ERP ni en el repositorio. El backend los lee desde el almacén privado del servidor. Actualmente solo el emisor RUC 10 está habilitado; el RUC 20 permanece deshabilitado.
## Marketplace, afiliados y pagos

- **Vendedores CRISCOM:** físico (sujeto al horario del local) o virtual (24/7). Venden para la instancia principal.
- **Afiliados:** negocios independientes con inventario, ventas, caja y libros propios dentro del ERP multinstancia.
- **Prueba gratuita:** dos meses desde la creación del negocio afiliado, sin comisión ni suspensión.
- **Comisión posterior:** 8% sobre ventas cobradas válidas fuera del periodo gratuito.
- **Pago de suscripción:** tarjeta mediante Culqi o pago manual que solo Crisitus puede aprobar.
- **Pago de compras web:** tarjeta Culqi, contraentrega, Yape, Plin o transferencia. Los datos completos de tarjeta se ingresan en Culqi y no se almacenan en CRISCOM.
- **Delivery:** Lima y Arequipa se cotizan por distancia de ruta. El origen predeterminado de Lima es Galerías Wilson y el de Arequipa es Compuplaza (Octavio Muñoz Nájar 223). Lima: S/10 hasta 5 km y S/7 por cada km adicional. Arequipa: S/7 hasta 5 km y S/3 por cada km adicional. Los importes se redondean hacia arriba a S/0.50. Otros destinos cuestan S/30 y el recojo en tienda es gratuito. Los orígenes y tarifas pueden ajustarse mediante variables de entorno.
- **Colas ERP:** antes del pago, el pedido queda en Pagos por confirmar. Después del pago, o tras validar una contraentrega, pasa a Deliverys por confirmar con dirección, contacto, referencia, productos y tarifa.
- **Vencimiento:** pedidos sin pago se eliminan automáticamente después de 24 horas, al cancelarse o mediante eliminación manual. Los pagados se conservan por trazabilidad.
