# Auditoría de lógica — Administración › Logs de auditoría

Alcance: `/audit-logs` (`Frontend/src/pages/audit-logs/AuditLogsPage.tsx`, 1120 líneas) y su origen (`Backend/src/{routes/audit_log.routes.js, controllers/audit_log.controller.js, middlewares/audit.middleware.js, models/audit_log.model.js}`). Solo lectura de código; BD consultada con `/tmp/dq.sh` (solo conteos y claves, sin contenido sensible).

## 1. Contrato API actual (`/api/audit-logs`, `app.js:102`)

Acceso (`audit_log.routes.js:8-15`): rol 1, rol 5, superusuario temporal o `area_grants` con `auditoria`. Borrado: `masterAccess` (cuenta maestra exacta `MASTER_ADMIN_EMAIL` o rol 2 con superusuario temporal vigente, `master.middleware.js:10-11`).

| Método y ruta | Entrada | Salida |
|---|---|---|
| GET `/` | nada | **todas** las filas + `usuario{name,email}`, orden `fecha_hora DESC` (controller:5-23) |
| GET `/usuario/:usuario_id` | param | todas las filas del usuario |
| GET `/tabla/:tabla` | param | todas las filas de esa tabla |
| GET `/accion/:accion` | param | todas las filas de esa acción |
| GET `/rango-fechas?fechaInicio&fechaFin` | YYYY-MM-DD ambas obligatorias | filas del rango (controller:98-132) |
| GET `/stats` | nada | `totalLogs, monthlyStats, oldestLog, oldLogsCount, cutoffDate` (controller:192-243). **El front no lo usa.** |
| DELETE `/` | body `{ids[]}` o `{beforeDate}` o `{deleteAll:true}` | `{message, deletedCount}`; 404 si 0 (controller:135-189) |

Modelo `audit_logs`: `id_log, usuario_id(FK users, ON DELETE SET NULL), accion(50), tabla(50), registro_id INT NULL, datos_anteriores TEXT, datos_nuevos TEXT, ip_cliente(50), user_agent TEXT, fecha_hora DATETIME`. Índices reales: **solo** PRIMARY y `usuario_id` (SHOW INDEX).

No existe: paginación, filtros combinados, búsqueda en servidor, exportación, endpoint de detalle ni de catálogo (tablas/acciones/usuarios distintos).

## 2. Defectos priorizados

### CRÍTICOS

**C1. Contraseñas en claro en el log.** `registrarAuditoria` redacta solo claves exactas `password|token|authorization` (audit.middleware.js:5). `PATCH /users/master-account` está auditado (users.routes.js:12) y su body usa `current_password` y `new_password` (user.controller.js:16,21) → ambas se guardan en `datos_nuevos` sin redactar. Hoy hay 0 logs de `usuarios`, así que aún no ocurrió, pero cualquier cambio de clave de la cuenta maestra la deja legible para rol 5. Arreglo: redacción por patrón (`/pass|pwd|secret|token|clave|key|authorization|card|cvv|sol_|client_secret/i`), recursiva, y aplicarla también a `datos_anteriores`.

**C2. Hash bcrypt en `datos_anteriores` de usuarios.** `capturarEstadoOriginal` hace `Model.findOne` + `registro.toJSON()` (audit.middleware.js:38-41) y se usa con `User` (users.routes.js:26,34,38,39,45,53). El modelo User no tiene `toJSON`/scope que oculte `password` (user.model.js:22) → el hash se persiste y se muestra en el modal. La sanitización solo se aplica a `req.body`, nunca a `estadoOriginal`. Arreglo: sanitizar `estadoOriginal` antes de `JSON.stringify` y pasar `attributes: {exclude}` por modelo.

**C3. El historial es borrable y el borrado no deja rastro.** `DELETE /` admite `deleteAll` sin confirmación ni respaldo (controller:141-147), y la ruta no está auditada (audit_log.routes.js:23). Un superusuario temporal (rol 2) también pasa `masterAccess`. Arreglo: eliminar el endpoint o limitarlo a `beforeDate` ≥ N meses (retención), registrar siempre una fila `auditoria/purgar` con criterio y conteo, exigir contraseña/confirmación textual y excluir `deleteAll`.

**C4. Cobertura: operaciones de dinero y configuración sin auditar** (ver matriz §3): pagos online/estado de pedidos, órdenes de servicio (20 mutaciones), facturación, POS, ajustes de inventario, compras, pasarela de pago (guarda claves), cotizaciones, ofertas. Arreglo: auditar por router completo (`router.use(auditar(...))` por módulo) no por ruta.

### ALTOS

**A1. Sin paginación ni filtros en servidor.** Todos los endpoints hacen `findAll` sin `limit` y devuelven los dos TEXT completos (controller:7,30,54,78,111). Hoy son 124 filas (~0,8 KB/fila); con 100k filas son ≈80-100 MB por carga. Paginación, búsqueda y filtros se hacen en el navegador (AuditLogsPage.tsx:174-195, `itemsPerPage = 25`). Arreglo: `GET /?page&limit(≤100)&usuario_id&tabla&accion&desde&hasta&q` → `{items,total,page}`; el listado **no** debe traer `datos_*` (solo `LENGTH`/flag `tiene_diff`); `GET /:id` trae el detalle.

