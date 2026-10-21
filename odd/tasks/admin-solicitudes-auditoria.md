# Auditoría de lógica — Solicitudes de importación y Cotizaciones de armado

Solo lectura. Alcance: `Frontend/src/pages/solicitudes-importacion/SolicitudesImportacionPage.tsx`,
`pages/solicitudes-ensamble/SolicitudesEnsamblePage.tsx`, controladores/rutas/modelos Backend y endpoints públicos del Ecommerce.
Rutas relativas a `Backend/src/` salvo indicación. BD consultada: ambas tablas tienen **0 filas**; `importaciones` tiene 5.

## 1. Contrato API actual

### Solicitudes de importación (código `SOL-AAAAMMDD-XXXXXX`)
| Método y ruta | Auth | Notas |
|---|---|---|
| `GET /api/solicitudes-importacion?estado&limit&offset` | JWT + `crisitusOnly` (routes/solicitudImportacion.routes.js:10) | `{success,data:[...]}`; orden `created_at DESC`; límite 100 por defecto, tope 200; **sin total**. |
| `PUT /api/solicitudes-importacion/:id/estado` | ídem | Body: `estado, notas_admin, cotizacion_monto, cotizacion_nota, cotizacion_fecha, fecha_entrega_estimada`. Devuelve la fila completa (incluye `notas_admin`). |
| `POST /api/ecommerce/solicitudes-importacion` | público + `publicSubmissionLimiter` (8 por 15 min/IP) | 201 con vista pública. |
| `GET /api/ecommerce/seguimiento/:codigo` | público, solo `apiLimiter` (300/min) | Vista pública (CAMPOS_PUBLICOS). |

Estados: recibida, en_revision, cotizada, aprobada, en_transito, entregada, rechazada. Urgencia: baja/media/alta/urgente.
Tipos: laptop, componente, periferico, monitor, almacenamiento, red, otro. Cotización en **USD** (label de la pantalla).

