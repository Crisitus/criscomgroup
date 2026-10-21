# Auditoría de lógica: Administración > Tickets PDF y Exportar productos

Solo lectura de código; BD consultada con SELECT. Fecha 2026-10-10.
Rutas: `Frontend/src/App.tsx:258-273` (ambas con `RoleProtectedRoute [1,2]`), menú `DashboardLayout.tsx:239-240` (`allowedRoles [1,2]`).

## 1. Contrato y flujo actual

**Todo se genera en el navegador.** No existe endpoint de Excel ni PDF en el Backend (bwip-js está en `Backend/package.json:23` pero no se usa en ningún archivo de `Backend/src`). Librerías del front: `@react-pdf/renderer` (tickets) y `exceljs` (carga diferida, `GenerateExcelProductsPage.tsx:254`). `jspdf` está instalado pero estas pantallas no lo usan.

### Tickets PDF (`GenerateCardProductPage.tsx`, 1244 líneas)
1. Al montar, `fetchProducts()` -> `GET /api/productos` (sin paginación, `producto.controller.js:138-181`). Filtra en cliente los productos sin `sku` (`:102-113`, `:264`).
2. Filtros en cliente: búsqueda (nombre/SKU), categoría, rango de precio (con IGV), solo con stock (por defecto SÍ), solo ofertas, 10 órdenes. Tabla/cuadrícula paginada de 25.
3. Selección con Set de ids. Botones: seleccionar todos / página / ninguno.
4. `PDFWrapper` (`components/pdf-wrapper.tsx`) arma los productos elegidos, pide códigos de barras por producto (`GET /api/codigos-barras/producto/:id`, lotes de 20) y renderiza `ProductPDFDocument` (`components/product-pdf-document-stable.tsx`) con `@react-pdf` -> vista previa en modal o descarga `tickets-productos-<fecha>.pdf`.
5. Ticket: 177x118 pt (6,24 x 4,16 cm), 3 por fila, A4 vertical. Nombre (truncado a 60 caracteres, 40 si hay oferta), precio grande **con IGV** `S/ ent.dec`, precio "Antes" tachado si hay oferta, QR fijo `/qr.jpg`, texto del primer código de barras, "Docena: S/. x" con el precio mayorista con IGV.

### Exportar productos (`GenerateExcelProductsPage.tsx`, 780 líneas)
1. `useQuery(["products"], fetchProducts)` = el mismo `GET /api/productos`.
2. Filtros en cliente: búsqueda, categoría, solo modificados (`actualizado_en > creado_en`), solo con stock (por defecto SÍ), solo ofertas, 8 órdenes.
3. Al exportar: por cada producto seleccionado hace `GET /codigos-barras/producto/:id` (`:230`) y arma 4 columnas: **Producto, Código de Barras (todos separados por coma; si no hay, el SKU), Cantidad (= stock), Cantidad (Par)** = `ceil(stock/6/2)*2` (`:224`). Archivo `productos_<modificados|todos>_<con_stock|completo>_<fecha>.xlsx`.
4. No exporta precios, SKU propio, categoría ni costos.

### Permisos
- Front: solo roles 1 (Gerente) y 2 (Administrador). Auditor (5) no entra aunque el backend lo trata como admin (`restricciones.middleware.js:91`).
- Back: `GET /api/productos` y `/api/codigos-barras/producto/:id` aceptan roles 1,2,3 (+auditor, +quien tenga permiso de área `inventario`, +superusuario temporal): `producto.routes.js:22`, `codigo_barras.routes.js:13`. **Las pantallas no tienen endpoint propio: la protección es solo de interfaz.**

## 2. Defectos priorizados

### CRÍTICOS
**C1. Costos expuestos a Vendedor (rol 3) y a cualquier permiso de área.** `GET /api/productos` hace `findAll` sin `attributes` (`producto.controller.js:141-162`) y devuelve `costo_promedio` y `ultimo_costo` (`producto.model.js:95-96`); `toJSON` no los quita (`:148-157`). El rol 3 tiene acceso (`producto.routes.js:22`). La pantalla de exportar no los muestra, pero el JSON sí los entrega. *Arreglo:* quitar los dos campos del listado salvo roles 1/2 (atributos excluidos por rol) o crear `GET /productos/export` solo para roles 1/2 con lista blanca de columnas.

**C2. Deseleccionar no funciona (Excel).** El efecto de `:199-209` re-selecciona todo cuando la selección en vista llega a 0. "Deseleccionar todos" (`:184`) y desmarcar el último producto vuelven a marcar todo; el usuario puede exportar lo que quiso quitar. *Arreglo:* eliminar el efecto; seleccionar todo solo al cargar o con el botón.

