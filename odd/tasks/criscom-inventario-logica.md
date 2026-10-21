# Criscom: Inventario y compras - correccion de logica (antes de Open Design)

## Objective
Corregir los bugs de logica de las 6 pantallas de Inventario y compras para que funcionen de verdad; luego disenar en Open Design y portar.

## Scope / constraints
- Backend: producto, codigo_barras, categoria, commercial (compras/cotizaciones/proveedores), importacion, adquisicion.
- Frontend: solo logica en servicios y handlers (stock, campos del alta); la UI nueva sale de Open Design.
- Sin git: no hay commits. Backup de originales: odd/backup/inventario/.
- Tests: jest contra db-test (perfil test del compose dev).

## Tasks
- [x] T1 Productos backend: SKU dup 409 en update, precio 0 rechazado en validador, oferta se recalcula al cambiar precio, borrar producto con historial -> 409.
- [x] T2 Codigos de barras: aislamiento por negocio (IDOR) y productos de afiliado (unscoped + acceso).
- [x] T3 Productos frontend: detalle no pone stock en 0 a productos sin codigos; alta envia condicion/origen/garantia/observaciones; foto no pisa esos campos.
- [x] T4 Cotizaciones: transiciones validas (convertida final), estado inicial solo borrador/enviada, vigencia vence y bloquea convertir, margen sobre neto sin IGV, venta convertida cuadra con descuento, cantidades enteras.
- [x] T5 Compras/proveedores: handlers con try/catch, whitelist en proveedor, USD convertido a PEN, cantidades enteras, anular compra con reversa de stock, numeracion sin choques.
- [x] T6 Categorias: borrar con productos -> 409 con mensaje, nombre unico, front no borra imagen inexistente ni duplica toast.
- [x] T7 Importaciones: costos/TC bloqueados tras recibir, cancelar tras recibir bloqueado, permiso maestro con una sola fuente.
- [x] T8 Adquisiciones: no pisar condicion de stock nuevo, registrar inventario despues (PUT), area compras, producto '' -> null, PUT parcial.
- [ ] T9 Tests verdes + verificacion manual en navegador.

## Progress (2026-10-10, inline Opus 5.5 por cambio de modelo del usuario)
- Route: inline (usuario cambio a Opus para esta correccion); sin git -> sin commits.
- Backend: commercial.controller reescrito (safe/inTransaction: responde DESPUES del commit; transiciones de cotizacion; vigencia auto-vence al listar; margen neto; descuento repartido en lineas; compras USD->PEN, multi-linea sin repetidos, anular compra POST /purchases/:id/void; proveedor whitelist; ajuste exige motivo y respeta quants; movements?producto_id).
  producto.controller (SKU 409 cross-negocio, oferta proporcional, borrar con historial 409, stock entero), validate (precio > 0), codigo_barras (aislamiento por negocio, codigo unico global 409, cantidad >=1, permisos area inventario), categoria (nombre unico 409, borrar en uso 409, total_productos/unidades, productos por negocio), importacion (costos/estado bloqueados tras recibir, cancelada final, producto opcional salvo recibida), adquisicion (no mezcla usado con stock nuevo, PUT parcial y registrar despues, area compras, auditor solo lectura, serie duplicada amigable), crisitusOnly usa MASTER_ADMIN_EMAIL.
- Frontend: ProductDetail solo envia stock si el producto usa codigos; alta envia condicion/origen/garantia/obs; foto no pisa campos; categorias sin doble toast ni DELETE de imagen inexistente; CommercialControl allSettled y sin desmontar QuoteManager; margen neto en QuoteManager; servicios voidPurchase/updateSupplier/movements(params).
- [x] T9 Proof: jest commercial-control (7), inventario-logica (6 nuevos), productos, inventory-quants, inventory-sources, adquisicion-evaluation = 34/34. Suite completa: 5 suites fallan igual que con el codigo original (pedidos/solicitudes por rate-limit en corrida completa; recepcion-custodia, marketplace, garantia preexistentes: 3/26 tambien con backup). tsc limpio; eslint 1 error preexistente (rama muerta `false ?` en CommercialControlPage). Playwright: guardar producto 27 sin codigos conserva stock 30.
- Pendiente en el port (UI): compra multi-linea, anular compra, rechazar cotizacion, historial de movimientos, ajuste manual, editar condicion/origen/garantia en el detalle, bloquear campos de importacion recibida.
- Notas sin resolver (politica de negocio): rol 3 no afiliado ve y edita todo el catalogo central; tributos de importacion pueden incluir IGV recuperable; cotizar exige stock.

## OD runs (2026-10-10, claude-sonnet-5-5)
Briefs: odd/tools/brief_inv_*.py (comun: briefs_inv_common.py) -> odd/opendesign/criscom-inv-*/{DESIGN.md,*-data.json,referencias/}.
Run IDs en odd/tmp/runs-inv.txt (7 runs: productos, producto-detalle, compras, cotizaciones, categorias, adquisiciones, importaciones). Pendiente: revisar tableros con Playwright y aprobacion del usuario.

- 2026-10-10: usuario APROBO los 7 disenos ("me gusta como quedo el disenio lo aplicas"). index.html copiados a odd/opendesign/criscom-inv-*/index.html. Revisados: 0 degradados/blur, 0 errores JS, sombras solo en dialogos/menus/paneles; inputs de 42 px -> subir a 44 al portar.