**A2. Sin índices.** Solo `PRIMARY` y `usuario_id`. `ORDER BY fecha_hora DESC`, rango de fechas, `tabla` y `accion` hacen full scan + filesort. Arreglo: índices `(fecha_hora)`, `(tabla, fecha_hora)`, `(accion, fecha_hora)`, `(usuario_id, fecha_hora)`, `(tabla, registro_id)`.

**A3. Rango de fechas con desfase de 5 h.** `new Date(`${fechaInicio}T00:00:00.000Z`)` y `…T23:59:59.999Z` (controller:108-109, 150) se serializan con `timezone:'-05:00'` (database.js:20) → el rango real es 19:00 del día anterior → 18:59 del día final (hora Lima). Se pierden logs de 19:00-23:59 del último día y se incluyen los del día previo. Igual en `beforeDate` al borrar (controller:150): puede **borrar logs del día siguiente al elegido** o dejar otros. Arreglo: comparar con strings `'YYYY-MM-DD 00:00:00'`/`'23:59:59'` (la BD guarda hora de pared Lima) o `Sequelize.literal`/`DATE(fecha_hora) BETWEEN`.

**A4. Permisos contradictorios front/back.** Ruta y menú permiten [1,5] y el backend también `area_grants:auditoria` y superusuario temporal (App.tsx:231, DashboardLayout.tsx:243,261), pero la página hace `isManager = user?.id_role === 1` y redirige a `/` al resto (AuditLogsPage.tsx:147,255-257). El rol 5 (auditor) **no puede ver la pantalla**; también falla para `area_grants`. Además el botón Eliminar está atado al email `cristophercalioro@gmail.com` hardcodeado (AuditLogsPage.tsx:539) mientras el backend valida `MASTER_ADMIN_EMAIL`. Arreglo: el front consulta `/access/my` o un flag `puede_purgar` desde el backend; la lectura se abre a quien el backend autoriza.

**A5. El filtro por tabla del front no coincide con los datos.** Selector con `users` y `companies` (AuditLogsPage.tsx:373-374) pero el backend guarda `usuarios` y `empresas`; el selector omite `banners, tarjetas, blog_posts, social_links, libro_reclamaciones, solicitudes_postventa, cierres_caja` (hoy ≈95 de 124 filas). `getTableName` (l.97-107) y `getActionName` (l.84-90) igual: `actualizar_rol`, `configurar_acceso`, `configurar_superusuario_temporal`, `asignar_inventario`, `actualizar_cuenta_maestra`, `exportar` salen crudos; `logout` nunca se emite (grep en Backend vacío). Arreglo: catálogo desde el servidor (`DISTINCT tabla/accion`) con etiquetas en un solo mapa.

**A6. Errores presentados como "No hay logs".** `useQuery` solo lee `isLoading`; no hay `isError` (AuditLogsPage.tsx:149-170). Con 500/403/red caído se pinta el vacío «Aún no hay registros» (l.699-704). Arreglo: estado de error con reintento, distinto del vacío filtrado y del vacío real.

**A7. Se audita aunque la operación falle.** El hook sobre `res.send` no mira `res.statusCode` (audit.middleware.js:57-107): un 400/403/500 del controller queda como acción hecha. Arreglo: registrar solo `statusCode < 400` (y, opcionalmente, un evento `*_fallido` aparte), o guardar `estado_http`.

### MEDIOS

**M1. `registro_id` NULL en creaciones.** El middleware lo toma de `req.params/body.id` (audit.middleware.js:64-72); en POST no existe → NULL. Datos: 48 de 124 filas (39 %) con NULL; **todas** las creaciones (productos 11, banners 8, blog 10, categorías 2, códigos de barras 3, ventas 2, social_links 4). Además `POST /ventas/comprobante/:venta_id` usa `:venta_id`, que el middleware no reconoce (ni en `capturarEstadoOriginal`, l.17) → sin `registro_id` ni estado anterior. Arreglo: tomar el id de la respuesta (`JSON.parse(body)` con `id_*`/`venta_id`) o de `res.locals.auditoria = {registro_id, antes}` que el controller rellena; param configurable `registrarAuditoria(accion, tabla, {idParam})`.

**M2. `registro_id` es INT pero se intenta guardar strings.** `req.params.codigo` (código de barras) (audit.middleware.js:69) puede ser no numérico o fuera de rango → `AuditLog.create` falla y solo hay `console.error` (l.104): se pierde el log sin aviso. Arreglo: columna `registro_ref VARCHAR(64)` o validar `Number.isInteger`.

**M3. Diff no comparable.** `datos_anteriores` = fila completa del modelo (`"24.58"` string, 25 columnas, ~660 B productos) y `datos_nuevos` = body parcial tipado distinto (`24.58` número) + `timestamp` ISO en UTC con `Z` dentro del JSON (l.89-91), mientras `fecha_hora` es hora Lima. El modal solo imprime ambos JSON (AuditLogsPage.tsx:778-790). Arreglo: guardar `cambios:[{campo,antes,despues}]` ya calculado y normalizado (solo campos cambiados), y el front muestra una tabla de cambios con tipos normalizados. Quitar `timestamp` del JSON.

**M4. PII en el log, visible al auditor.** `solicitudes_postventa` guarda nombre, email y teléfono completos en `datos_anteriores` (ej. log 103). Libro de reclamaciones también (755 B). Arreglo: enmascarar PII (email `d***@gmail.com`, teléfono últimos 3) en el log; el original sigue en su tabla.

