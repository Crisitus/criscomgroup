# Corrección del backend: inventario, ventas y códigos de barras

Feature doc ODD. Origen: auditoría del 2026-10-12 (memoria `criscomgroup/auditoria-backend-inventario`).
Repo: `/Users/soulkin/Downloads/criscom-web-main` — **sin git**: respaldar cada archivo en `odd/backup/fix-inventario/` antes de tocarlo. Commits imposibles; la evidencia es: backup + tests + este documento.
Modelo: Sonnet 5.5 en todo (worker ya configurado; verify tiene Opus -> NO usar gentle-ai-verify aquí, verificar con workers Sonnet o inline).
Tests: jest SOLO en contenedor, con candado: `mkdir /tmp/jest.lock; docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T -e NODE_ENV=test backend npx jest --runInBand --forceExit <suite>; rmdir /tmp/jest.lock`. REGLA BD: prohibido sync({force})/DROP/TRUNCATE/DELETE masivo; NODE_ENV=test NO cambia de BD.
Ninguna llamada de herramienta > ~4 KB.

## Verificación en vivo (2026-10-12, hecha)

- `ventas`: SIN UNIQUE(serie,correlativo) — solo PK, UNIQUE(orden_servicio_id), idx id_company_emisor.
- CERO CHECK constraints en la BD; `productos.stock`, `codigos_barras.cantidad`, `ventas.correlativo` = `int` con signo.
- `codigos_barras.codigo_barras`: UNIQUE existe (y hay un segundo índice único duplicado `codigo_barras_2` — limpieza menor).
- `productFor` (commercial.controller.js:11-15) SÍ usa `lock: LOCK.UPDATE` -> compras/cotizaciones correctas en lock.
- Rutas: `PATCH /productos/:id/stock` y `PATCH /productos/:id/decrement` existen (producto.routes.js:35-47); DELETE /ventas con middleware de rol (revisar cuál al ejecutar T5).

## Decisiones de diseño (tomadas)

1. **Fuente única de stock = `productos.stock`.** `codigos_barras.cantidad` se depreca: el POS deja de leerla/exigirla y deja de borrar la fila al llegar a 0. El barcode vuelve a ser solo identificador. La columna queda (legada) hasta fase de limpieza; el front muestra `productos.stock`.
2. **Patrón canónico de decremento** = UPDATE guardado atómico: `UPDATE ... SET stock = stock - n WHERE id=? AND stock>=n` (Sequelize `decrement` con `where`), dentro de la transacción, con chequeo de filas afectadas -> 400 "Stock insuficiente" si 0. Nada de read-modify-write en JS para stock.
3. **Correlativo** = tabla contador por serie con lock (patrón `series_comprobantes`: serie PK, ultimo_correlativo; SELECT ... FOR UPDATE + incremento) + UNIQUE(tipo_documento, serie, correlativo) tolerando NULLs como red de seguridad, tras deduplicar datos existentes.
4. **Servicio único** `Backend/src/services/stock.service.js`: `aplicarMovimiento({ productoId, delta, tipo, referencia, usuarioId, motivo, transaction })` -> UPDATE guardado + MovimientoInventario. Migran: POS (T1/T3), compras/ajustes, decrementStock, updateStock, venta.delete. Importaciones/adquisiciones ya son correctas; migrarlas es fase media.
5. **ENUM movimientos_inventario.tipo**: añadir `devolucion`/`anulacion` según se necesite en T5 (ALTER de ENUM).

## Tareas — CRÍTICOS (esta fase)

### T1 — POS: decremento atómico con guardia (crítico #1)
- `venta.controller.js:create` (~L44-82, ~L253-262): ordenar ítems por producto_id (orden de lock consistente, anti-deadlock), reemplazar RMW por `decrement` guardado con `where: { stock >= n }` para `productos` y `codigos_barras`; rollback+400 si afectadas=0.
- Test de concurrencia (RED primero): dos POST /ventas paralelos por la última unidad -> exactamente uno 2xx, stock final 0 (no -1, no 0-perdiendo-una).
- Suite: `Backend/__tests__/integration/venta-concurrencia.test.js` (nueva).
- Evidencia: RED (test falla contra código actual), GREEN, jest suite completa relacionada.