### ALTOS
**A1. Tormenta de peticiones al exportar (Excel).** `Promise.all` sobre todos los seleccionados (`:219-247`): 1 petición por producto, sin lotes. El límite del API es 300/min (`config/security.js:14-15`). Con >300 productos llegan 429, el `catch` (`:239`) los ignora y escribe el SKU como "código de barras" **sin avisar**. Además `GET /productos` ya trae `codigos_barras` (`producto.controller.js:154-159`): las peticiones son innecesarias. *Arreglo:* usar `p.codigos_barras` del listado (cero peticiones extra).

**A2. Primer PDF sale sin códigos (Tickets).** `descargarPDFManual` (`pdf-wrapper.tsx:93-113`) espera la carga y luego usa `codigosBarras` del cierre anterior; el estado nuevo no está visible hasta el siguiente render. Los productos fuera de la primera página salen sin código en la primera descarga. *Arreglo:* que `onCargarCodigosBarras` devuelva el mapa y construir el documento con ese retorno, o usar `p.codigos_barras` del listado.

**A3. Código de barras = solo texto.** `product-pdf-document-stable.tsx:191` imprime el número, no un código escaneable; el QR es la misma imagen `/qr.jpg` para todos (`:161`). No se puede leer con pistola. Además toma `[0]` (`:510`) (lote más viejo) e incluye códigos con cantidad 0 (el endpoint no filtra; `obtenerCodigosBarrasDisponibles` en `codigoBarrasService.ts:89-99` tampoco, pese al nombre). *Arreglo:* decisión de negocio (ver Q1); generar Code128 con bwip-js en el front.

**A4. Lo exportado no cuadra con el inventario.** Excel usa `product.stock`; los lotes (`codigos_barras.cantidad`) no suman lo mismo en 6 de 18 productos con lotes (ver sección 4). *Arreglo:* declarar la fuente de la cantidad y, si son lotes, mostrar ambas cifras o advertir.

**A5. Error de carga se muestra como "no hay productos" (Excel).** `useQuery` no lee `isError` (`:53-56`); si falla el API, `products` es `undefined` y sale el estado vacío "No hay productos con stock" (`:~700-740`). En Tickets sí hay banner (`:489-498`) pero la lista queda vacía. *Arreglo:* estado de error con reintentar.

**A6. Sin auditoría de exportaciones.** Todo es cliente; ningún `registrarAuditoria` se dispara (solo existen en altas/ediciones). Una exportación masiva de inventario no deja rastro. *Arreglo:* endpoint `POST /api/productos/exportaciones` (roles 1/2, `registrarAuditoria("exportar","productos")`) que el front llame al terminar, con filtros y cantidad.

### MEDIOS
**M1. Posible desborde de la fila 7 en A4.** `filasPorPagina = 7` (`product-pdf-document-stable.tsx:493`, el comentario dice 6) x 118 pt = 826 + 20 de padding = 846 > 841,9 pt de A4, con `wrap={false}`. Riesgo de fila cortada o página en blanco; **no verificado ejecutando**. Probar con 22 productos. *Arreglo:* 6 filas (18 por hoja) o `padding` vertical 5 y medir.

**M2. Selección oculta se imprime.** Cambiar filtros no poda `productosSeleccionados` (`GenerateCardProductPage.tsx:224`); `PDFWrapper` imprime todo lo seleccionado, incluso lo que ya no se ve. Tampoco hay "copias por producto": 1 ticket por producto, y sin tener stock real de etiquetas. *Arreglo:* mostrar contador "N seleccionados (M fuera del filtro)" y cantidad de copias (default 1, opción = stock).

**M3. Opciones de configuración muertas.** `mostrarImagen`, `colorFondo`, `colorTexto`, `margenInterno`, `mostrarPrecioUnitario` existen en `TicketConfig` (`:39-49`) pero el documento no las usa (`stable.tsx` solo lee `mostrarPrecioOferta`, `mostrarPrecioMayorista`, `mostrarCodigoBarras`, `tamanoFuente`). `usarPrecioOfertaEnLugarUnitario` se lee en el PDF pero nunca se define. No hay imagen de producto en el ticket. *Arreglo:* quitar lo que no hace nada o implementarlo.

**M4. Productos sin SKU o sin nombre desaparecen en silencio.** `validarProducto` (Tickets `:102`, Excel `:59`) descarta sin avisar y los contadores no lo reflejan. El modelo exige SKU (`allowNull:false`), así que hoy son 0, pero un `sku` numérico en JSON o importado lo ocultaría. El PDF además reemplaza SKU vacío por "Sin SKU" (`pdf-wrapper.tsx:67`), código inalcanzable por esa validación.

**M5. "Solo modificados" no significa nada útil.** `actualizado_en > creado_en` (Excel `:115`) es verdadero ante cualquier edición, incluidas ventas que mueven stock: 15 de 31 productos hoy. Útil sería "modificados desde fecha X".