**M5. IP y user-agent poco útiles.** 108/124 filas tienen IP `::ffff:192.168.65.1` (puerta de enlace Docker, no el cliente) y 3 `::ffff:172.28.0.4`; UA de scripts (`Python-urllib`). Con `trust proxy` en 1 salto (security.js:11) en dev no llega `X-Forwarded-For`. El prefijo `::ffff:` ensucia la vista. Arreglo: normalizar (`ip.replace('::ffff:','')`), verificar `TRUST_PROXY_HOPS` tras nginx, y guardar un `user_agent` resumido (navegador/SO) además del crudo.

**M6. Autor perdido al borrar usuario.** FK `ON DELETE SET NULL` (`audit_logs_ibfk_1`): al eliminar un usuario sus acciones pasan a «N/A» (AuditLogsPage.tsx:~597). Un registro de auditoría no puede perder al autor. Arreglo: guardar `usuario_nombre`/`usuario_email` snapshot en cada fila y rol (`id_role`).

**M7. Zona horaria.** BD guarda hora de pared Lima (`timezone:'-05:00'`, `dateStrings`), la API devuelve `"2026-10-10 14:40:40"` sin offset y el front hace `new Date(str)` (l.74-80), que interpreta en la zona del navegador: correcto solo si el navegador está en Lima. Arreglo: el serializador devuelve ISO con `-05:00` (patrón `iso()` de `marketing-blog-logica.md:7`) y el front formatea con `America/Lima`.

**M8. Retención y volumen.** No hay política ni job; `/stats` existe pero no se muestra. Proyección: hoy 124 filas/≈1 día de pruebas (9→10 oct 2026); con tráfico real, ventas (~335 B) y cierres (~680 B) crecen lineal. Arreglo: retención configurable (p. ej. 24 meses), archivado mensual a CSV/zst antes de purgar, y `datos_*` truncados a 16 KB (hoy sin tope; `jsonBodyLimit` solo limita la petición).

**M9. Front monolítico y selección.** 1120 líneas: modal montado a mano con `createRoot` + `document.body.appendChild` en la fila (AuditLogsPage.tsx:~660-673, sin foco atrapado ni Escape), colores del modal hardcodeados (`#6f42c1`, `isDarkMode` leído una vez), 5 tabs que replican el mismo bloque de búsqueda, filtros mutuamente excluyentes (solo un `filterType` a la vez) y botón «Filtrar» que llama `refetch()` redundante al `useEffect` que ya refetchea (l.157-176). La selección no se limpia al cambiar de página/filtro y «seleccionar todo» marca solo la página (l.225-229), pudiendo borrar logs no visibles. `services/auditLogService.ts` es copia sin uso. Sin exportar.

**M10. Exportar / búsqueda.** La búsqueda en cliente cubre usuario, email, acción, tabla, IP; **no** registro_id, ni contenido del diff. No hay exportación CSV. Arreglo: `GET /export.csv` con los mismos filtros (y que se audite como `exportar`, como ya hace libro_reclamaciones).

## 3. Matriz de cobertura (módulo → ¿audita?)

Mutaciones por router / con `registrarAuditoria` (grep de `routes/*.js`).

| Módulo | ¿Audita? | Detalle |
|---|---|---|
| Usuarios | Sí (10/9) | crear, editar, rol, acceso, superusuario temporal, inventario, borrar, cuenta maestra. Falta cambio de contraseña propio y reset |
| Auth | Parcial | solo `login` OK (`registrarLogin`). **No**: login fallido, `/google`, `/register`, `/register-customer`, logout |
| Ventas | Parcial | crear, comprobante, eliminar. **No**: `PATCH /actualizar-comprobante/:venta_id` (cambia estado SUNAT), anulaciones |
| Caja (cierres) | Sí | crear, actualizar, eliminar |
| Productos / categorías / códigos de barras | Sí | `productos.stock` por ajuste no pasa por aquí |
| Empresas | Sí | emisores de facturación **no** |
| Marketing: banners, tarjetas, blog, redes, reclamos, postventa | Sí | postventa solo `actualizar` |
| Pedidos e-commerce | **No** | estado, borrar, confirmar pago manual (`pedido.routes.js:15-17`) |
| Órdenes de servicio / taller / activos | **No** | 20 + 3 + 2 mutaciones |
| Facturación electrónica | **No** | emitir, emisores, predeterminado (`facturacion.routes.js:8-12`) |
| POS / adquirentes | **No** | confirmar pago de venta, adquirentes |
| Comercial: inventario, compras, anulación, proveedores, cotizaciones | **No** | `commercial.routes.js:10-22` (ajuste de stock = acción crítica) |
| Pasarela de pago (claves) | **No** | `payment-gateway.routes.js:9-11` |
| Ofertas del día, importación, adquisición, afiliados, comunidad, accesos | **No** | |

Cobertura aproximada: 12 de 34 routers con mutaciones; de las acciones críticas (dinero, stock, claves, permisos) quedan sin auditar pedidos/pagos, ajuste de stock, compras, facturación y pasarela.

## 4. Decisiones del usuario (preguntas cerradas)