### T2 — Correlativo atómico (crítico #3)
- Tabla `series_comprobantes` (modelo + ensure script siguiendo patrón `scripts/ensure-*.js`), `Venta.create` la usa bajo lock.
- Antes del UNIQUE: consulta de duplicados existentes (GROUP BY serie,correlativo HAVING c>1); reportar, no borrar nada sin avisar.
- UNIQUE(tipo_documento, serie, correlativo) con NULLs permitidos.
- Test: dos ventas simultáneas misma serie -> correlativos distintos.

### T3 — Fuente única de stock (crítico #4)
- `services/stock.service.js` nuevo; POS migrado a él; POS ya NO chequea ni descuenta `codigos_barras.cantidad` ni destruye la fila en 0.
- Compras (`commercial.controller.js` ~L150-185) y ajustes (~L123) migrados al servicio (mantienen su lock actual).
- Cotización convertida: queda cubierta al usar el mismo servicio (`commercial.controller.js` ~L288-296).
- Front NO se toca en esta fase salvo que algo lea `cantidad` para mostrar stock (verificar y reportar).
- Tests: venta POS por barcode solo depende de productos.stock; compra sube stock y el POS puede vender sin tocar códigos.

### T4 — decrementStock / updateStock (crítico #5)
- `producto.controller.js:414-445, 463-509`: ambos por el servicio (transacción + lock + ledger + motivo obligatorio). Revisar middleware de rol de `producto.routes.js:35-47` y endurecer si hace falta (reportar antes de cambiar permisos).

### T5 — venta.delete (crítico #6)
- Fix bug `producto_id` vs `id_producto` (~L1049-1062); quitar catch que traga errores.
- Movimiento de reversa por línea (tipo `devolucion`, referencia a la venta); restauración atómica vía servicio.
- `PagoPos`: marcar/eliminar coherentemente (decidir con evidencia del modelo, reportar).
- Regla de bloqueo: solo bloquear si hay comprobante SUNAT real (`comprobante_emitido`), no por `tipo_documento='0'`.
- Rollback en el 403 (transacción filtrada, ~L994-1003).
- Líneas de servicio (detalle sin producto): no explotar (TypeError) — omitir restauración de stock en ellas.

### T6 — Constraints en BD (crítico #2 + red de #3)
- Script ensure (patrón existente): CHECK `stock >= 0` en productos; CHECK `cantidad >= 0` en codigos_barras (mientras la columna exista); UNIQUE de T2.
- Pre-chequeo de datos (negativos/duplicados existentes) -> reportar antes del ALTER.
- Limpieza del índice único duplicado `codigo_barras_2`.

## Tareas — MEDIOS (fase siguiente, solo listar)

- M1 ~~Cierre de caja~~ ✅ server-side: totales calculados desde Venta (el cliente solo declara saldo_efectivo); métodos mixtos/pago_link se anotan en observaciones; update ignora totales del cliente. Test caja-cuadre.test.js (RED 2/2 -> GREEN). Hallazgo: yape/plin sin pos_pago dan 500 por `id_adquirente = NaN` en pos.controller.js:61 (defecto menor preexistente, pendiente).
- M2 Pedido web: reserva de stock al crear pedido o manejo de "pagado sin stock" (pedido.controller.js:82 + order-finalization.service.js). REQUIERE DECISIÓN de negocio (reservar al crear afecta la disponibilidad mostrada).
- M3 ~~Cancelar orden ya facturada~~ ✅ bloqueada con 400 (ver F0+M3 evidencia).
- M4 Quants desalineados: rediseño estructural (las ventas deberían descontar quants o relajar setQuant). No empezar sin decidir el modelo.
- M5 ~~Idempotency key en POST /ventas~~ ✅ columna `idempotency_key` UNIQUE en ventas (modelo + ensure-series-comprobantes + índice en dev), controller devuelve la venta existente con `duplicada: true` (pre-check + fallback en catch ante carrera), front NewSalePage genera crypto.randomUUID() por intento y lo regenera al limpiar el carrito (resetForNewSale/clearCurrentCartState), SaleFormData.idempotency_key. Test venta-idempotencia.test.js (2/2). Nota: test escrito post-implementación (feature nuevo; el RED implícito es que el código viejo ignoraba la clave y duplicaba).
- M6 Barcode: trim() trivial; UNIQUE por negocio es cambio de esquema + alcance del lookup del POS (afiliados). Decidir si el EAN puede repetirse entre negocios.
- M7 Segunda mano: DetalleVenta con serie/id_adquisicion = cambio de esquema + flujo POS (elegir serie al vender). Feature, no fix.
- M8 ~~postventa reingreso_stock~~ ✅ IMPLEMENTADO 2026-10-12: updateAdmin resuelve el producto desde venta_id (DetalleVenta+producto, línea única o coincidencia por nombre) o pedido_id (PedidoDetalle) y aplica aplicarMovimiento (+cantidad, 'ajuste_entrada', referencia_tipo 'postventa_reingreso', referencia_id=id_solicitud) DENTRO de la transacción; idempotente (si ya existe el movimiento no repite — resolver después de aprobar no duplica); sin vínculo = 400 claro. Test postventa-reingreso.test.js + postventa-logica 12/12. Backup postventa.controller.js.pre-m8.
- M9 ~~Auditoría~~ ✅ reintento garantizado: registrarEventoConReintento (3 intentos, backoff 250ms×2^n) en audit.middleware.js; si agota, log de error sin interrumpir la respuesta (la opción 'dentro de la transacción' exigía refactor de todos los controladores; se eligió la alternativa del plan). Test unitario audit-reintento.test.js 3/3. Backup audit.middleware.js.pre-m9.
- M10 Importación recibida sin reversa: feature nueva (flujo de anulación de recepción).