**M6. Doble fuente de verdad del cálculo.** `Cantidad (Par)` se calcula dos veces (`:224` y `:608`) y los filtros/ordenamientos están duplicados casi idénticos entre ambas pantallas (~120 líneas). *Arreglo:* `lib/productFilters.ts` + hook `useProductSelection`.

**M7. Precio codificado visible en pantalla.** `formatearPrecioCodificado` (`:397-419`) mezcla SKU y precio mayorista en centavos y lo muestra en la tabla (`:1204`) pero no en el ticket; el mayorista es "Docena" en el PDF. Si esa codificación es secreta, está a la vista de cualquier admin.

**M8. Excel: robustez menor.** Nombre de archivo sin hora (dos exportaciones el mismo día se pisan en descargas); `link.click()` sin añadir al DOM (falla en Firefox antiguo); la hoja no tiene columna SKU ni categoría, lo que impide cruzar con otros sistemas.

### Revisado y SIN defecto
- **Inyección de fórmulas:** `exceljs` 4.x escribe `=`, `+`, `-`, `@` como cadenas, no como fórmula (solo `{formula}` lo es); no explotable. Los nombres con tildes salen bien (xlsx es UTF-8). Aun así, conviene prefijar `'` si algún día se exporta CSV.
- **IGV:** tickets usan `*_con_igv` de forma coherente; moneda siempre S/ (no hay USD en producto). Ofertas: `es_oferta` con `precio_oferta_con_igv` > 0 en los 8 casos actuales.
- **Archivo grande:** `GenerateCardProductPage.tsx` mezcla estado, filtros, carga, selección y 3 vistas. Separar en `useTicketProducts`, `TicketFilters`, `ProductTicketTable`, y mover la UI nueva a `Frontend/src/features/tickets/`.

## 3. Decisiones del usuario (preguntas cerradas)
- **Q1.** El código de barras del ticket, ¿debe ser (a) un Code128 escaneable generado del código del lote, (b) el SKU como Code128, o (c) seguir como texto?
- **Q2.** Si un producto tiene varios lotes, ¿el ticket usa (a) el lote con stock más antiguo, (b) el último ingresado, o (c) uno por lote?
- **Q3.** El QR de `/qr.jpg` ¿es (a) el de la tienda para todos, (b) debe apuntar a la ficha del producto, o (c) se quita?
- **Q4.** "Cantidad" del Excel ¿es (a) el stock del producto o (b) la suma de lotes con cantidad > 0?
- **Q5.** "Cantidad (Par)" = `ceil(stock/6/2)*2` ¿es una regla vigente de reposición (a) sí, mantener, (b) sí, pero con otra base (¿12?), o (c) se elimina?
- **Q6.** El precio mayorista ¿se imprime como "Docena" (a) sí, siempre, (b) solo si el producto se vende por docena, o (c) con la etiqueta "Mayorista"?
- **Q7.** ¿Los costos deben ser visibles solo para Gerente/Administrador (a) sí, quitarlos del listado para Vendedor, o (b) Vendedor puede verlos?
- **Q8.** ¿El Excel puede incluir (a) solo lo actual, (b) también SKU, categoría y precio con IGV, o (c) además costo (solo roles 1/2)?
- **Q9.** ¿Las exportaciones y descargas de tickets quedan en auditoría (a) sí, ambas, (b) solo el Excel, o (c) no?
- **Q10.** ¿Deben entrar a estas pantallas el Auditor (a) sí, solo lectura/Excel, o (b) no?
- **Q11.** Etiquetas por producto: ¿cuántas copias (a) 1, (b) editable por fila, o (c) igual al stock?
- **Q12.** Si se necesita otro tamaño de etiqueta (además de 6x4 cm, 3 por fila), ¿(a) no, o (b) sí, ¿cuál?

## 4. Datos reales para el brief de diseño
**Catálogo (BD local, solo lectura):** 31 productos; 0 sin SKU; 0 sin precio; 30 con stock; 8 en oferta (0 ofertas sin precio); 26 sin precio mayorista; 25 sin imagen; 1 con nombre > 60 caracteres (se trunca con "..."); 15 "modificados". **12 de los 30 con stock no tienen ningún código de barras** (en el Excel salen con el SKU, en el ticket sin código). 18 productos con 20 lotes; ningún lote con cantidad 0. Lotes que no suman el stock: productos 1, 2, 5, 25, 28, 37. SKU de ejemplo: `LAP-HP-14`, `SEED-GPU-3060`. Es un entorno de pruebas: volumen real aún desconocido.

**Excel actual (4 columnas):** Producto (40) | Código de Barras (35; varios separados por coma; SKU si no hay) | Cantidad (12) | Cantidad (Par) (15). Encabezado en negrita y fila congelada. Autor "CRISCOM Group". Hoja "Productos".

**Filtros Excel:** búsqueda nombre/SKU, categoría (+ "Sin categoría"), solo modificados, solo con stock (activo por defecto), solo ofertas, orden (8 opciones). **Filtros Tickets:** búsqueda, categoría, precio mín/máx (con IGV), solo con stock (activo), solo ofertas, orden (10, incluye precio).

