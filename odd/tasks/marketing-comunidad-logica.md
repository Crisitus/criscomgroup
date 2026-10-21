# Marketing: Comunidad y correos - logica corregida (brief para el diseno)

## Estado
Backend + servicio frontend + pagina minima corregidos (2026-10-10). La pantalla se redisena despues. Sin git.

## Modos de correo (MAIL_MODE)
- `dry` (defecto): jsonTransport, nada sale de la maquina; los envios se registran como `enviado` (simulado).
- `test`: igual que dry (reservado para QA).
- `live`: SMTP real. Es el defecto solo si NODE_ENV=production y SMTP_HOST/USER/PASSWORD/MAIL_FROM estan completos.
- Cualquier envio (campana o prueba) exige PUBLIC_BASE_URL (503 si falta); en live ademas SMTP completo (503).
- La UI debe mostrar el modo siempre (`mail_mode`) y avisar "simulacion" en dry/test.

## Contrato API (/api/community, admin = roles 1 y 2; errores `{message}`)
- POST /subscribe (publico) {email, nombre?, fuente?, consentimiento:true, consentimiento_texto?}. `user_id` del cuerpo se IGNORA; se deriva del JWT si viene. Guarda texto e IP del consentimiento.
- GET /unsubscribe/:token -> pagina de confirmacion con boton POST (no da de baja). POST /unsubscribe/:token -> baja (apto One-Click). Token invalido -> 404.
- GET /admin?q&estado(activo|baja)&fuente&page&limit(max 100, def 25) -> {members,total,page,limit,activos,bajas,campaigns(50),mail_mode,smtp_configured,public_base_url_configured}
- GET /admin/members/export?q&estado&fuente -> CSV UTF-8 con BOM (max 50000 filas; celdas con =,+,-,@ se prefijan con ').
- PATCH /admin/members/:id/baja -> baja manual (404 si no existe).
- POST /admin/campaigns {asunto,contenido} -> 201 borrador. PUT /:id y DELETE /:id solo en borrador (409 si no).
- GET /admin/campaigns/:id -> campana + {enviados,fallidos,pendientes,porcentaje,fallos[<=50],mail_mode}. Sondear cada ~2 s mientras `estado==='enviando'`.
- POST /admin/campaigns/:id/test {email?} -> envia SOLO a ese correo; permitido: el del admin logueado (defecto) o los de COMMUNITY_TEST_EMAILS (coma); otro -> 403. Asunto con prefijo [PRUEBA].
- POST /admin/campaigns/:id/send -> 202 {destinatarios,pendientes,modo}. 409 si ya enviando/enviado o sin destinatarios; 404; 503 segun modo.

## Reglas
- Reclamo atomico: UPDATE estado='enviando' WHERE estado IN (borrador,fallido,parcial) y se verifica affectedRows antes de leer miembros (dos envios simultaneos: uno 202, otro 409).
- Tabla community_deliveries (unique campaign+subscriber). Se envia solo a activos sin entrega; los fallidos se borran al reintentar, los enviados nunca se repiten. Lotes de COMMUNITY_BATCH_SIZE (20) con pausa COMMUNITY_BATCH_DELAY_MS (1000 en live, 0 en dry); contadores progresivos; una baja durante el envio se respeta en el siguiente lote.
- Estado final: `enviado` (todos ok), `parcial` (algunos fallaron: reintentar), `fallido` (todos fallaron). Al arrancar el servidor, `enviando` -> `parcial`.
- Correo: sin saludo extra del servidor; {{nombre}} en asunto y cuerpo; CR/LF eliminados del asunto; parte text/plain; cabeceras List-Unsubscribe y List-Unsubscribe-Post.
- Estados de campana: borrador, enviando, enviado, parcial, fallido. Botones: borrador (editar, eliminar, probar, enviar); parcial/fallido (reintentar); enviado (solo ver).

## Decisiones que necesita el usuario
1. Doble opt-in (confirmar por correo): NO implementado. Hoy cualquiera puede suscribir (o reactivar) un correo ajeno desde el footer.
2. Rol 5 (acceso temporal) no se toco; hoy requireAdminAccess solo admite roles 1 y 2.
3. Que correos autorizar en COMMUNITY_TEST_EMAILS (ademas del propio).
4. SMTP real y ritmo de lotes cuando se pase a produccion (proveedor y limites).
5. Registro del cliente: la casilla guarda el texto fijo "Acepto recibir comunicaciones de CRISCOM (casilla del registro)"; confirmar redaccion legal.
6. Los endpoints de auth devuelven `{msg}` (middleware compartido); la UI lee `message || msg`.

## Pruebas
Backend/__tests__/integration/community-logica.test.js (13 casos, nodemailer mockeado).

## Run OD (2026-10-10)
- Proyecto OD: `criscom-mkt-comunidad` ("Marketing - Comunidad y correos"). runId: `c0910457-ccb4-4464-ad08-2ca3c6fdbbf8` (conversacion `053665ed-92e0-42b6-b3f3-c89649c1f6ae`). Entregable esperado: `odd/opendesign/criscom-mkt-comunidad/index.html` (5-30 min). Brief: DESIGN.md + comunidad-data.json.
- Medicion actual (1440x900, sidebar expandida): pagina 2 699 px; cabecera 124, KPIs 110, redactor 480, campanas 454, miembros 1 327 (25 filas x 37 px); 0 filas de miembros en la primera pantalla; 13 objetivos < 44 px (todos 40 px); 1 degradado, 10 box-shadow. Movil 390: 3 802 px.
- Semillas (mantener para el port; entorno MAIL_MODE=dry): 25 miembros `seed-marketing+1..25@example.invalid` (ids 3-8 via API /subscribe, 9-27 via SQL; seed 7 sin nombre; fuentes footer/registro; bajas: +4, +11, +18 via PATCH baja). Campanas ids 2-5 con asunto `[seed] ...`: 2 enviado (22/22, dry), 3 parcial (19/22, 3 fallos simulados por SQL con error `[seed] Buzon no disponible (simulado)`), 4 y 5 borrador. Nota: /subscribe tiene limitador (~6 altas por ventana).
- Para retirar: DELETE community_deliveries/campaigns con asunto LIKE '[seed]%' y community_subscribers con email LIKE 'seed-marketing+%@example.invalid'.