1. ¿Rol 5 (auditor) debe poder ver la pantalla? **Sí (recomendado) / No**.
2. ¿Se mantiene el borrado de logs? **No, solo purga por antigüedad con rastro (recomendado)** / Sí como hoy / Sin borrado.
3. ¿Retención? **24 meses (recomendado)** / 12 / 6 / ilimitada.
4. ¿Quién puede purgar? **Solo cuenta maestra, no superusuario temporal (recomendado)** / ambos.
5. ¿Auditar también intentos fallidos (login fallido, 4xx/5xx)? **Sí, como eventos aparte (recomendado)** / Solo éxitos.
6. ¿Ampliar cobertura ahora a pedidos/pagos, stock, facturación, pasarela? **Sí, los 4 (recomendado)** / Solo pedidos y stock / No.
7. ¿Enmascarar PII (email, teléfono) en el log? **Sí (recomendado)** / No.
8. ¿Exportación CSV? **Sí, con los filtros activos y auditada (recomendado)** / No.
9. ¿Mantener «Registro ID» como columna visible y enlazar al registro afectado? **Sí / No**.

## 5. Datos reales para el brief de diseño

Estado de la BD (2026-10-10): **124 logs**, rango 2026-10-09 23:31 → 2026-10-10 17:37 (datos de prueba/seed), **1 solo usuario** (id 1) como autor; `usuarios` en BD: 3 (roles 1, 2, 5). Tamaño medio JSON antes ≈586 B (máx 881), después ≈199 B (máx 859).

Conteo por tabla/acción: solicitudes_postventa·actualizar 19; libro_reclamaciones·actualizar 12 (+2 exportar); productos·crear 11, actualizar 7, eliminar 2; banners·actualizar 10, crear 8, eliminar 4; blog_posts·crear 10, actualizar 8, eliminar 2; auth·login 9; categorias 5+2+1; social_links·actualizar 4; codigos_barras 3+1+1; ventas·crear 2; cierres_caja·actualizar 1.

Columnas de la tabla (propuesta): fecha/hora (Lima), usuario (nombre + rol), acción (chip), módulo (etiqueta legible), registro (id enlazable), resumen de cambios («3 campos»), IP, estado (ok/fallido). Filtros combinables: rango de fechas (con atajos Hoy/7 d/30 d), usuario (selector con búsqueda), módulo, acción, texto libre; chips de filtros activos y «Limpiar».

Ejemplo de diff (log 13, productos·actualizar, registro 27): campo `nombre` «Cable HDMI 2.0 de 2 metros» → «Cable HDMI 2.0 de 2 metros (prueba)»; hoy el modal muestra además 25 campos sin cambios y tipos distintos (`"24.58"` vs `24.58`). El diff debe mostrar solo campos cambiados (antes en rojo, después en verde) con «Ver JSON completo» plegado y sensibles como `••••`.

Estados a diseñar: carga (skeleton), vacío real, vacío por filtro, **error con reintento**, sin permiso, tabla de 25/50/100 con paginación servidor y total, detalle en panel lateral (no modal creado a mano), confirmación de purga con conteo previo, banner informativo de retención («Se conservan 24 meses; hay X logs > 24 m»).

## 6. Pantallas de diseño recomendadas: 4

1. Listado + filtros + estados (carga/vacío/error). 2. Panel de detalle con diff legible (incluye usuario, IP, navegador, JSON plegado). 3. Retención y purga (stats, confirmación, solo cuenta maestra). 4. Móvil del listado (tarjetas) con el detalle como hoja inferior. Exportación CSV es un botón del listado, no pantalla.

## 7. Orden de arreglo sugerido

(1) C1+C2 redacción recursiva por patrón en body **y** estado anterior; (2) A3 desfase de fechas; (3) A1+A2 endpoint paginado + índices + `GET /:id`; (4) A4 permisos y email hardcodeado; (5) C3 purga con rastro; (6) M1 `registro_id` desde la respuesta; (7) cobertura de módulos críticos con auditoría a nivel router; (8) rediseño front en componentes (`AuditFilters`, `AuditTable`, `AuditDetailPanel`, `useAuditLogs`).

---

# RESULTADO DEL ARREGLO DE LOGICA (writer auditoria)

## Estado: partial
Codigo y pruebas terminados y verificados. **Incidente propio sin resolver (ver "INCIDENTE" abajo): se vació la BD de desarrollo `erp_computacion`.** Pendiente: restauracion por binlog (requiere decision del usuario).

## INCIDENTE (leer primero)
Para depurar un timeout de `beforeAll` ejecute `sequelize.sync({force:true})` con un script ad-hoc dentro del contenedor backend **sin cargar `.env.test`**, por lo que apunto a la BD de DESARROLLO (`erp_computacion`, host `db`) y no a la de test. Efecto: las 63 tablas se borraron y recrearon vacias (productos 0, ventas 0, audit_logs 0, pedidos 0, categorias 0, blog_posts 0, companies 0, users 1). Hora aprox. 2026-10-10 19:2x Lima (binlog 2026-10-11 00:2x UTC).
- Recuperable: el binlog esta activo (`binlog_format=ROW`, expiracion 30 dias). El primer DROP esta en `binlog.000002` pos **1650594** (`DROP TABLE IF EXISTS categorias`); todo lo anterior (binlog.000001 desde 2026-10-09 23:22 UTC + binlog.000002 hasta la pos 1650594) contiene el estado previo completo.
- Copia de seguridad de los binlogs hecha (solo lectura) en `odd/backup/administracion/binlog-recovery/` (binlog.000001, binlog.000002, binlog.index).
- NO intente la restauracion: la imagen `mysql:8.0` del contenedor `db` no trae `mysqlbinlog`, y otros writers siguen escribiendo en la misma BD (un replay ciego pisaria su trabajo). Camino sugerido: levantar un MySQL 8 aparte, restaurar ahi con `mysqlbinlog --stop-position=1650594 binlog.000001 binlog.000002 | mysql`, volcar con mysqldump y reimportar solo las tablas necesarias, o rehacer los seeds ('seed-adm') que ya eran datos de prueba segun este informe.
- Leccion: los scripts de depuracion deben cargar `.env.test` (override) o usar `NODE_ENV=test` con `setup.env.js`; `NODE_ENV=test` por si solo NO cambia de BD.