## POS front — evidencia (2026-10-12)

- utils/salesDialogs.tsx (1617 líneas, los 3+ diálogos del POS): eliminadas 24 clases del estilo viejo (bg-gradient-to-br/to-r/to-b, shadow-xl/md/lg/sm, backdrop-blur-sm) -> superficies planas con tokens (bg-white/dark:bg-gray-900, bg-gray-50/100, bg-green-50, bg-blue-50, acento bg-purple-500). Backup salesDialogs.tsx.pre-pos.
- Verificación: tsc 0, eslint 0 errores (contenedor). E2E Playwright (crlogin-fresh, 1280x720): venta real por barcode 7750001000011 -> Cobrar -> SunatAlertDialog ('Guardar venta', plano) -> venta registrada (toast) -> diálogo Nota de venta medido: 26 superficies, 0 gradientes, 0 backdrop-blur, 0 pageerrors. OJO: 'Cargando documento...' es la limitación conocida de chrome-headless-shell con PDF en iframe.
- Limpieza E2E: la venta de prueba (id 177, NV01-00000114) se anuló por DELETE /api/ventas (T5 en vivo): kardex dev muestra venta 9->8 y anulacion_venta 8->9.
- NOTA: el Dialog base compartido (components/ui/dialog.tsx) trae shadow-xl y overlay backdrop-blur propios: es la baseline de elevación del sistema en todo el ERP, no se tocó.

## T5 — evidencia (2026-10-12)

- venta.controller.js `delete` reescrito: rollback en el 403 (antes filtraba la transacción abierta); venta bloqueada con LOCK.UPDATE; bloqueo solo si `comprobante_emitido` o existe DocumentoElectronico (antes `tipo_documento='0'` truthy hacía inoperante la anulación de CUALQUIER venta POS).
- Restauración por aplicarMovimiento (tipo ajuste_entrada, referencia_tipo 'anulacion_venta', motivo con serie-correlativo): el kardex registra la reversa. Se evitó ALTER del ENUM usando ajuste_entrada.
- Bug `producto_id` vs `id_producto` eliminado de raíz: el bloque de restauración de codigos_barras se BORRÓ (la columna cantidad es legada desde T3; restaurarla recreaba la doble fuente).
- Detalles sin producto (líneas de servicio) se omiten (antes TypeError -> 500).
- PagoPos de la venta se destruye en la misma transacción (antes quedaba huérfano).
- Test nuevo: venta-anulacion.test.js (5 casos: anula ticket NV01 con reversa exacta, barcode intacto, PagoPos eliminado, bloqueo con comprobante emitido, línea de servicio sin producto).
- La ruta DELETE /ventas/:id ya era solo rol 1 con auditoría (venta.routes.js:45).

## T4 — evidencia (2026-10-12)