**Etiqueta:** 177x118 pt (6,24 x 4,16 cm), 3 columnas, filas por A4 a decidir (7 declaradas, 6 seguras). Zonas: [OFERTA/nombre] 20+20 pt | [QR 38 pt o "Antes"] 25% + [precio] 75%, 58 pt | [código] 50% + [Docena] 50%, 20 pt. Fuentes: precio entero 48+ pt, nombre 8 pt, código 8 pt. Textos: "OFERTA", "Antes", "Docena:", "S/".

**Acciones de pantalla:** Tickets: vista previa (modal), descargar PDF, seleccionar todos/página/ninguno, tabla/cuadrícula, paginación 25. Excel: seleccionar/deseleccionar, descargar, contadores (seleccionados / filtrados / total / unidades), resumen.

**Estados a diseñar:** cargando (con progreso por producto), error de carga con reintentar, vacío por filtro, exportando (n/N), éxito con nombre de archivo, advertencia "N productos sin código de barras", exportación parcial.

## 5. Pantallas de diseño recomendadas: **4**
1. **Exportar productos**: filtros + tabla seleccionable + panel de columnas + resumen + estados (1 pantalla con variantes).
2. **Tickets PDF**: selección + configuración de etiqueta + copias.
3. **Vista previa de etiquetas** (modal grande con hoja A4 3 columnas, aviso de productos sin código).
4. **Estado de exportación**: progreso, éxito, error, avisos (hoja inferior compartida por ambas pantallas).

## 6. Orden de arreglo sugerido
C1 -> C2 -> A1 y A2 (con la misma fuente `p.codigos_barras`) -> A6 (endpoint de auditoría) -> A5 -> M1 -> resto. Los defectos A1/A2 se resuelven juntos al dejar de pedir códigos por producto.

---

# Resultado del arreglo de lógica (writer Tickets PDF + Exportar productos)

**Estado: done** (la generación sigue en el navegador; ver pendientes del usuario). Fecha 2026-10-10.

## Archivos tocados
Backend: `controllers/producto.controller.js` (helper `puedeVerCostos`/`sinCostos` en las 7 lecturas/respuestas de producto y orden estable de lotes en el listado), `routes/producto.routes.js` (monta `/exportaciones`), `controllers/exportaciones.controller.js` y `routes/exportaciones.routes.js` (nuevos), tests `__tests__/integration/admin-exportar-logica.test.js` (nuevo) y `productos.test.js` (solo `jest.setTimeout(90000)`: `setupTestDb` pasaba de 15 s con la BD compartida).
Frontend: `pages/generate-ticket-pdf/` reescrito en 20 módulos (ninguno pasa de 176 líneas; antes 1244 + 780), `services/exportService.ts` (nuevo), `services/productService.ts` (tipo `Product`: `codigos_barras?`, `costo_promedio?`, `ultimo_costo?`), `utils/barcode128.ts`, `utils/qrcode.ts`, `utils/qrProductoUrl.ts` (nuevos, sin dependencias) y sus tests.
Respaldos en `odd/backup/administracion/exportar-*` (+ `exportar-ticket-muestra.pdf/.png` y capturas de las dos pantallas).

## Comandos y resultados observados
- `jest admin-exportar-logica.test.js`: 7/7 pasan. `productos.test.js` 9/9, `inventario-logica.test.js`, `commercial-control.test.js`, `no-console-log.test.js`: PASS (la primera corrida de `productos.test.js` falló por timeout de `beforeAll` a los 15 s, no por lógica; con el timeout subido pasa 9/9).
- `vitest run` de `barcode128`, `qrcode` y `exportData`: 14/14.
- `tsc -p tsconfig.app.json --noEmit`: 0 errores en mis rutas (los que quedan son de `solicitudes-importacion`, de otro writer). `eslint` sobre mis rutas: 0 errores, 0 avisos.
- Código de barras y QR verificados con una referencia independiente: Code 128 y QR (versiones 3-10, corrección M) **idénticos a bwip-js 4.10** en los casos de texto; el PDF generado se rasteriza a 400 dpi y `zbarimg` decodifica los Code 128 (`7751234567890`, `LAP-HP-14`, `SEED-GPU-3060`...) y los QR (`https://criscomgroup.pe/producto/<id>`) de las 21 etiquetas.
- Navegador real (Playwright, :5173): Exportar muestra el listado, «Deseleccionar todos» deja 0 y el botón queda deshabilitado; Tickets genera la vista previa («3 etiquetas en 1 hoja») y descarga `tickets-productos-2026-10-10_1952.pdf`; la descarga dejó una fila de auditoría `exportar/exportaciones` con `{tipo, cantidad, filtros}` (borrada después: era dato de prueba).
- A4: 21 etiquetas = 1 hoja, 22 = 2 hojas, 40 = 2 hojas (`pdfinfo`); 7 filas caben con 7 pt de margen vertical.