## Archivos tocados
Backend: `middlewares/audit.middleware.js` (reescrito), `controllers/audit_log.controller.js` (reescrito), `routes/audit_log.routes.js`, `models/audit_log.model.js` (+6 columnas, +5 indices), `scripts/ensure-audit-schema.js` (nuevo, idempotente), `app.js` (parche async + manejador global + unhandledRejection), `index.js` (1 import + 1 linea de etapa 'esquema auditoria'), `routes/venta.routes.js`, `routes/pedido.routes.js`, `routes/pos.routes.js`, `routes/commercial.routes.js`, `routes/ordenServicio.routes.js`, test `__tests__/integration/admin-auditoria-logica.test.js`.
Front: `pages/audit-logs/AuditLogsPage.tsx`, `services/auditLogService.ts`. Respaldos en `odd/backup/administracion/audit-*`.

## Verificacion observada
- `jest admin-auditoria-logica.test.js` (con `--testTimeout=120000`, el sync de test tarda ~20 s > 15 s por defecto): **18/18 pasan**.
- `jest no-console-log, ventas, pedidos, commercial-control, auth, boot, blog-logica`: todos PASS (36 tests).
- `orden-servicio-garantia.test.js`: 1 fallo **preexistente y ajeno**: fechas fijas (`garantia_fin 2026-09-04`) ya vencidas hoy (2026-10-10) -> 400 en vez de 201. No lo causa la auditoria.
- `tsc -p tsconfig.app.json --noEmit` en el contenedor frontend: 0 errores en rutas de auditoria (los errores restantes son de CompanyPage/PaymentsPage, de otros writers).
- Smoke en vivo :3100: `GET /api/audit-logs/permisos` sin token -> 401; JSON invalido en `/api/auth/login` -> 400 `{"message":"El cuerpo de la petición no es un JSON válido"}`.
- `ensureAuditSchema()` ejecutado dos veces en dev: sin error; indices `idx_audit_fecha, idx_audit_tabla_registro, idx_audit_accion_fecha, idx_audit_tabla_fecha, idx_audit_usuario_fecha`.

## Defectos del informe -> estado
C1 redaccion recursiva por patron (pass, pwd, contrase, clave, secret/secreto, token, authorization, api_key, llave, certificad, hash, sol_, client_secret, cvv, pin, otp, firma, credencial, cookie, salt) + por forma del valor (bcrypt, JWT), en body **y** en estado original: HECHO. C2 hash bcrypt: HECHO (el `findOne` excluye `password` y ademas se redacta). C3 deleteAll/purga: HECHO (ver contrato). C4 cobertura: parcial por reparto (ventas, pedidos, POS, inventario/stock, compras, proveedores, cotizaciones, ordenes de servicio; las demas son de otros writers). A1/A2/A3/A4/A5/A6/A7: HECHO. M1 registro_id desde la respuesta: HECHO. M2 `registro_ref VARCHAR(64)` para ids no numericos: HECHO. M3 diff: calculado en el detalle (`cambios`), sin `timestamp` en el JSON; `_ruta` en datos_nuevos. M4 PII: enmascarada en `solicitudes_postventa` y `libro_reclamaciones`. M5 IP sin `::ffff:`; UA truncado a 500. M6 snapshot de autor (`usuario_nombre/email/rol`). M7 fechas ISO `-05:00`. M8 `/stats` con retencion (24 meses, env `AUDIT_RETENTION_MONTHS`); no hay job de purga automatica. M10 CSV: HECHO. M9 (front monolitico): solo lo imprescindible; el rediseno viene de Open Design.