### Cotizaciones de armado (código `ARM-AAAAMMDD-XXXXXX`)
Mismas rutas con `/solicitudes-ensamble`, `POST /api/ecommerce/solicitudes-ensamble`, `GET /api/ecommerce/seguimiento-ensamble/:codigo`.
Estados: recibida, en_revision, cotizada, aprobada, **en_ensamble**, entregada, rechazada. Modos: marketplace, presupuesto, ensamble_propio.
Tiers: oficina, gamer, alto_rendimiento, workstation, otro. Cotización en **S/**.

### Montaje y visibilidad
- Backend monta ambos routers solo si `FEATURE_ECOMMERCE` (app.js:123-128). Front: ruta con `RoleProtectedRoute allowedRoles={[1]}` (App.tsx:288-303) y menú solo si `features.ecommerce && isCrisitus` (DashboardLayout.tsx:241-242). El permiso real es el backend (`crisitusOnly` compara el email vigente en BD, crisitusOnly.middleware.js:12-15): **consistente, sin hallazgo**. El front duplica el email en código (DashboardLayout.tsx:143), no lee `MASTER_ADMIN_EMAIL`.
- Ecommerce tiene stubs que devuelven `[]`/`{}` (ecommerce.routes.js:92-95).

## 2. Defectos priorizados

### CRÍTICOS
**C1. Una solicitud aprobada no genera nada: no hay conversión.** Ningún controlador de solicitud toca `Importacion`, `Cotizacion` ni `Venta`; `importacion.model.js` no tiene `id_solicitud`; `solicitudImportacion.controller.js` solo hace `save()` (l.228-240). "Aprobada" es una etiqueta manual y el flujo se corta ahí; el equipo re-digita en Importaciones. Precedente en el repo: `solicitudServicio.routes.js:7` (`POST /:id/convertir`). Arreglo: añadir `POST /:id/convertir` (importación → `Importacion` planificada con proveedor/moneda USD/monto; armado → cotización/venta) y columna `id_importacion|id_cotizacion|id_venta` en la solicitud, bloqueando doble conversión.

**C2. Cero auditoría en los cambios de estado y cotización.** Ni `solicitudImportacion.controller.js` ni `solicitudEnsamble.controller.js` ni sus routes usan `registrarAuditoria`/`capturarEstadoOriginal` (audit.middleware.js:58). Cambiar un monto cotizado al cliente no deja rastro de quién ni cuándo. Arreglo: `router.put('/:id/estado', capturarEstadoOriginal(...), registrarAuditoria('actualizar','solicitudes_importacion'), ...)` y lo mismo en armado.

**C3. Nadie le avisa al cliente.** Los controladores no importan `mail.service` ni `whatsapp-template.service`. Cuando el admin cotiza (`cotizada`) el cliente solo se entera si entra a /seguimiento-solicitud con su código. En armado el email es opcional y el contacto real es el teléfono, pero la pantalla admin no tiene botón de WhatsApp/llamada. Arreglo: al pasar a `cotizada`/`aprobada`/`rechazada` enviar correo (importación) y ofrecer enlace `wa.me/51<tel>` con mensaje precargado (armado).

**C4. La cotización de armado es un número libre sin respaldo.** En modo marketplace el precio lo envía el navegador (Ecommerce armar-pc/page.tsx:292) y el backend lo guarda tal cual: `precio` y `nombre` sin consultar catálogo (solicitudEnsamble.controller.js:81-92); `id_producto` ni se valida contra `Producto`. La pantalla admin no muestra stock ni precio vigente, no suma ni aplica IGV, y no hay vigencia de cotización. Un cliente puede fijar un precio falso y verlo reflejado en el seguimiento público. Arreglo: al crear, resolver cada `id_producto` en BD y guardar precio y stock del momento; en admin mostrar desglose, total, IGV 18% y `valida_hasta`.

### ALTOS
**A1. Fechas públicas rotas: el seguimiento muestra "desconocida".** `CAMPOS_PUBLICOS` pide `created_at`/`updated_at` (importación l.42-43, armado l.57-58), pero Sequelize 6 con `underscored:true` expone `createdAt`/`updatedAt`, así que `k in plain` es falso y nunca salen. La página pública usa `data.updated_at` y cae a "desconocida" (Ecommerce seguimiento-solicitud/[codigo]/page.tsx:410). Arreglo: usar `createdAt`/`updatedAt` y normalizarlos a `created_at`/`updated_at` en `toPublicView`.

**A2. Cotización: fecha y nota se corrompen al guardar.** El front manda siempre `cotizacion_monto: null` si el campo está vacío (SolicitudesImportacionPage.tsx:154-157; igual en armado). El backend usa `!== undefined` (controller:236 / armado:331), así que `null` también sella `cotizacion_fecha = new Date()` en solicitudes sin cotizar. Además: borrar el monto no limpia la fecha; re-cotizar un monto distinto conserva la fecha de la primera cotización (solo se sella si estaba vacía); y vaciar el monto borra `cotizacion_nota` aunque sea texto visible al cliente. Arreglo: sellar fecha solo cuando `cotizacion_monto` cambia a un número; limpiar fecha si se borra el monto; no tocar la nota si no se envía.

**A3. Sin máquina de estados.** Cualquier salto es válido (`entregada → recibida`, `rechazada → aprobada`; controller:216-228). No exige monto para `cotizada` ni motivo para `rechazada`. El cliente no puede aprobar ni rechazar desde el seguimiento: "aprobada" es decisión interna. Arreglo: mapa de transiciones permitidas, `cotizada` exige `cotizacion_monto`, `rechazada` exige nota visible; decidir si el cliente aprueba (pregunta Q2).

**A4. Errores de entrada del admin devuelven 500.** `estado:null` pasa el `if (estado && ...)` y rompe `allowNull:false` (importación lo captura como 400, armado **no tiene** rama de validación: solicitudEnsamble.controller.js:338-341 → 500). `cotizacion_monto` con texto, negativo o `>99.999.999,99` y `fecha_entrega_estimada` inválida: sin validación (l.230-233) → 500 por `SequelizeDatabaseError`. `limit=abc` → `Math.min(NaN,200)` → 500 (l.191). Arreglo: validar tipos/rangos (`monto>=0`, fecha válida) y capturar `SequelizeDatabaseError` como 400.

**A5. Entrada pública sin límites de longitud: 500 y almacenamiento libre.** `STRING(120/160/200…)` sin `len` → texto largo da "Data too long" (`SequelizeDatabaseError`) que el catch no mapea → 500 (importación l.146-152; armado l.243-249). `especificaciones` y `mensaje` TEXT sin tope (solo 256 KB de body). `cantidad` sin máximo; `presupuesto_min > presupuesto_max` aceptado; teléfono sin validar (importación l.126, armado solo notEmpty). No hay honeypot ni captcha; el único freno es 8 envíos/15 min/IP, saltable con IPs distintas. Armado no valida `email_solicitante` en el controlador (solo regex del modelo) ni exige `mensaje` en `ensamble_propio`, aunque el front sí (armar-pc/page.tsx:323). Arreglo: tabla de límites + regex teléfono (+51 9 dígitos) + `trim()` + campo honeypot + Turnstile si hay abuso.

**A6. Datos personales en seguimiento público de armado.** `CAMPOS_PUBLICOS` de armado incluye `nombre_solicitante` y `ciudad` (l.42-43) y el listado de productos con precios, protegidos solo por el código. El `GET` público no tiene limitador propio (a diferencia de postventa, que usa `trackLimiter`, ecommerce.routes.js:49-51). Espacio de códigos: 16⁶ por día, fecha adivinable. Riesgo bajo hoy (0 filas) pero crece con volumen. Arreglo: quitar `nombre_solicitante` (o mostrar solo iniciales) y `ciudad`; aplicar limitador estricto al GET (p. ej. 20/15 min) y subir el sufijo a 10 caracteres.

### MEDIOS
**M1. Etiquetas de tier incorrectas en el seguimiento público.** `TIER_LABEL` (Ecommerce seguimiento-solicitud/[codigo]/page.tsx:103-110) usa claves antiguas (`oficina_1000`, `gaming_1500`…) que no existen en el enum real (`oficina|gamer|alto_rendimiento|workstation|otro`); el cliente ve la clave cruda (`?? data.tier_presupuesto`, l.287). Arreglo: alinear con `TIERS` de armar-pc.

**M2. Paginación y búsqueda solo en memoria.** Ambas pantallas piden sin `limit/offset` (se reciben 100) y buscan en el cliente (Page.tsx:112-122). Pasadas 100 solicitudes las antiguas son invisibles y el título "N solicitudes" miente. El backend no devuelve `total`. Arreglo: `{data,total}`, parámetro `q` (código/nombre/teléfono/email) server-side y paginación; contadores por estado en el endpoint.

**M3. Fallo de carga confundido con vacío.** Con `isError` la tabla muestra el aviso, pero el encabezado sigue diciendo "0 solicitudes" (SolicitudesImportacionPage.tsx:227, SolicitudesEnsamblePage.tsx:230) y el mensaje del servidor nunca se muestra (`onError` genérico, l.106-108). Hay que distinguir carga/error/vacío con acción "Reintentar".

**M4. Código de seguimiento con fecha UTC.** `generarCodigoSeguimiento` usa `getFullYear/getMonth/getDate` del servidor (importación l.46-55, armado l.61-69); el contenedor no define `TZ`, así que de 19:00 a 24:00 Lima el código lleva la fecha del día siguiente. Además `cotizacion_fecha = new Date()` (l.237) se guarda con `timezone:'-05:00'` y vuelve como hora de pared (`dateStrings`); las fechas se muestran sin zona. Arreglo: formatear con `America/Lima`.

**M5. Doble moneda sin columna.** Importación se cotiza en USD y armado en S/ solo por convención de etiquetas (Frontend + Ecommerce seguimiento l.338); no existe campo `moneda` ni IGV. Con la conversión (C1) a `Importacion` (que sí tiene `moneda`) hay riesgo de mezclar monedas.

**M6. (descartado)** El presupuesto de importación sí se declara en USD en el formulario público (solicitud-importacion/page.tsx:529); coherente con la pantalla admin.

**M7. Pantalla de armado: datos opcionales sin tratar.** `ProductoElegido.id_producto: number` pero el backend admite `null` (controller:85); `ensamble_propio` solo guarda `mensaje`. El front no tiene copiar-teléfono/WhatsApp, la búsqueda de importación no incluye teléfono y la de armado no incluye email.

**M8. Código muerto/engañoso en Ecommerce.** `Ecommerce/app/admin/solicitudes/page.tsx` y `mis-solicitudes` llaman a rutas que son stubs vacíos (`importRequestService` services/api.ts:230-241 ↔ ecommerce.routes.js:92-95): siempre muestran vacío. Eliminar o conectar.

**M9. Esquema.** `scripts/ensure-commerce-schema.js:75` sincroniza `SolicitudEnsamble` pero no `SolicitudImportacion`; un entorno nuevo falla en la primera solicitud de importación. Sin tests de armado (`__tests__/integration` solo cubre importación; no hay caso para 500 por longitud, paginación ni `cotizacion_fecha`).

**M10. Carrera de edición.** El diálogo reenvía todos los campos desde estado local (Page.tsx:140-159); dos admins se pisan. Solo hay una cuenta con acceso, riesgo bajo.

## 3. Decisiones del usuario (preguntas cerradas)
1. ¿Una solicitud de importación aprobada debe crear automáticamente una **Importación (planificada)**? Sí / Solo con botón "Convertir" / No (seguir manual).
2. ¿El cliente puede **aprobar o rechazar** la cotización desde el seguimiento público? Sí con un botón / No, lo hace el equipo por teléfono.
3. ¿La solicitud de armado aprobada se convierte en **Cotización formal**, **Venta/Pedido** o ninguna? (Elegir una.)
4. ¿Cómo se avisa al cliente al cotizar? Correo automático / WhatsApp manual con texto precargado / Ambos / Ninguno.
5. ¿La cotización de armado tendrá **vigencia** (días) y se muestra con **IGV incluido**? Sí 7 días / Sí 15 días / No.
6. ¿Quitamos nombre y ciudad del seguimiento público de armado? Sí / No.
7. ¿Se limita el flujo a transiciones fijas (sin retroceder desde entregada/rechazada)? Sí / No.
8. ¿Eliminamos el admin duplicado en Ecommerce (`/admin/solicitudes`, `/mis-solicitudes`)? Sí / No.
9. ¿Agregamos captcha (Turnstile) al formulario público? Sí / Solo si aparece spam.

## 4. Datos reales para el brief de diseño

**Conteos (BD local, 2026-10-10):** `solicitudes_importacion` = 0; `solicitudes_ensamble` = 0; `importaciones` = 5. El diseño debe prever estado vacío real y datos de muestra inventados con claridad.

**Campos de importación (lista):** código, cliente (nombre, email, teléfono opc.), producto (nombre, tipo, marca, modelo, país origen), cantidad, urgencia (4 niveles con color), estado (7, con color), fecha de creación. **Detalle:** especificaciones, mensaje del cliente, presupuesto min–máx USD, cotización (monto USD, nota visible, fecha), fecha entrega estimada, notas internas.

**Campos de armado (lista):** código, cliente (nombre, teléfono, email opc., ciudad), modo (3), resumen del pedido, estado (7), fecha. **Detalle por modo:** marketplace → líneas {nombre, cantidad, precio S/}; presupuesto → tier (con rango S/), monto libre si "otro", uso, periféricos (solo_pc/con_perifericos), marcas, hasta 2 prioridades (8 opciones); ensamble_propio → solo mensaje con las piezas. Cotización en S/, nota visible, entrega estimada, notas internas.

**Flujos a mostrar:** (a) cola por estado con contadores; (b) revisar y cotizar con nota visible al cliente vs. nota interna claramente separadas; (c) avisar al cliente (correo/WhatsApp); (d) convertir a Importación/Cotización (según decisiones 1 y 3); (e) historial de cambios (dependiente de C2); (f) enlace al seguimiento público del código.

**Estados de pantalla requeridos:** cargando, vacío sin datos, vacío por filtro, error con reintentar, paginación, detalle con guardado en curso, error de validación de campo.

**Reglas visuales vigentes:** badges por estado ya definidos en `ESTADO_COLORES`/`ESTADO_ENSAMBLE_COLORES`; el tercer estado de avance difiere (`en_transito` vs `en_ensamble`). Menú: Administración, visible solo con ecommerce activo y cuenta maestra.

## 5. Pantallas de diseño recomendadas: **4**
1. **Bandeja unificada** (pestañas Importación / Armado, contadores por estado, búsqueda, tabla paginada, estados vacío/error).
2. **Detalle de importación** (panel lateral o página: cliente, producto, cotización USD, notas separadas, acciones avisar y convertir).
3. **Detalle de armado** (líneas del pedido con precio y stock actual, desglose con IGV, vigencia, WhatsApp, convertir).
4. **Seguimiento público** (estado, cotización, fechas corregidas), pequeña pero hoy defectuosa (A1, M1).
Si se quiere mínimo viable: 3 (omitir la 4 hasta corregir A1 y M1 en código).

## 6. Orden de arreglo sugerido
C2 y A4 y A1 (rápidos, sin decisión de negocio) → A2 → A5/A6 → decisiones 1-5 → C1/C3/C4.

---

# Arreglo de lógica (writer) — estado: **done** (2026-10-10)

## Archivos tocados
Backend: `controllers/solicitudImportacion.controller.js` y `solicitudEnsamble.controller.js` (reescritos), `routes/solicitudImportacion.routes.js` y `solicitudEnsamble.routes.js`, `routes/ecommerce.routes.js` (solo líneas de solicitudes), `models/solicitud_importacion.model.js`, `solicitud_ensamble.model.js`, **nuevos** `solicitud_importacion_historial.model.js` y `solicitud_ensamble_historial.model.js`, `models/index.js`, **nuevos** `services/solicitud.service.js` (utilidades, fechas Lima, códigos, limiter), `solicitudWorkflow.service.js` (matriz de estados + cotización + historial), `solicitudArmado.service.js` (catálogo/IGV), `solicitudMail.service.js` (correos), `scripts/ensure-commerce-schema.js` (función `ensureSolicitudes`), tests `admin-solicitudes-logica.test.js` (nuevo) y `solicitudes-importacion.test.js` (adaptado al segundo factor y a la regla de cotización).
Front admin: `services/solicitudImportacionService.ts`, `solicitudEnsambleService.ts`, ambas páginas. Ecommerce: `services/ecommerceApi.ts`, `seguimiento-solicitud/[codigo]/page.tsx`, `solicitud-importacion/page.tsx` (solo mensaje de error del backend). Respaldos en `odd/backup/administracion/solicitudes-*`.

## Verificación
- `jest admin-solicitudes-logica + solicitudes-importacion + ecommerce-stubs + no-console-log` (contenedor, con candado, `--testTimeout=90000`): **4 suites, 38 tests, todo verde**.
- `tsc -p tsconfig.app.json --noEmit` (frontend): 0 errores en mis rutas (queda 1 de `VendorsPage.tsx`, de otro writer). `tsc --noEmit` Ecommerce: 0 errores.
- Migración real aplicada al reiniciar el backend: tablas `solicitud_importacion_historial`/`solicitud_ensamble_historial`; columnas `valida_hasta`, `importacion_id`/`cotizacion_id`, `convertida_en`; `fecha_entrega_estimada` pasó a `DATE` (comprobado con `describe`). Idempotente.
- Humo por API real (:3100) y navegador (ecommerce :3000, seguimiento con segundo factor): cotización, vigencia a 7 días, fechas `-05:00`, 409 por salto de estado, auditoría en `audit_logs`. **No** se hizo humo visual del admin :5173 (solo tsc).

## Defectos cerrados
C1 conversión (importación completa; armado solo marketplace) · C2 auditoría + historial · C3 correo al recibir y al cotizar (+ enlace WhatsApp en admin) · C4 precio de armado recalculado en servidor · A1 fechas públicas · A2 cotización (null no sella ni borra) · A3 matriz 409 · A4/A5 validación y 400 en vez de 500 · A6 datos personales fuera del seguimiento + limiter + segundo factor · M1 etiquetas de tier · M2 paginación/búsqueda en servidor · M3 error ≠ vacío · M4 código con fecha Lima · M5 `moneda` explícita en las respuestas (USD importación, PEN armado, sin columna) · M7 búsqueda por teléfono/email · M9 esquema + tests de armado. M8 (stubs del Ecommerce) y M10 (carrera de edición) no se tocaron (ver pendientes).

## Decisiones aplicadas por defecto / pendientes del usuario
1. **Conversión = solo con botón** (no automática). Importación: crea `Importacion` *planificada*, proveedor «Por definir», `costo_mercancia = 0` (el monto cotizado al cliente NO es costo; queda como referencia en `notas_contables`), moneda USD. No toca stock ni dinero. Idempotente por `importacion_id` (2.ª llamada → 200 `ya_convertida:true`).
2. **Armado → cotización profesional (borrador) solo para modo `marketplace`** (tiene líneas de catálogo); total = monto acordado (diferencia como línea «Servicio de armado y configuración» o descuento). **Pendiente documentado:** `presupuesto` y `ensamble_propio` devuelven 409 «arma la cotización a mano»; no se convierte a Venta/Pedido.
3. **El cliente NO aprueba/rechaza desde el seguimiento** (lo hace el equipo). Decisión 2 del informe sin implementar.
4. **Transiciones terminales:** `entregada` y `rechazada` no se reabren (decisión 7 = sí). Matriz: recibida→{en_revision,cotizada,rechazada}; en_revision→{cotizada,rechazada}; cotizada→{en_revision,aprobada,rechazada}; aprobada→{en_transito|en_ensamble,rechazada}; en_transito|en_ensamble→{entregada}.
5. **Cotización bloqueada tras aprobar** (409): el precio acordado no cambia. `rechazada` exige nota visible (motivo).
6. **Aviso al cliente = correo automático** (recibida y cotizada/re-cotizada) **+ enlace WhatsApp manual** (`whatsapp_url`) en admin. Nada se envía por WhatsApp solo. `MAIL_MODE` por defecto `dry` en dev (nada sale); en producción hace falta SMTP + `PUBLIC_BASE_URL` (si falta, el correo va sin enlace).
7. **Vigencia 7 días** (ajustable con `vigencia_dias` 1–90 al cotizar) e **IGV incluido** en armado; se aplica también a importación (valida_hasta). Sin cron: «vencida» se calcula al leer.
8. **Nombre y ciudad fuera del seguimiento público** (decisión 6 = sí). Sufijo del código sube a 10 caracteres; los de 6 siguen válidos.
9. Sin captcha (decisión 9 = solo si aparece spam): honeypot `website` + dedupe 24 h + `publicSubmissionLimiter`.
10. Eliminar los admin duplicados del Ecommerce (decisión 8): **no** (instrucción: dejarlos). Siguen mostrando vacío.

## Contrato final
**Público** (`/api/ecommerce`, sin auth). Error: `{success:false, message, msg, errores?:{campo:msg}}` (400 validación, 404, 409 duplicado/transición, 429 limiter, 500).
- `POST /solicitudes-importacion` → 201 `{success, message, msg, data}`; `data` = vista pública (abajo). Campos: `nombre_solicitante`(3–120) `email_solicitante` `telefono_solicitante?`(7–15 dígitos) `nombre_producto`(3–200) `tipo_producto`(enum) `marca?`(80) `modelo?`(120) `pais_origen?`(80) `especificaciones?`(4000) `mensaje?`(4000) `cantidad`(1–999) `presupuesto_min/max?`(0–99,999,999; min≤max) `nivel_urgencia?` `imagenes_urls?`(≤5 http/https) `website`(honeypot). 409 si el mismo correo+producto+tipo en 24 h.
- `POST /solicitudes-ensamble` → 201 igual. Campos: `nombre_solicitante`(3–120) `telefono_solicitante`(req) `email_solicitante?` `ciudad`(2–120) `modo` + `productos[{id_producto,cantidad}]` (marketplace; precio/nombre del navegador se **ignoran**, id inexistente → 400 `errores.productos`) | `tier_presupuesto`(+`presupuesto_personalizado` solo con `otro`) `uso_descripcion?`(2000) `incluye_perifericos?` `marcas_preferencia?`(255) `prioridades?`(≤2) | `mensaje`(≥10, ensamble_propio) ; `mensaje`(≤4000), `website`. 409 por mismo teléfono+contenido en 24 h.
- Seguimiento (limiter 20/15 min, 404 uniforme): `POST /seguimiento` y `POST /seguimiento-ensamble` body `{codigo, email | telefono4}`; también `GET /seguimiento/:codigo?email=|tel4=` y `GET /seguimiento-ensamble/:codigo?...` (sin factor → 400; código/factor erróneo o inexistente → 404 con el mismo mensaje).
- Vista pública importación: `id_solicitud, codigo_seguimiento, nombre_producto, tipo_producto, marca, modelo, cantidad, nivel_urgencia, estado, moneda:"USD", cotizacion_monto|null, cotizacion_nota|null, cotizacion_fecha, valida_hasta, vencida, fecha_entrega_estimada("AAAA-MM-DD"), created_at, updated_at, linea_tiempo[{estado,fecha}]`. Monto/fecha/vigencia solo si estado ∈ cotizada, aprobada, en_transito, entregada; nota también en rechazada. Armado: igual, sin nombre/ciudad, con `modo, productos[{nombre,cantidad,precio}], total_referencial, tier_presupuesto, presupuesto_personalizado, uso_descripcion, incluye_perifericos, marcas_preferencia, prioridades, moneda:"PEN", igv_incluido:true`.

**Admin** (`/api/solicitudes-importacion` y `/api/solicitudes-ensamble`; JWT + `crisitusOnly`; auditoría `solicitudes_importacion` / `solicitudes_ensamble`).
- `GET /?estado&q&tipo|modo&urgencia&page&limit` → `{success, rows, data(alias), total, page, limit, resumen:{<estado>:n,..,total}}`. `limit` 1–100 (def. 20); `page/limit/offset` inválidos → defecto; estado inválido → 400. `resumen` respeta `q`, no el filtro de estado.
- `GET /:id` → `{data: fila + historial[{id_historial,usuario_id,accion(estado|cotizacion|datos|convertir),de,a,monto_anterior,monto_nuevo,nota,creado}] + transiciones[]}`.
- `PUT /:id/estado` body (todo opcional): `estado, cotizacion_monto(>0|null), cotizacion_nota, notas_admin, fecha_entrega_estimada("AAAA-MM-DD"|null), vigencia_dias(1–90)`. `cotizacion_fecha` del cliente se ignora (la fija el servidor). 400 `{message, errores}` (tipos, rangos; `cotizada`/`aprobada` sin monto; `cotizada`/`rechazada` sin nota), 409 (transición inválida, cotización bloqueada tras aprobar, quitar monto estando cotizada), 404. 200 `{success, message, data: detalle}`.
- `POST /:id/convertir` → importación: 201 `{ya_convertida:false, importacion_id, data}` / 200 `{ya_convertida:true,...}`; armado: 201 `{cotizacion_id, numero}` / 200 con `data` = cotización. 409 si no está cotizada/aprobada, o (armado) no es marketplace, o sin monto.
- Fila admin incluye: montos como número, `moneda`, `valida_hasta`, `vencida`, `convertida_en`, `importacion_id|cotizacion_id`, `whatsapp_url`, `created_at/updated_at` ISO `-05:00`; armado además `productos[]` con `precio` (de la solicitud), `precio_actual`, `stock_actual`, `disponible`, `precio_cambio`, `stock_momento`, `precio_declarado?` y `resumen_catalogo{subtotal_sin_igv, igv, total_catalogo}`.

## Datos para el brief de diseño
**Estados importación:** recibida · en_revision · cotizada · aprobada · en_transito · entregada · rechazada. **Armado:** igual con `en_ensamble` en lugar de `en_transito`. Terminales: entregada, rechazada. Colores actuales por estado en `ESTADO_COLORES`/`ESTADO_ENSAMBLE_COLORES` (azul, amarillo, morado, verde, índigo, esmeralda, rojo).
**Campos lista importación:** código, cliente (nombre, correo, teléfono), producto (nombre, tipo, marca), cantidad, urgencia (baja/media/alta/urgente), estado, fecha. **Armado:** código, cliente (nombre, teléfono), ciudad, modo (marketplace/presupuesto/ensamble_propio) + resumen del pedido, estado, fecha. Contadores por estado (`resumen`), búsqueda (código, nombre, correo, teléfono, producto/ciudad), filtro de estado, paginación de 20.
**Detalle:** bloque cliente (+ botón WhatsApp), bloque pedido (importación: especificaciones, país, presupuesto USD; armado: líneas con precio/stock actual/aviso de cambio de precio, desglose subtotal + IGV 18% + total, o tier/uso/periféricos/marcas/prioridades), cotización (monto USD o S/ IGV incluido, nota **visible al cliente**, vigencia «válida hasta / vencida», fecha de entrega estimada), notas internas (separadas, NO visibles), selector de estado limitado a `transiciones`, historial de cambios, botón «Convertir en importación» / «Convertir en cotización» (se vuelve «Importación #N» / «Cotización #N»), enlace al seguimiento público.
**Flujos:** (a) cola por estado → (b) revisar y cotizar (monto + nota obligatorias para «cotizada»; avisa por correo) → (c) WhatsApp manual → (d) aprobar y convertir → (e) historial. Seguimiento público: formulario de segundo factor (correo o 4 dígitos) → vista con progreso, cotización, vigencia, entrega.
**Estados de pantalla:** cargando, vacío real, vacío por filtro, error con mensaje del backend + «Reintentar», error de campo/409 en el diálogo, guardando, convirtiendo, paginación, cotización vencida.
**Ejemplo realista (semillas `seed-adm`, se conservan para el diseño; correos `*.seed-adm@example.com`):**
- Importación id 1 `SOL-20261010-PWZJM4Q6SA` — Lucía Ramos Quispe, laptop Lenovo ThinkPad X1 Carbon Gen 12 ×2, presupuesto 1,800–2,300 USD, urgencia alta, EE. UU.; **cotizada** US$ 4,350 («flete aéreo e impuestos, 3 semanas»), entrega 06/11/2026, válida hasta 17/10; tel. 987 654 321 (seguimiento: últimos 4 `4321`).
- Importación id 2 `SOL-20261010-849YCZ6WVY` — Diego Fernández Paz, monitor Dell UltraSharp U2723QE 4K ×3, tope 1,500 USD, urgencia media; **recibida**.
- Armado id 1 `ARM-20261010-NU9LT6Y8B6` — Marco Huamán Llerena (Arequipa), marketplace: Ryzen 5 7600 + RTX 4060 (stock 0, aviso) + RAM 32 GB + 2× SSD 1 TB, catálogo S/ 3,170 (sub. 2,686.44 + IGV 483.56); **cotizada** S/ 3,720 (armado y 12 meses de garantía), válida 7 días. Demuestra que el navegador mandó precio 1 y el servidor lo corrigió (`precio_declarado`).
- Armado id 2 `ARM-20261010-YSTXZAZUZV` — Andrea Salas Medina (Cayma), presupuesto gamer, con periféricos, prioridades gráfica + estética, tope S/ 3,500; **recibida**.
- Productos semilla en BD (`seed-adm`, ids 1–4, categoría «Componentes seed-adm») necesarios para las líneas del armado; no se borraron.

## Pendiente / pedido a otros
- **`Ecommerce/app/(public)/armar-pc/page.tsx` (fuera de mis superficies):** su `catch` oculta el mensaje del backend (400/409) tras un genérico; conviene mostrar `error.response.data.message` + `errores` como hice en `solicitud-importacion`. El envío actual sigue funcionando (el servidor ignora el precio que manda).
- Stubs muertos del Ecommerce (`/admin/solicitudes`, `/mis-solicitudes`, `GET /solicitudes-importacion*` vacíos) intactos.
- Auditoría: si el writer de «Logs de auditoría» mantiene `PII_TABLES`, añadir `solicitudes_importacion`/`solicitudes_ensamble` (guardan nombre/teléfono/correo en `datos_*`).
- Convertir armado de `presupuesto`/`ensamble_propio`, aprobación del cliente desde el seguimiento y cron de vencimiento: no implementados.
- Entorno real: `MAIL_MODE=live` con SMTP + `PUBLIC_BASE_URL` para que salgan los correos.

## Key Learnings
1. `postventa.service/controller` es la plantilla correcta para formularios públicos (honeypot, dedupe, segundo factor, `trackLimiter`, `iso()`): se reutilizó el patrón en `solicitud*.service.js`.
2. Sequelize con `underscored:true` expone `createdAt/updatedAt`: pedir `created_at` en `get({plain:true})` nunca existe (causa del «desconocida»). Con MySQL + `dateStrings` hay que `reload()` y pasar por `iso()`; una fecha civil debe ser `DATEONLY` (con `DATE` el día se corría por la zona).
3. Los correos se llaman vía `module.exports.enviarCorreo` para poder espiarlos en jest sin enviar nada.
4. En jest los suites tardan >15 s en `sync({force})` por el MySQL de test compartido: usar `--testTimeout=90000` y el candado `/tmp/jest.lock`.
5. El monto cotizado al cliente no se copia como costo de la `Importacion`: contaminaría el costo de compra.

## Run OD
- Proyecto Open Design: `criscom-adm-sol-importacion` («Administración - Solicitudes de importación», `/erp/solicitudes-importacion`).
- runId: `946798c8-3834-4587-8f2b-701b624287d2` (lanzado 10/10/2026 ~20:50, hora de Lima; 202 aceptado).
- Brief: `odd/opendesign/criscom-adm-sol-importacion/DESIGN.md` + `sol-importacion-data.json` (generados por `odd/tools/brief_adm_sol_importacion.py`); prompt: `odd/tmp/prompt-adm-sol-importacion.txt`.
- Seeds `seed-adm` creados para esta pantalla (se conservan para el diseño; limpiar al terminar): solicitudes de importación id 1-4 (`SOL-20261010-E5NSS6B4CJ` cotizada, `SOL-20261010-S5JUQN6NG2` aprobada y convertida, `SOL-20261010-VD5Y86FJFV` en tránsito, `SOL-20261010-CGMVYXQNWN` rechazada) y la **importación id 6** (referencia `SOL-20261010-S5JUQN6NG2`, planificada) creada al convertir la solicitud 2. Sus tablas de historial (`solicitud_importacion_historial`) tienen filas asociadas; correos `*.seed-adm@example.com`.

## Run OD — Cotizaciones de armado (2026-10-10)
- Proyecto Open Design: `criscom-adm-sol-armado` («Administración - Cotizaciones de armado»), carpeta `odd/opendesign/criscom-adm-sol-armado/`.
- runId: `fe55aa48-5772-4be5-8338-f576883ce2d0` (202, lanzado 2026-10-10 ~20:50 hora de Lima; comprobado una vez: `running`; hubo un 503 transitorio DAEMON_UNAVAILABLE justo tras lanzar y se recuperó en segundos).
- Generador: `odd/tools/brief_adm_sol-armado.py`; prompt `odd/tmp/prompt-adm-sol-armado.txt`; medidas `odd/tmp/adm_sol-armado_med.json`.
- Seeds `seed-adm` de armado creados por la API pública (IPs 10.77.1.1–10.77.4.1): ids 1 (marketplace cotizada ARM-20261010-9XBAZFJ7SA), 2 (marketplace aprobada y convertida, cotizacion_id 9 COT-MV35H8AKV3H, ARM-20261010-FRWZ84X6GE), 3 (presupuesto en revisión, ARM-20261010-E6KSJ35VYK), 4 (ensamble propio recibida, ARM-20261010-8XBP9CVT2Q). Para limpiar: borrar esas 4 filas de `solicitudes_ensamble` (+ sus `solicitud_ensamble_historial`) y la cotización profesional id 9 (borrador).
- Estado del run: aceptado (202). La comprobación con `GET /api/runs/<runId>` devolvió 503 `DAEMON_UNAVAILABLE` (3 intentos en ~40 s; el proxy :7456 responde y el proceso de Open Design está activo): el demonio no contestaba en ese momento. No se canceló ni se relanzó. Volver a consultar el runId más tarde.

## Port a codigo — Cotizaciones de armado (2026-10-10)
Estado: **done**. Diseno aprobado `odd/opendesign/criscom-adm-sol-armado/index.html` portado a `pages/solicitudes-ensamble/` (entrada fina `SolicitudesEnsamblePage.tsx` + 18 archivos `Sar*`/`sar*`/`useSar*`, todos < 110 lineas) y `styles/sol-armado.css` (`.pg-solarm`; od2css + fixcq + limpieza del tablero; `.lab-m` y los `@container` de una linea se repusieron a mano). Servicio sin cambios. Respaldo original: `odd/backup/administracion/solicitudes-Frontend_src_pages_solicitudes-ensamble_SolicitudesEnsamblePage.tsx`.
- Bandeja + detalle (patron libro-reclamaciones): chips de estado con contador, filtro de modo, busqueda con retraso, paginacion en servidor (20), detalle sin modal, pie con una sola accion primaria, aviso inline de cambios sin guardar, confirmacion inline de rechazo, 403/401/500/vacio/sin resultados distintos, movil a pantalla completa con pie fijo.
- Convertir: solo marketplace en cotizada/aprobada con monto; presupuesto y ensamble propio = control deshabilitado con el motivo «arma la cotizacion a mano»; ya convertida = enlace `Cotizacion COT-…` a `/commercial-control?tab=quotes` (el numero se lee del historial; el detalle solo trae `cotizacion_id`).
- Verificacion: `tsc -p tsconfig.app.json --noEmit` (filtrado a mis rutas): 0 errores; `eslint src/pages/solicitudes-ensamble src/services/solicitudEnsambleService.ts`: 0 problemas. Playwright 1440x900, 1280x720, 390x844 (claro) y 1440/390 oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras, 0 objetivos < 44 px, sin overflow horizontal, h1 en x=24 (12 movil). Flujo real contra :3100: cotizar (monto+nota+vigencia 14 d+entrega), errores por campo (vigencia 120, fecha 31/02), 409 (estado cambiado por API) con «Recargar la solicitud», rechazo con confirmacion inline, aviso de cambios sin guardar (seguir/descartar), conversion y enlace.
- Diferencias diseno vs backend (se siguio el backend): (1) la vigencia solo se renueva si cambia el monto o se pasa a cotizada desde otro estado, por eso el aviso de «vencida» pide cambiar el monto o devolver a revision (el diseno decia «guarda de nuevo»); el campo de vigencia solo se habilita cuando se aplicara. (2) Los contadores de estado (`resumen`) respetan `q` pero no el filtro de modo: con modo=Marketplace los chips siguen sumando todos los modos. (3) El 409 muestra el mensaje real del backend (puede ser transicion invalida, cotizacion bloqueada o quitar monto). (4) Al elegir «Rechazada» el texto se vacia si era la nota de una cotizacion previa (el motivo lo lee el cliente).
- Seeds `seed-adm` modificados (armado): id 4 recibida -> cotizada (S/ 1,500, vigencia 14 d, entrega 20/10/2026) -> en_revision (por API, prueba de 409) -> **rechazada** (motivo visible); id 1 convertida: cotizacion comercial id 10 (borrador, COT-MV390RN6SBD; `cotizaciones_comerciales`); ids 2 y 3 sin cambios (la nota interna del 3 se probo solo en el borrador y se descarto). Sin stock/productos reales tocados; sin correo ni WhatsApp reales (MAIL_MODE dry).
- Para limpiar: borrar la cotizacion comercial 10 y sus detalles, y devolver las solicitudes 1 y 4 a su estado inicial (o borrar las 4 filas + historial).

---

## Port a codigo - Solicitudes de importacion (2026-10-10) - estado: done

Diseno aprobado `odd/opendesign/criscom-adm-sol-importacion/index.html` portado a `/erp/solicitudes-importacion` (prefijo CSS `.pg-solimp`, `styles/sol-importacion.css` generado con od2css+fixcq y limpiado del shell del tablero). Respaldo del original ya existia en `odd/backup/administracion/solicitudes-Frontend_src_pages_solicitudes-importacion_SolicitudesImportacionPage.tsx`.

**Archivos** (`Frontend/src/pages/solicitudes-importacion/`): `SolicitudesImportacionPage.tsx` (entrada fina), `SimPage`, `SimFilters`, `SimList`, `SimDetail`, `SimMobileDetail`, `SimSecPedido`, `SimSecEstado`, `SimSecCot`, `SimSecHist` (notas internas + historial), `SimFooter`, `simConv.tsx`, `SimBanners`, `SimPanels`, `SimField`, `simParts.tsx`, `simCommon.ts`, `simForm.ts`, `useSimList`, `useSimDetail`, `useSimScroll`; mas `styles/sol-importacion.css`. `solicitudImportacionService.ts` sin cambios (ya cubria el contrato). Todos < 100 lineas.

**Verificacion**
- `tsc -p tsconfig.app.json --noEmit` (contenedor frontend), filtrado por mis rutas: 0 errores. `eslint` sobre la carpeta y el servicio: 0 errores, 0 warnings.
- Playwright (contexto propio, 1440x900, 1280x720, 390x844, claro y oscuro): 0 gradientes, 0 backdrop-filter, 0 box-shadow, 0 objetivos < 44 px, sin overflow horizontal, h1 a x=24 (12 movil); primera fila a y=249 (1440) y 301 (1280, antes de compactar chips; ahora los 8 chips caben en una linea).
- Flujo real contra la API: abrir -> notas internas -> cambio sin guardar al abrir otra solicitud (confirmacion en linea, Seguir editando / Descartar y abrir) -> Guardar (banner + API actualizada); en revision -> cotizada con monto y nota vacios (resumen con 2 errores y marca por campo) -> cotizar de nuevo (API: cotizada, 4350, valida_hasta +7 dias); 409 provocado por API con la UI desfasada (mensaje del servidor + Recargar la solicitud, la UI muestra el estado real); solicitud 2 convertida: enlace Importacion #6 a /erp/imports, monto bloqueado con motivo, sin boton de convertir; en transito: solo Entregada, convertir deshabilitado con motivo; rechazada: todo deshabilitado con CERRADA.
- Estados con `page.route` (sin escribir): 500 (message + Reintentar, cabecera/filtros/chips con guion), 403 (sin Reintentar), 401 (interceptor -> /login), vacio real, sin resultados (Limpiar filtros), esqueleto, detalle 500 y 404, y convertir mockeado (convirtiendo -> ya convertida).

**Diferencias diseno vs backend**
- Nota al cliente: el diseno la deshabilita desde «Aprobada»; el backend solo bloquea el monto. Se mantiene deshabilitada salvo al elegir «Rechazada» (el motivo exige texto editable). Vigencia y monto bloqueados desde «Aprobada» como en el diseno.
- Usuario del historial: la API solo da `usuario_id` -> «Usuario #N».
- «Ver seguimiento» abre `VITE_PUBLIC_SITE_URL` (por defecto https://criscomgroup.pe) + `/seguimiento-solicitud/<codigo>`; el cliente igual debe poner su segundo factor.
- «Modo de prueba: el correo no sale» solo se muestra en desarrollo (`import.meta.env.DEV`).
- Convertir real NO se ejecuto (crearia otra importacion fuera de las solicitudes seed); se probo el flujo de UI con respuesta simulada.

**Seeds modificados** (todos `seed-adm`): solicitud 1 paso cotizada -> en_revision -> cotizada; `cotizacion_fecha`/`valida_hasta` ahora = 10/10 22:13 + 7 dias (17/10/2026), monto 4350, nota y notas internas con el mismo texto original; se anadieron filas a `solicitud_importacion_historial` de la 1. Sin cambios en 2, 3 y 4.

## Key Learnings
1. `page.goto` a la ruta ANTES de sembrar localStorage redirige a /login y luego a /erp: sembrar el login y volver a hacer `goto` a la ruta final.
2. En macOS `sed -i` exige `-i ''`; un `&&` tras un sed fallido corta el `cat >` siguiente: usar python3 para reemplazos.
3. El backend fija vigencia/fecha de cotizacion: enviar `vigencia_dias` solo al cotizar o cambiar el monto; la nota al cliente SI se puede editar tras aprobar (solo el monto esta bloqueado).
4. 8 chips de estado no caben en 960 px con padding 11: a <=1099 px bajar padding a 8 y gap a 6.