## Defectos resueltos
- **C1** costos: `GET /api/productos`, `/categoria/:id` y `/:id` (y las respuestas de crear/editar) no devuelven `costo_promedio`/`ultimo_costo` salvo a roles 1, 2, 5, superusuario temporal o permiso de área `inventario`/`compras`. POS y catálogo de ventas no usan esos campos (grep en Frontend: solo los usan Inventario, Ofertas, Compras y Cotizaciones, que o vienen de endpoints `commercial` o van con permiso de inventario).
- **C2** «Deseleccionar todos»: se eliminó el efecto que re-marcaba todo; la selección inicial (todo lo visible) se hace una sola vez al cargar.
- **A1** el Excel ya no hace peticiones por producto: usa `codigos_barras` del listado (0 peticiones extra, sin 429); el aviso «N sin código de barras: se escribió su SKU» sale en pantalla y en un toast.
- **A2** el PDF usa el mismo dato del listado: ya no depende de un estado asíncrono; todos los productos (no solo la primera página) llevan su código desde la primera descarga.
- **A3** Code 128 vectorial real + QR vectorial por producto (reemplaza `/qr.jpg`).
- **A4** el Excel mantiene `Cantidad = stock` (resultado idéntico) y avisa cuando los lotes no suman el stock («Los lotes no suman el stock»).
- **A5** error de carga ≠ vacío: pantalla de error con «Reintentar» (y mensaje distinto para 403) en ambas pantallas; vacío real y vacío por filtro son estados distintos.
- **A6** auditoría de cada exportación (Excel y PDF) vía `POST /api/productos/exportaciones/registro`; si falla el registro, el archivo igual se descarga y se avisa.
- **M1** A4: 7 filas de 118 pt + margen vertical 7 pt (827,9 pt útiles ≥ 826); verificado con PDFs de 21/22/40 etiquetas.
- **M2** contador «N seleccionados (M fuera del filtro)» con botón «Quitarlos», y copias por producto (1-20; tope 600 etiquetas por PDF).
- **M3** opciones muertas eliminadas (`mostrarImagen`, `colorFondo`, `colorTexto`, `margenInterno`, `mostrarPrecioUnitario`, `usarPrecioOfertaEnLugarUnitario`); quedan solo las que cambian el PDF: código de barras, QR, docena, oferta, tamaño de fuente, copias.
- **M4** los productos sin nombre/SKU válidos ya no desaparecen en silencio: aviso con el conteo.
- **M6** filtros/orden/selección compartidos (`productFilters.ts`, `useExportProducts.ts`); el cálculo de `Cantidad (Par)` está en un solo lugar (`cantidadPar`).
- **M7** se quitó de la pantalla el «precio mayorista codificado» (SKU + centavos).
- **M8** nombre del Excel con hora (`..._2026-10-10_1505.xlsx`), `link` añadido al DOM al descargar.
- Extra: el precio grande de 3-4 cifras se salía de la etiqueta y el «Antes» se partía en dos líneas; ahora se escala (≈0,8 y 0,62 con 3 y 4 cifras; «Antes» a 8 pt/6,5 pt).

## Contrato final
- `POST /api/productos/exportaciones/registro` (también disponible como router `exportaciones.routes.js` para montarlo en `app.js` como `/api/exportaciones/registro`). Auth JWT; roles 1 y 2 (+ auditor 5 por equivalencia, + permiso `inventario`, + superusuario temporal).
  - Body: `{ tipo: "tickets_pdf" | "productos_excel", cantidad: entero 0..100000, filtros?: { busqueda, categoria, precioMin, precioMax, soloConStock, soloOfertas, soloModificados, ordenamiento, copias, sinCodigoBarras } }` (claves y tipos no permitidos se descartan; textos a 100 caracteres).
  - 201 `{ message, registrado: true, tipo, cantidad, filtros }`; 400 `{ message, errores: { tipo?, cantidad? } }`; 401 sin sesión; 403 sin rol; 500 `{ message }`.
  - Auditoría: acción `exportar`, tabla `exportaciones`, `datos_nuevos = { tipo, cantidad, filtros, _ruta }`. Sin datos de productos ni PII.
- `GET /api/productos` (y `/categoria/:id`, `/:id`): sin `costo_promedio`/`ultimo_costo` para quien no sea 1/2/5/superusuario/área `inventario|compras`. Los lotes de `codigos_barras` vienen ordenados por `id_codigo_barras` ascendente (forma `[{ codigo_barras, cantidad }]`).
- Frontend: `registrarExportacion()` en `services/exportService.ts`; códigos: `utils/barcode128.ts` (`code128Modulos/Path`), `utils/qrcode.ts` (`qrMatriz/qrPath`), URL del QR `${VITE_PUBLIC_SITE_URL || "https://criscomgroup.pe"}/producto/<id_producto>`.