## Contrato final (`/api/audit-logs`)
Acceso de lectura: rol 1, rol 5, superusuario temporal, o `area_grants` con `auditoria`. 401 sin token; 403 `{message}` sin permiso. Errores siempre JSON `{message, errores?}`.
- `GET /` -> `{rows, total, page, limit}`. Query: `page` (1), `limit` (25, max 100), `usuario_id`, `tabla` o `modulo` (se normaliza: users=usuarios, companies=empresas...), `accion`, `registro_id`, `desde`/`hasta` (AAAA-MM-DD, dias civiles de Lima, `hasta` inclusivo), `q` (accion, tabla, ip, registro_ref, nombre/correo del autor, `registro_id`/`id_log` si es numerico). 400 `{message:"Filtros inválidos", errores:{desde|hasta|usuario_id|registro_id}}`. Fila: `id_log, usuario_id, usuario{name,email}|null, usuario_rol, accion, tabla, registro_id|null, registro_ref|null, estado_http, ip_cliente, user_agent, fecha_hora (ISO -05:00), tiene_detalle`. No trae `datos_*`.
- `GET /:id` -> fila + `datos_anteriores` y `datos_nuevos` (objetos) + `cambios:[{campo,antes,despues,sensible}]` (solo campos del body que cambian; `sensible:true` = valor redactado). 404 si no existe.
- `GET /export.csv` mismos filtros (sin page/limit). UTF-8 con BOM, columnas `id_log,fecha_hora,usuario,email,rol,accion,modulo,registro,estado_http,ip,campos_cambiados`; cabeceras `X-Total-Count`, `X-Truncated` (tope 50 000 filas); celdas que empiezan con `= + - @` se prefijan con `'`. Se audita como `exportar/auditoria` con los filtros y el conteo.
- `GET /catalogo` -> `{tablas:[normalizadas], acciones:[], usuarios:[{id,name,email}]}`.
- `GET /permisos` -> `{puede_ver, puede_exportar, puede_purgar, retencion_meses, confirmacion_purga:{fecha,total}|null}`. `puede_purgar` = rol 1 con el correo exacto `MASTER_ADMIN_EMAIL`.
- `GET /stats` -> `{totalLogs, monthlyStats[{month,count}], oldestLog, retencion_meses, fecha_corte, logsFueraDeRetencion, oldLogsCount}`.
- Alias historicos (misma respuesta paginada): `/usuario/:usuario_id`, `/tabla/:tabla`, `/accion/:accion`, `/rango-fechas?fechaInicio&fechaFin`.
- `DELETE /` (solo cuenta maestra real; superusuario temporal y rol 5 -> 403). Body con **exactamente un** criterio: `{ids:[<=500]}`, `{beforeDate:"AAAA-MM-DD"}` (borra lo anterior al inicio de ese dia en hora Lima, exclusivo) o `{deleteAll:true}`. Requiere `confirmacion:"PURGAR AUDITORIA"` (`"ELIMINAR TODO EL HISTORIAL"` para deleteAll). `dryRun:true` devuelve `{dryRun,count,criterio}` sin borrar ni exigir confirmacion. 400 sin confirmacion/criterio unico, 404 si 0 coincidencias, 200 `{message, deletedCount, auditoria_id}`. Escribe en la misma transaccion una fila `purgar`/`purgar_total` en tabla `auditoria` con criterio y conteo.
Registro (`registrarAuditoria(accion, tabla, {idParam?})`): solo si la respuesta es < 400; `registro_id` de: `res.locals.auditoria.registro_id` > `req.registro_id` > param (`id`, `venta_id`, ...) > `body.id` > respuesta (`id`, `<tabla>_id`, `id_<tabla>` o unico `id_*`); no numerico -> `registro_ref`. `res.locals.auditoria={registro_id,antes,despues}` permite a un controller afinar. Columnas nuevas en `audit_logs`: `registro_ref, estado_http, usuario_nombre, usuario_email, usuario_rol`.
Global (`app.js`): handler 500 `{message:"Error interno del servidor"}`, 400 JSON invalido, 413, 4xx con `err.status`; promesas rechazadas de handlers async van a `next(err)`; `unhandledRejection` se registra sin tumbar el proceso.

## Cobertura anadida (tabla, acciones)
ventas: `actualizar_comprobante`. pedidos: `actualizar_estado`, `eliminar`, `confirmar_pago_manual`. pos_adquirentes: `crear`, `actualizar`. pos_pagos: `confirmar_pago`. inventario: `crear_ubicacion`, `fijar_existencia`, `ajustar_stock`. proveedores: `crear`, `actualizar`. compras: `crear`, `anular`. cotizaciones: `crear`, `actualizar_estado`, `convertir`. ordenes_servicio: `crear, actualizar, eliminar, agregar_pago, anular_pago, agregar_repuesto, retirar_repuesto, agregar_evidencia, retirar_evidencia, cambiar_visibilidad_evidencia, crear_cotizacion, resolver_cotizacion, reingreso_garantia, definir_credencial, revelar_credencial, eliminar_credencial, generar_diagnostico, revisar_diagnostico, preparar_mensaje`. Sin cambios: ventas crear/eliminar/comprobante y cierres_caja ya estaban auditados. No auditados a proposito: pago publico `pagar-culqi`/webhook (sin usuario autenticado; abriria escritura anonima en la tabla).

## Decisiones aplicadas por defecto / pendientes del usuario
1. Rol 5 ve la pantalla: SI (el front ya no redirige; el backend decide).
2. Borrado: se mantiene pero blindado (solo maestra real, confirmacion textual, rastro, sin superusuario temporal). `deleteAll` sigue existiendo por el requisito; si prefieren eliminarlo del todo, es borrar un `if`.
3. 4xx/5xx: NO se registran (lo mas seguro: no se afirma una accion no ocurrida). Pendiente de decision: eventos `*_fallido` aparte / login fallido.
4. Retencion 24 meses solo informativa (`/stats`); no hay purga automatica.
5. PII enmascarada solo en postventa y libro de reclamaciones (en usuarios se conserva el correo porque es dato de la auditoria).
6. Datos historicos NO se reescriben: las filas con `users`/`companies` siguen asi y los filtros las unen con `usuarios`/`empresas`.
7. La busqueda `q` no recorre el contenido de `datos_*` (costoso en TEXT).

