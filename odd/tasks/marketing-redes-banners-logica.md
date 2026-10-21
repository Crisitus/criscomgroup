# Redes y banners - correccion de logica (antes de Open Design)

## Objective
Banners y redes sociales funcionales (CRUD completo, orden, publicar/ocultar, redes editables) antes del rediseno.

## Estado (2026-10-10)
- [x] 1 Banners montados siempre en /api/marketing (tarjetas siguen tras FEATURE_MARKETING, dentro del router).
- [x] 2 createBannerCarrusel envia titulo/orden/activo/whatsapp (buildBannerForm comun).
- [x] 3 Errores: multer/fileFilter -> JSON 400 `{message}`; servicios usan getApiErrorMessage (message > error > 403 > respaldo). Mensaje de formato lista imagenes y videos.
- [x] 4 Upload: extension forzada por MIME; magic bytes jpeg/png/webp/avif/mp4/webm; archivo viejo se borra DESPUES del save; archivo nuevo se borra si falla el alta/edicion.
- [x] 5 Redes: se pueden vaciar instagram/facebook/tiktok/youtube (guarda '' y se sirve '' con ??; null = nunca configurado -> default), WhatsApp 9 digitos -> 51 + digitos, auditoria 'social_links', mas hosts, siempre HTTPS. Errores con `message` y `error`.
- [x] 6 Rutas legacy /marketing/banner* eliminadas (solo las usaba BannerManager muerto). PATCH /banners/:id/whatsapp ahora usa :id.
- [x] 7 PATCH /banners/reordenar y PATCH /banners/:id/activo.
- [x] 8 /ecommerce/banner (singular) solo activos (orden ASC); URL absoluta usa PUBLIC_BASE_URL en ambos controllers.
- [ ] 9 NO tocado (fuera de alcance): numero de WhatsApp fijo en el hero del Ecommerce (`Ecommerce/app/page.tsx` ~:505 y ~:547). Debe leer `useSocialLinks().whatsapp_number`.
- Frontend minimo: BannerListManager (crea con campos, dialogo de confirmar eliminar, handleNew resetea seleccion, errores del backend); SocialLinksPage (Guardar deshabilitado si fallo la carga + Reintentar). Borrados (respaldo en odd/backup/marketing/): MarketingPage, TarjetasManager, BannerManager, SocialBannersPage. La ruta /marketing en App.tsx queda como redireccion a /social-links.
- Tests: Backend/__tests__/integration/banners-redes-logica.test.js (9) + content-admin (2); vitest marketingService (7) + SocialLinksPage (1).

## Decisiones que necesita el usuario
1. Rol 5 (auditor): hoy no entra a marketing (rutas [1,2]); no se cambio nada global. Decidir si puede ver (solo lectura) banners y redes.
2. Rol 3: `verificarHorarioOArea("marketing")` en escritura de banners; confirmar que sigue vigente la restriccion de horario/area.
3. El WhatsApp por banner (campo `whatsapp`) no lo usa ningun consumidor publico: eliminar o dejar para el rediseno.
4. Tarjetas (/marketing/tarjetas): sin UI; siguen solo con FEATURE_MARKETING. Decidir si se retiran.
5. Si el usuario deja una red vacia, la web publica oculta el icono (el hook mezcla `{...DEFAULT, ...data}` y '' pisa el default). Confirmar que es lo deseado.

## Brief de datos para el rediseno
Base: `/api/marketing` (JWT; roles 1,2; escritura rol 3 por horario/area). Todas las respuestas de error: `{ message }`.
- GET /banners -> `[Banner]` ordenado orden ASC, creado_en DESC (incluye inactivos).
- GET /banners/:id -> Banner | 404.
- POST /banners (multipart): `imagen_banner` (obligatorio), `titulo` (<=120), `orden` (0..9999), `activo` ('true'/'false', default true), `whatsapp`. 201 `{message, banner}`.
- PUT /banners/:id (multipart, archivo opcional) mismos campos. 200 `{message, banner}`.
- PATCH /banners/:id/activo `{activo:boolean}` -> `{message, banner}` (400 si no es booleano).
- PATCH /banners/reordenar `{orden:[{id,orden}]}` (1-200, sin repetidos, orden 0..9999) -> `{message, banners}`; 404 si falta algun id.
- DELETE /banners/:id -> 200 `{message}` (borra el archivo despues de borrar el registro).
- PATCH /banners/:id/whatsapp `{whatsapp}`.
- Banner: `{id_banner, imagen_url (absoluta), media_type 'image'|'video', titulo|null, activo, orden, whatsapp|null, creado_en, actualizado_en}`.
- Publico (no cambiar): GET /api/ecommerce/banners (solo activos, orden ASC, creado_en DESC); GET /api/ecommerce/banner (el primero activo); GET /api/social-links (5 claves).
- Redes: GET/PATCH /api/social-links/admin (roles 1,2). Claves: instagram_url, facebook_url, tiktok_url, youtube_url, whatsapp_number. '' vacia una red. Hosts HTTPS permitidos: instagram.com(+www,m), facebook.com(+www,m,web)/fb.com/fb.me, tiktok.com(+www,m,vm,vt), youtube.com(+www,m,music)/youtu.be. WhatsApp: solo digitos 8-15; 9 digitos se prefija 51. 422 con `{message,error}`.

## Reglas y estados
- Estados de banner: Publicado (activo) / Oculto; el orden menor sale primero; tomar el siguiente numero libre al crear.
- Limites: imagen <= 8 MB (JPG/PNG/WebP/AVIF), video <= 30 MB (MP4/WebM). Tope de multer 30 MB. La firma del archivo debe coincidir con el formato.
- Eliminar exige confirmacion (dialogo). Reordenar con arrastre debe llamar a /banners/reordenar una sola vez por soltar.
- Medidas sugeridas para el carrusel del Ecommerce: 16:9 (p. ej. 1920x1080), peso objetivo < 400 KB; texto importante lejos de los bordes (recorte object-cover).

## Run OD
- Proyecto OD: `criscom-mkt-redes` ("Marketing - Redes y banners"); runId `627410db-8438-4dd0-a3cf-bf724fc9d20d` (lanzado 2026-10-10, modelo claude-sonnet-5-5). Brief: `odd/opendesign/criscom-mkt-redes/DESIGN.md` + `redes-data.json`; generador `odd/tools/brief_mkt_redes.py`.
- Seeds creados via API (titulo 'seed-marketing ...', se conservan para el port): banners id 3 (imagen, orden 1, publicado), 4 (imagen, orden 2, publicado), 6 (video mp4, orden 3, publicado), 5 (imagen oculta, orden 4). Archivos fuente en /tmp/mktseed (efimeros). Un intento de video subido sin Content-Type correcto fue rechazado (400) y no dejo registro.
- Redes: NO se modificaron; valores originales: instagram criscomgroup, facebook profile.php?id=61572916207328, tiktok @criscomgroup, youtube '', whatsapp 51904589554.
