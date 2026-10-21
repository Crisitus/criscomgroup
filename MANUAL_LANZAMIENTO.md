# Manual de lanzamiento

## Estado permitido antes de producción

- `PAYMENTS_MODE=sandbox`
- `SUNAT_MODE=sandbox`
- solo RUC 10 habilitado; RUC 20 fuera del flujo operativo
- llaves, certificados y contraseñas fuera del repositorio

## Lista de verificación

### Código

- Backend: `npm test`.
- ERP: `npm test`, `npm run lint` y `npm run build`.
- Ecommerce: `npm run type-check` y `npm run build`.
- Confirmar que no haya archivos `.env`, `.p12`, `.pem` o llaves versionados.

### Infraestructura

- HTTPS válido para el dominio.
- Tienda en `/`, ERP en `/erp` y API en `/api`.
- MySQL sin acceso público.
- Secret Manager con JWT, base de datos, SUNAT y Culqi.
- Cuenta de servicio con permisos mínimos.
- Copias de seguridad automáticas y prueba de restauración.
- Límite de instancias y alertas de presupuesto.
- Almacenamiento persistente para imágenes, XML y CDR.

### Prueba de compra

1. Crear un producto de prueba con stock conocido.
2. Agregarlo desde portada, catálogo y detalle.
3. Cambiar cantidad y eliminarlo del carrito.
4. Validar recojo gratuito y delivery a domicilio en ambas ciudades: Lima debe calcular desde Galerías Wilson y Arequipa desde Compuplaza.
5. Confirmar que el checkout muestre distancia y tarifa, y que el backend recalcule y sume el envío al total del pedido.
6. Crear boleta y factura de prueba.
7. Pagar con una tarjeta de prueba Culqi.
8. Verificar un solo descuento de stock, una sola venta y un solo pago.
9. Reenviar el webhook y comprobar idempotencia.
10. Confirmar que el seguimiento público no muestra datos personales.

### SUNAT

1. Emitir solo contra el servicio BETA.
2. Comprobar firma, nombre ZIP, serie/correlativo, XML y CDR.
3. Verificar respuesta aceptada y rechazo controlado.
4. Confirmar que una nota interna no puede enviarse.
5. Guardar una copia privada de XML y CDR.

## Pase a producción

El cambio a producción requiere una ventana controlada:

1. detener nuevas ventas durante la migración;
2. realizar copia final y verificarla;
3. migrar la base de datos;
4. desplegar con pagos y SUNAT aún en sandbox;
5. ejecutar pruebas de humo públicas;
6. activar primero Culqi producción y realizar un cargo mínimo autorizado;
7. activar SUNAT producción y emitir un comprobante real controlado;
8. revisar CulqiPanel, SUNAT y el ERP;
9. reabrir ventas.

No activar ambos proveedores simultáneamente sin haber validado primero el dominio, los webhooks y las copias de seguridad.