## Decisiones aplicadas por defecto / pendientes del usuario
Se aplicó el valor conservador y reversible; todas se cambian en un solo archivo.
- **Servidor vs navegador**: la generación se queda en el navegador (decisión pendiente del usuario). Con el listado ya trae todo lo necesario, así que mover a servidor después no cambia el contrato de datos.
- **Q1** código del ticket = Code 128 del código del lote; sin lote, el SKU en Code 128 marcado «SKU:». Si el texto tiene caracteres no ASCII se imprime solo como texto (`productData.ts → codigoTicket`).
- **Q2** varios lotes: el lote **más antiguo con stock** (cantidad > 0); si todos están en 0, el más antiguo. (Una etiqueta por lote no se implementó.)
- **Q3** QR → ficha pública del producto (`/producto/<id>`). Con oferta, la celda del QR sigue mostrando el precio «Antes» (como antes): esos tickets no llevan QR.
- **Q4** `Cantidad` del Excel = stock del producto (sin cambios) + aviso si los lotes no cuadran.
- **Q5** `Cantidad (Par)` = `ceil(stock/6/2)*2`, sin cambios (regla vigente a confirmar).
- **Q6** «Docena» sigue imprimiéndose siempre que exista precio mayorista (con IGV).
- **Q7** costos solo roles 1/2/5 y áreas `inventario`/`compras` (aplicado).
- **Q8** el Excel mantiene exactamente las 4 columnas; sin costos.
- **Q9** auditoría de ambas exportaciones (la vista previa no se audita).
- **Q10** el Auditor (rol 5) **no** entra a las pantallas: la ruta del front está en `App.tsx`/`DashboardLayout.tsx` (fuera de mi alcance); el endpoint de registro sí acepta al Auditor.
- **Q11** copias por producto: un valor global (1 por defecto, hasta 20); no editable por fila.
- **Q12** un solo tamaño de etiqueta (6,24 x 4,16 cm, 3 por fila).
- «Solo modificados» queda con la regla actual (`actualizado_en > creado_en`); una versión «desde fecha» queda para después.

## Pendientes / para otros writers
- `Frontend/src/components/pdf-wrapper.tsx` y `product-pdf-document-stable.tsx` ya no los usa nadie (solo el uno al otro): se pueden borrar (copias en `odd/backup/administracion/`). No los toqué (fuera de mi alcance).
- Montaje opcional en `app.js`: `app.use("/api/exportaciones", require("./routes/exportaciones.routes"))`. Hoy el front usa `/api/productos/exportaciones/registro`, que ya funciona.
- Las respuestas de `commercial.controller` siguen devolviendo costos a rol 3 en `/commercial/*` (compras/cotizaciones): fuera de esta pantalla, pero conviene revisarlo (rol 3 pasa el guard `commercial`).
- Aviso al diseño: `GET /api/productos` no está paginado (con >1000 productos habrá que paginar o filtrar en servidor).

## Datos para el brief de diseño
- **Etiqueta**: 177 x 118 pt (6,24 x 4,16 cm), borde 1 pt, 3 por fila y **7 filas por hoja A4** (21 etiquetas/hoja), margen 10 pt lateral y 7 pt vertical, 10 pt entre columnas. Zonas: [OFERTA 20 pt + nombre 20 pt, o nombre 40 pt] / [25% QR 38 pt (o «Antes» tachado) + 75% precio grande, 58 pt] / [50% código de barras Code 128 (84 x 11 pt) con el código en 5 pt debajo + 50% «Docena: S/. x», 20 pt]. Textos: «OFERTA», «Antes», «Docena:», «S/», «SKU:». Nombre recortado a 60 caracteres (40 con oferta). Precio con IGV, entero grande (50 pt; 40 pt con 3 cifras; 31 pt con 4) y decimales pequeños.
- **Cómo se ve el ticket**: ver `odd/backup/administracion/exportar-ticket-muestra.png` (21 etiquetas de prueba: con y sin oferta, con lote y con SKU, precios de 1 a 4 cifras). El QR mide 38 pt con quiet zone de 2 módulos (≈1,15 pt/módulo); el código de barras usa quiet zone de 6 módulos y ≈0,6 pt/módulo (≈0,22 mm) en códigos de 13 dígitos; con SKU largos baja a ≈0,5 pt.
- **Excel**: hoja «Productos»; columnas `Producto` (40) | `Código de Barras` (35; todos los lotes separados por coma, o el SKU si no hay) | `Cantidad` (12; stock) | `Cantidad (Par)` (15); encabezado en negrita y fila congelada; autor «CRISCOM Group»; archivo `productos_<modificados|todos>_<con_stock|completo>_<AAAA-MM-DD>_<HHMM>.xlsx`.
- **Filtros Excel**: búsqueda nombre/SKU, categoría (+ «Sin categoría»), solo modificados, solo con stock (activo), solo ofertas, 8 órdenes. **Tickets**: búsqueda, categoría, precio mín/máx (con IGV), solo con stock (activo), solo ofertas, 10 órdenes; configuración: código de barras, QR, docena, oferta, tamaño de fuente 8-20, copias 1-20.
- **Estados nuevos**: cargando, error de carga con «Reintentar», sin productos en el sistema, sin resultados por filtro, avisos (N sin código de barras, lotes que no suman el stock, N inválidos, N seleccionados fuera del filtro, más de 600 etiquetas), generando/descargando, éxito (toast con nombre y cantidad), aviso si falla la auditoría.
- **Conteos reales (auditoría, BD de pruebas con 31 productos)**: 30 con stock, 8 en oferta, 26 sin precio mayorista, 12 de los 30 con stock sin código de barras, 18 con lotes (20 lotes), 6 con lotes que no suman el stock, 15 «modificados», 1 nombre > 60 caracteres. En la BD local actual (al verificar) quedaban 4 productos `seed-adm`, ninguno con código de barras.