## Datos para el brief de diseno
- Ejemplo real de diff (salida del test, `GET /api/audit-logs/:id`, blog_posts·actualizar): `cambios:[{campo:"titulo", antes:"Guia de auditoria seed-adm", despues:"Titulo nuevo seed-adm", sensible:false}]`; antes la UI mostraba 25 campos y tipos mezclados.
- Ejemplo de secreto: body `{extra:{password:..., lista:[{api_key:...}]}}` se guarda como `{"extra":{"password":"[REDACTADO]","lista":[{"api_key":"[REDACTADO]"}]},"_ruta":"POST /api/blog/admin"}`; `cambios[].sensible=true` -> mostrar `••••`.
- Conteos de las pruebas: lista 3 filas -> `total 3`; rango `2026-03-10..2026-03-10` -> 1 (23:30 Lima), `..03-11` -> 2; modulo `usuarios` une `users`+`usuarios` -> 2; purga `beforeDate 2026-03-11` -> elimina 1 y deja 1 fila `purgar`. Conteos reales de dev ya no existen (BD vaciada, ver incidente): referencia previa del informe 124 logs.
- Filtros del contrato (UI): rango de fechas (atajos Hoy/7 d/30 d), usuario (selector con `catalogo.usuarios`), modulo (`catalogo.tablas` con etiquetas), accion (`catalogo.acciones`), texto libre `q`, chips activos + Limpiar; botones Exportar CSV (todos los roles con acceso) y Eliminar (solo `permisos.puede_purgar`).
- Estados a pintar: carga, vacio real, vacio por filtro, **error con Reintentar** (distinto del vacio), **sin permiso (403)**.

## Pendientes para otros / fuera de mi superficie
- `Frontend/src/App.tsx` y `DashboardLayout.tsx` restringen la ruta a rol [1,5]; el area `auditoria` delegada y el superusuario temporal pasan en el backend pero no ven el menu/ruta.
- **Bug preexistente de zona horaria en `auth.middleware.js`**: `acceso_expira_en` llega como texto de hora Lima (`dateStrings`) y `new Date(texto)` en un servidor UTC lo interpreta 5 h antes: el acceso del rol 5 caduca ~5 h antes de lo configurado. Mismo patron en `superusuario_expira_en` (master.middleware.js). Lo detecte porque mi test del auditor con +1 h daba 403.
- `orden-servicio-garantia.test.js` usa fechas fijas ya vencidas (falla desde sep-2026).
- La suite en contenedor necesita `--testTimeout=120000`: `setupTestDb()` tarda ~20 s con 63 tablas y el limite por defecto es 15 s.

## Key Learnings
1. `NODE_ENV=test` no cambia de BD: solo `__tests__/setup.env.js` carga `.env.test`. Cualquier script ad-hoc con `sync({force:true})` fuera de jest destruye la BD de desarrollo (me paso).
2. `res.json()` de Express llama a `res.send()`: enganchar `res.once('finish')` + capturar `send` cubre ambos y permite leer `statusCode`; el log se escribe tras responder, los tests deben esperar (`waitLog`).
3. Con MySQL `dateStrings`, filtrar fechas con objetos `Date` desfasa 5 h; comparar con `sequelize.where(col, op, literal(escape('AAAA-MM-DD HH:mm:ss')))` y, en DELETE, usar la columna sin alias.
4. Express 4 no encamina promesas rechazadas: parchear `Layer.prototype.handle_request` (una vez, en app.js) hace que todos los handlers async terminen en el manejador global.
5. El informe se apoyaba en que rol 5 no podia entrar; en realidad el JWT del rol 5 depende de `acceso_expira_en` y el desfase UTC lo caduca antes (ver pendientes).


---

## Run OD (brief de diseño de Open Design)

- Proyecto: `criscom-adm-auditoria` — «Administración - Logs de auditoría»
- **runId: `915f8d0c-5b48-4d5e-8c9a-89602ca03b8e`** — estado al comprobar (una sola vez): `running` — 2026-10-10 ~20:57 (Lima)
- Run descartado (sin efecto): `3ded10cc-2e4c-498e-9bc5-08fbee361b07` — el primer lanzamiento coincidió con un 503 `DAEMON_UNAVAILABLE` del proxy (daemon ocupado), el proyecto no existía y el run terminó `succeeded` con `no_artifact`. Se relanzó con reintentos.
- Brief: `odd/opendesign/criscom-adm-auditoria/DESIGN.md` + `auditoria-data.json` (generados por `odd/tools/brief_adm_auditoria.py`); prompt: `odd/tmp/prompt-adm-auditoria.txt`; capturas de la pantalla actual en `referencias/` (18 + 1); medidas en `odd/tmp/adm_auditoria_medidas.json`.
- Nota: la BD tenía 124 logs al empezar; otros equipos ya la llevaron a 185+ (el brief usa 185 y dice que las filas con id_log <= 124 no traen estado_http ni rol). `GET /permisos` devuelve `confirmacion_purga:{fecha:"PURGAR AUDITORIA", total:"ELIMINAR TODO EL HISTORIAL"}` (el informe lo describía como {fecha,total} sin valores).


---

## Port a codigo (writer port auditoria)

Estado: done. Diseno aprobado portado a `Frontend/src/pages/audit-logs/` (entrada fina `AuditLogsPage.tsx` + 24 archivos <~135 lineas, prefijo `Aud`/`aud`/`useAud`) y `Frontend/src/styles/auditoria.css` (`.pg-auditoria`, generado con od2css+fixcq y depurado de tablero). Servicio ampliado: `AuditDetail`, `AuditStats`, `getStats`, `purgeLogs` con `dryRun`, `mensajeError`, `estadoHttp`, `exportLogsCsv` devuelve `{blob,total,truncated}`.
- Servidor: lista paginada (25/50/100) con usuario+modulo+accion+fechas (atajos Hoy/7 d/30 d)+q combinables, chips y Limpiar; detalle con diff campo a campo (secretos «••• oculto», reforzado en front por clave y por forma bcrypt/JWT, tambien en el JSON completo); export CSV con los mismos filtros; franja de retencion con `/stats`.
- Purga: SOLO el dialogo (no se cierra con clic fuera): fecha de corte < hoy (Lima) -> «Contar logs» (dryRun) -> frase exacta `PURGAR AUDITORIA` + conteo >= 1 -> «Purgar» (`aria-disabled` hasta entonces). Sin `window.confirm`.
- Rol 5 (token real de seed-adm Victor Condori id 9011): exporta si; «Purgar historial…» deshabilitado con el motivo escrito (`aria-describedby`). Filas historicas (id <= 124): estado HTTP y rol «-» con el motivo «Registro anterior al control de estado».
- Estados: cargando (esqueleto), vacio real, vacio por filtro, error 500 con Reintentar (cabecera y filtros intactos), 403 (quien puede + Solicitar acceso), 401 (Iniciar sesion; en la practica lo resuelve el interceptor).