- producto.controller.js: updateStock y decrementStock reescritos con transaccion + findAccessibleProduct con `lock: LOCK.UPDATE` + aplicarMovimiento (kardex incluido; decrementStock antes NO escribia movimiento). decrementStock acepta motivo opcional (default 'Decremento manual de stock'); respuestas 400 con el mismo formato ({message, stockActual, cantidadSolicitada}).
- PUT /:id (update): el campo stock ya no se asigna en el save; tras el save se abre transaccion, se bloquea la fila y el delta se calcula sobre el valor real -> ajuste absoluto correcto bajo concurrencia; movimiento 'edicion_producto' lo escribe el servicio.
- Rutas ya tenian verificarHorarioOArea('inventario') + auditoria: no se tocaron permisos.
- Test nuevo: stock-ajustes.test.js (5 decrementos concurrentes sobre stock 2 -> 2 entran; PATCH absoluto con movimiento exacto; 400 formato; PUT con stock bajo lock).
- Backup pre-t4: producto.controller.js.

## T3 — evidencia (2026-10-12)

- Nuevo services/stock.service.js: `aplicarMovimiento({productoId, delta, tipo, referencia, motivo, usuarioId, affiliateBusinessId, costoUnitario, transaction})` -> UPDATE guardado atomico (delta<0 con WHERE stock>=n; lanza Error status 400 con stockActual) + relectura bajo lock + MovimientoInventario. Unico punto de escritura de productos.stock.
- POS (venta.controller.js): eliminado el chequeo/decremento/destroy de codigos_barras.cantidad (barcode vuelve a ser solo identificador; columna legada intacta); detalle usa aplicarMovimiento con mapeo 400 {message, stockActual} igual que antes.
- commercial.controller.js migrado: adjust (delta con signo + update aparte de stock_minimo/ubicacion + reload), createPurchase (servicio + update aparte de ultimo_costo/costo_promedio), voidPurchase (servicio + update aparte de costo_promedio), convertQuote (servicio). Todos conservan sus locks FOR UPDATE de productFor.
- Test nuevo: stock-fuente-unica.test.js (vende con cantidad legada 0, compra habilita venta sin tocar barcode, fila barcode sobrevive al 0, rechazo 400 sin stock).
- PENDIENTE front: el POS front aun pre-valida con codigosBarras.cantidad (codigoBarrasService.ts, salesDialogs.tsx) -> puede bloquear venta con stock real si la cantidad legada quedo en 0. Reportar al usuario; fix front en fase posterior.
- Backups pre-t3: venta.controller.js, commercial.controller.js.

## T2 — evidencia (2026-10-12)

- Hallazgo nuevo durante T2: `service-order-finalization.service.js` crea Venta con serie pero SIN correlativo (se asigna al emitir); `facturacion.controller.js` re-asigna serie/correlativo al emitir con otro MAX (por emisor). `documentos_electronicos` YA tenia UNIQUE(id_company_emisor, tipo, serie, correlativo); dev sin duplicados historicos.
- Nuevo: models/serie_comprobante.model.js (tabla series_comprobantes), services/correlativo.service.js (`siguienteCorrelativo`: INSERT ... ON DUPLICATE KEY UPDATE dentro de la tx; huecos por rollback aceptables porque la numeracion SUNAT definitiva se asigna al emitir), scripts/ensure-series-comprobantes.js (crea tabla, siembra MAX por serie POS:<serie>, crea UNIQUE en ventas solo si no hay duplicados; cableado en index.js tras 'esquema auditoria').
- venta.controller.js: los dos MAX (NV01 y rama comprobante) usan ahora `siguienteCorrelativo('POS:'+serie)`. venta.model.js: indice UNIQUE(serie, correlativo) para la BD de test (sync force).
- facturacion.controller.js (emision): bucle de reintento (x6) ante duplicate-key/ER_DUP_ENTRY recalculando el MAX dentro de la misma transaccion (MySQL no aborta la tx por duplicate-key); sale.update se hace una sola vez con el correlativo final.
- Test nuevo: Backend/__tests__/integration/venta-correlativo.test.js (6 NV01 + 4 B001 concurrentes, productos distintos para no chocar con la guardia de stock de T1).
- Backups pre-t2 en odd/backup/fix-inventario/ (venta.controller, facturacion.controller, venta.model, models/index, index.js).

## T1 — evidencia (2026-10-12)