## Key Learnings
1. Los lotes de código de barras ya venían en `GET /productos` (`codigos_barras`): el Excel y el PDF no necesitaban ninguna petición por producto; ese era el origen común de A1, A2 y del 429 silencioso.
2. Sin dependencias: bwip-js solo existe en el Backend; el front lleva un Code 128 (B + C) y un QR (modo byte, M, v1-10) propios, validados contra bwip-js y decodificados con `zbarimg` sobre el PDF real. Verificar siempre así: render a 400 dpi + `zbarimg`.
3. En react-pdf el precio de 3-4 cifras se salía de la etiqueta con el layout viejo; hay que escalar la fuente por número de dígitos.
4. `setupTestDb` supera los 15 s por defecto de Jest cuando hay otros writers usando la BD: toda suite nueva necesita `jest.setTimeout(90000)`.
5. Un router nuevo se puede montar dentro de un router existente (`producto.routes.js`) sin tocar `app.js`; su middleware de auditoría lee `req.body` al terminar la respuesta, por eso el controller lo reemplaza por la versión saneada.

---

## Run OD
- Proyecto Open Design: `criscom-adm-exportar` («Administración - Exportar productos (Excel)»), modelo `claude-sonnet-5-5`.
- runId: `038a0ce0-4deb-4089-a397-3a2122278179` (conversationId `d048a203-08b0-4c84-9737-e9f69c3e3b0e`), lanzado el 2026-10-10; comprobado una vez: queued/running.
- Brief: `odd/opendesign/criscom-adm-exportar/DESIGN.md` + `exportar-data.json` (generados por `odd/tools/brief_adm_exportar.py`); prompt `odd/tmp/prompt-adm-exportar.txt`; capturas en `referencias/` y medidas en `odd/tmp/adm_exportar_medidas.json`.
- Seeds creados: ninguno (solo lectura). Pendiente de decisión: Q8 (columnas SKU/Categoría/Precio/Costos) está diseñada como opt-in; la auditoría no registra las columnas.

## Run OD (Tickets PDF)
- Proyecto: `criscom-adm-tickets` («Administración - Tickets de producto (PDF)»), carpeta `odd/opendesign/criscom-adm-tickets/`.
- runId: `d7f4a4c4-8f82-4344-b258-f315f31d81f4` (conversación `736bc4cc-4db2-44b0-adb0-d3e5e6d8e318`), lanzado 10/10/2026 ~20:55 (Lima) con `claude-sonnet-5-5` vía `od_launch.py`; estado comprobado una vez: ver entrega. No se esperó ni se canceló.
- Brief: `odd/tools/brief_adm_tickets.py` → `DESIGN.md` + `tickets-data.json`; prompt `odd/tmp/prompt-adm-tickets.txt`; medidas en `odd/tmp/adm_tickets_medidas*.json`.
- Seed/limpieza: la descarga de prueba creó la fila de auditoría `audit_logs.id_log = 190` (`exportar` / `exportaciones`, 10/10/2026 20:46). Es un dato de prueba mío; no se borró (consultas de solo lectura).