### Verificacion observada
- `docker compose ... exec -T frontend sh -c 'npx tsc -p tsconfig.app.json --noEmit | grep audit-logs|auditLogService'`: 0 errores en mis rutas. `npx eslint src/pages/audit-logs src/services/auditLogService.ts`: 0 errores, 0 warnings.
- Playwright (contexto propio, headless shell) 1440x900 / 1280x720 / 390x844, claro y oscuro: 0 gradientes, 0 backdrop-filter, 0 box-shadow (solo el menu del combobox de usuario y los dialogos), 0 objetivos < 44 px dentro de `.pg-auditoria`, sin overflow horizontal, `h1` a x=24 (12 en movil), 12 filas visibles sin desplazar a 1440x900 (6 a 1280x720), 4 tarjetas en 390.
- Flujo real: filtros combinados modulo+accion+Hoy -> chips «Modulo: Productos · Accion: Crear · Fecha: Hoy», «Mostrando 1–11 de 11 (filtrado)»; usuario por busqueda; detalle log 171 (usuarios·crear): 2 «••• oculto» con candado, 0 hashes, 0 «[REDACTADO]»; log 124 (historico): motivo, «hay JSON anterior (N campos)», PII enmascarada; log 8: «Lista de 2 elementos»/«Objeto de 3 campos»; log 13: «Mismo valor, distinto formato».
- Exportar CSV real: descarga `auditoria-AAAA-MM-DD.csv`, aviso «Se exportaron 213 filas con los filtros activos» (213 = total del listado).
- Purga SOLO con `dryRun` real (fecha 09/10/2026 -> 0 -> «No hay logs para ese criterio»). El conteo positivo («Se eliminaran 37 logs…») y el 200 de la purga se SIMULARON con `page.route` (la purga real contra `erp_computacion` esta prohibida; 0 filas `purgar*` en `audit_logs`, total sin cambios por la purga).
- Estados simulados con `page.route`: 500 listado, 403 permisos, vacio real, esqueleto (demora 2,5 s), vacio por filtro (q imposible).

### Diferencias diseno vs backend / decisiones
- El backend NO expone `X-Total-Count` ni `X-Truncated` por CORS (`app.js` no define `exposedHeaders`; el front corre en otro origen en dev): el front cuenta las filas del CSV y marca truncado si llegan 50 000. Pendiente (fuera de mi superficie): `exposedHeaders:['X-Total-Count','X-Truncated']` en el cors de `Backend/src/app.js`.
- Regla de purga del diseno: la fecha de corte no puede ser hoy ni futura. Con los logs actuales (todos del 9-10/10) eso deja la purga real sin criterio util hasta que haya logs mas viejos; el dryRun positivo solo se probo simulado.
- `Frontend/src/App.tsx`/`DashboardLayout.tsx` siguen restringiendo la ruta a roles [1,5]: el permiso de area `auditoria` y el superusuario temporal pasan el backend pero no ven la ruta/menu (ya reportado en la nota de logica).
- La version «de logica» de la pagina (1161 lineas) no quedo respaldada aparte: el respaldo en `odd/backup/administracion/audit-Frontend_src_pages_audit-logs_AuditLogsPage.tsx` es la original (1120 lineas).
- El diseno trae un bug propio (clase `.sel` aplicada a la fila seleccionada y al selector): en codigo el selector usa `label.sel`.

### Filas nuevas en `audit_logs` generadas por estas pruebas
Exportaciones reales: 3 filas `exportar/auditoria` (2 desde la UI + 1 curl al verificar cabeceras; ids en el rango 214-218, junto con las de otros equipos). Ninguna fila `purgar*`. No se hizo DELETE de logs ni se tocaron seeds.

### Key Learnings
1. Con CORS sin `exposedHeaders`, axios en otro origen no ve `X-Total-Count`/`X-Truncated`: contar filas del Blob CSV (respetando comillas) como respaldo.
2. No reutilices clases genericas del diseno (`.sel`) para dos cosas: `.pg-x .sel` puso `display:inline-flex` en la fila seleccionada de la tabla y rompio sus columnas.
3. Un `<input>` dentro de un `.fld` de ancho fijo/grid necesita `width:0` + `flex:1`; si no, su ancho intrinseco desborda la hoja movil.
4. Un dialogo de purga debe usar `Dialog` de Radix directo con `onPointerDownOutside` prevenido (ErpDialog no lo permite) y `onInteractOutside`.
5. Para probar purga sin riesgo: `page.route` sobre `DELETE /api/audit-logs` que deja pasar `dryRun` y simula el 200 de la purga real.