- Implementación inline (worker bootstrap exige git y el repo no tiene; se mantiene disciplina backup+RED/GREEN).
- `venta.controller.js:create`: ítems ordenados por codigo_barras (orden de lock consistente); decrementos reemplazados por UPDATE guardado (`literal('cantidad - n')` / `literal('stock - n')` con `WHERE ... >= n`, validate:false) sobre CodigoBarras y Producto; afectados=0 -> rollback + 400 con el mismo mensaje; destroy del barcode solo si queda en 0 (guardado); stock_anterior/stock_nuevo del movimiento se releen dentro de la transacción (fila bloqueada) -> ledger exacto.
- Pre-chequeos amigables conservados (mensajes idénticos en el caso no concurrente).
- Fix lint preexistente: `sunat_data` sin uso (updateComprobanteStatus) y `producto_id` sin uso en el for de productosMap.
- Test nuevo: Backend/__tests__/integration/venta-concurrencia.test.js (5 concurrentes x1, 2x3 sobre stock 5, ráfaga 4 pares sobre stock 2).

## Estado

| Tarea | Estado | Evidencia |
|---|---|---|
| Verificación BD en vivo | ✅ 2026-10-12 | este doc, sección superior |
| T1 POS atómico | ✅ 2026-10-12 | RED 3/3 fallan (sobreventa observada: 2 ventas de 3 con stock 5; 4 vendidos con stock 2) -> GREEN 3/3; suites ventas/inventario/quants/sources/commercial 22/22. Backup odd/backup/fix-inventario/venta.controller.js.pre-t1 |
| T2 Correlativo | ✅ 2026-10-12 | RED 2/2 (6 NV01 -> 1 correlativo distinto; 4 B001 -> 1) -> GREEN 8/8 (correlativo+concurrencia+ventas). Contadores sembrados en dev (NV01=113, B001=37, F001=24) y UNIQUE ventas_serie_correlativo_unique creado |
| T3 Fuente única | ✅ 2026-10-12 | RED 3/4 -> GREEN 31/31 (8 suites). services/stock.service.js (aplicarMovimiento); POS/compras/ajustes/anulacion-compra/cotizacion migrados |
| T4 decrement/updateStock | ✅ 2026-10-12 | RED 1/4 (decrementos concurrentes) -> GREEN 35/35 (9 suites). updateStock, decrementStock y PUT /:id (stock) por stock.service con lock |
| T5 venta.delete | ✅ 2026-10-12 | RED 4/5 -> GREEN 40/40 (10 suites). Bloqueo solo con comprobante emitido/doc electrónico, reversa en kardex (anulacion_venta), PagoPos sin huérfanos, líneas de servicio omitidas, 403 con rollback, barcode legado intacto |
| T6 Constraints | ✅ 2026-10-12 | CHECK stock>=0 y cantidad>=0 creados en dev; índice duplicado codigo_barras_2 eliminado; ensure cableado en index.js |

## F0 + M3 — evidencia (2026-10-12, fase medios)

- F0 Front POS (NewSalePage.tsx): los 4 topes de disponibilidad que usaban `barcode.cantidad` (legado) ahora usan `product.stock` (selectBarcode, addProductFromSearch, tecla 'a' último producto, addToCart maxQuantityAvailable). tsc 0 y eslint 0 errores en contenedor frontend. Backup odd/backup/fix-inventario/NewSalePage.tsx.pre-f0.
- M3 (ordenServicio.controller.js update): orden con venta_id NO puede pasar a 'cancelado' (400 'La orden ya generó su venta contable...'); antes reponía stock de repuestos sin anular la Venta. Flujo completo de anulación contable de servicios queda como follow-up. Test nuevo: orden-cancelacion-facturada.test.js (verde: 400, stock intacto, estado sin cambiar, venta vigente).

## T6 — evidencia

## T6 — evidencia (2026-10-12)

- Nuevo scripts/ensure-inventory-constraints.js (cableado en index.js tras 'series de comprobantes'): crea chk_productos_stock_nonneg y chk_codigos_barras_cantidad_nonneg solo si no hay negativos historicos (dev: 0 y 0); elimina el índice único duplicado codigo_barras_2. Idempotente (information_schema + SHOW INDEX).
- Sin test RED: es DDL de BD real; verificación proporcionada = ejecución observada en dev + suite completa.
- Suite COMPLETA: 323/325. Los 2 fallos son PREEXISTENTES y ajenos al feature (documentados en ESTADO-SESION.md): recepcion-custodia.test.js pasa con TZ=America/Lima (bug hora de pared ordenServicio.controller.js:1113,1134) y orden-servicio-garantia.test.js falla por fechas fijas vencidas.
- Backup pre-t6: index.js.

## T5 — evidencia |