## Port a código — Exportar productos (2026-10-10)
Estado: done. `GenerateExcelProductsPage.tsx` quedó como entrada fina (~50 líneas) + `pages/generate-ticket-pdf/exportar/*` (13 archivos Exp*, máx. 99 líneas) + `styles/exportar.css` (od2css + fixcq sobre `criscom-adm-exportar`, ámbito `.pg-exportar`). Respaldo de lo previo: `odd/backup/administracion/exportar-port-pre-*`.
- Aditivo (el writer de Tickets no se rompe): `excelExport.ts` (`OpcionesExcel`, `columnasExcel`, 2.º parámetro opcional en `construirFilas`/`generarExcel`), `useExportProducts.ts` (+`sinPermiso`, +`puedeCostos`). `ExcelProductTable.tsx` es ahora un re-export de `ExpTable` (nadie lo usa; borrable).
- Columnas opcionales (apagadas): SKU, Categoría, Precio con IGV (S/) y «Incluir costos» (Costo promedio, Último costo). Los costos se habilitan solo si el listado trae `costo_promedio`/`ultimo_costo`; si no, el control sale deshabilitado con el motivo escrito. Sin opciones el Excel es idéntico al de antes (verificado con openpyxl: hoja «Productos», 4 columnas, encabezado en negrita, fila congelada, autor CRISCOM Group). Con opciones: columnas a la derecha, dinero con formato `#,##0.00` como número.
- Resultado persistente (ok / auditoría fallida / error al generar) hasta la siguiente acción; ya no hay toasts.
- Diferencias diseño vs. realidad: (1) el panel «Archivo» NO es sticky: `container-type` rompe `position:sticky` (aprendizaje ya conocido), queda scroll normal de página; (2) la hoja «Archivo» móvil es un overlay dentro del host `.fx` (no portal) sobre la barra fija; (3) auditoría no guarda las columnas (no se promete en la UI).
- Verificación: tsc 0 errores en mis rutas; eslint 0 errores/0 avisos; vitest completo 55/56 (el fallo `LoginPage … navigate("/")` es timeout de 5 s por carga de otros writers y pasa en solitario; Tickets/exportData 9/9); Playwright 1440/1280/390 claro y oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras, 0 objetivos <44 px, 0 overflow horizontal, h1 x=24 (12 móvil), 10 filas visibles a 1440 y 6 a 1280, botón de descarga visible en los 3 tamaños.
- Seeds / auditoría: no toqué productos. Las pruebas de descarga dejaron filas `audit_logs` `exportar/exportaciones` (productos_excel): id 207, 213 y 215 (10/10/2026 22:13–22:18). No borradas.
- Nota de entorno: con 9 writers en paralelo, Vite hace recargas completas de página (HMR) que pueden cortar una prueba E2E a medias.

---

## Port a código — Tickets PDF (2026-10-10)
Estado: done. `GenerateCardProductPage.tsx` quedó como entrada fina (42 líneas) + `pages/generate-ticket-pdf/tickets/*` (17 archivos Tk*/tk*, máx. 113 líneas) + `styles/tickets.css` (od2css + fixcq sobre `criscom-adm-tickets`, ámbito `.pg-tickets`). El motor PDF (`TicketDocument/TicketCard/TicketCodes/ticketStyles/ticketPages/ticketPdf/ticketConfig`) se movió a `tickets/` sin cambios de lógica; los archivos raíz quedaron como shims de re-exportación (respaldo del estado previo en `odd/backup/administracion/tickets-port-pre-*`).
- Vista previa: ErpDialog `wide` (960 px) con el PDF REAL en iframe (§2 del brief: «en producción es el PDF real») + resumen + aviso «SKU:» repetido + nota de auditoría; su «Descargar PDF» descarga el MISMO blob ya generado y audita (no regenera). El selector de hoja de la maqueta no aplica al visor del PDF (ya pagina); la miniatura del panel y la hoja móvil sí son la réplica HTML con selector de hoja real.
- Casillas: botón `role=checkbox` de 44×48 con caja visual (el input nativo de 20×20 del diseño no pasaba la regla de objetivos ≥44 px medidos).
- Panel «Etiquetas» NO es sticky (container-type lo rompe, aprendizaje ya conocido); spinner: `@keyframes tk-spin` global (od2css prefija `@keyframes` y lo invalida).
- Verificación: tsc 0 errores en mis rutas; eslint 0 errores/0 avisos en toda la carpeta; vitest `tkLogic.test.ts` 4/4. Playwright (1440/1280/390, claro y oscuro): 0 gradientes, 0 backdrop-filter, 0 sombras fuera del diálogo, 0 objetivos <44 px, 0 overflow horizontal, h1 x=24 (12 móvil), primera fila y=274/319/309 (las NOTAS prometían ≈270/319/309). Flujo real: «Todos (30)» → contador «30 seleccionados · 1 copia · 30 etiquetas · 2 hojas A4» → vista previa generada → descarga `tickets-productos-2026-10-10_2344.pdf` (pdfinfo: 2 páginas A4) → aviso «PDF descargado… · Registrada en auditoría».
- Nota de entorno: chrome-headless-shell no renderiza PDF en iframe (la vista previa sale en blanco SOLO en esa prueba); el blob generado es válido (pdfinfo) y el motor no cambió.
- Seeds / auditoría: no toqué productos. La descarga de prueba dejó una fila `audit_logs` `exportar/exportaciones` (tickets_pdf, 10/10/2026 23:44). No borrada.
