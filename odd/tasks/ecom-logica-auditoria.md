# ecom-logica — auditoría previa (T1, T2, T3)

Fecha: 2026-10-11. Repo sin git; respaldos en `odd/backup/ecommerce/`.

## T1 — Qué hay hoy

- `GET /api/social-links` (público, `social_links.controller.js`) devuelve redes + `whatsapp_number` de la empresa primaria (`emisor_predeterminado` DESC, `id_company` ASC), con `DEFAULT_LINKS` en backend (incluye el número real como fallback de ERP). No expone dirección, horario ni nombre comercial.
- No existe endpoint público de empresa. `Company.toJSON` ya oculta `sol_user`, `sol_pass`, `cert_path`, `client_secret` (patrón a respetar).
- Hardcodes en `Ecommerce/` (grep `51904589554` / `904 589 554` / `cristophercalioro@gmail.com`): 17 archivos. Los 4 autorizados para editar son `hooks/useSocialLinks.ts`, `components/layout/Footer.tsx`, `app/(public)/page.tsx`, `app/(public)/soluciones/[slug]/page.tsx`. El resto queda fuera de las superficies permitidas y se reporta aparte (ver "Pendiente fuera de superficie").
- `useSocialLinks.ts` tiene fallback hardcodeado (`DEFAULT_SOCIAL_LINKS` con el número). Contrato nuevo: fallback = no mostrar el dato.
- La empresa no tiene campo email público: el correo literal del footer/contacto no tiene fuente en backend. Decisión: el endpoint no expone email y el front deja de mostrarlo (no inventarlo).

## T2 — Cómo conviven las ofertas hoy (flujo real)

- Tabla `ofertas`: `id_oferta`, `id_producto` (único), `descuento`, timestamps. Sin vigencia.
- `producto.es_oferta` / `precio_oferta` / `precio_oferta_con_igv`: caché derivado que YA se mantiene write-through desde `ofertas.service.js` (`aplicarOfertas`, `quitarOferta`, `reconciliarOfertas`), en la misma transacción que la fila `ofertas`.
- Escrituras: `PUT /api/ofertas-del-dia` (lote atómico), `POST /api/productos/asignar-oferta` (delega en el mismo servicio), DELETE individual/lote. Todas pasan por `ofertas.service`. Bien: no hay duplicación de lógica de escritura.
- Lecturas públicas: `GET /api/ecommerce/ofertas` y catálogo (`getProducts`, `getProductById`) leen el caché `es_oferta`/`precio_oferta_con_igv` del producto. `/api/ofertas-del-dia` (GET, solo admin) devuelve las filas `ofertas` + nombre/precio del producto (curaduría; no duplica precio de oferta).
- Roto/ausente: no hay vigencia; una oferta vive hasta que alguien la quite manualmente. `reconciliarOfertas` recrea filas desde el caché (mantenerlo compatible con vigencia NULL).

## T3 — Qué hay hoy

- Stub: `GET /api/ecommerce/solicitudes-importacion/mis-solicitudes` devuelve `[]` fijo (`ecommerce.routes.js:96`); test en `ecommerce-stubs.test.js`. El front (`mis-solicitudes/page.tsx`) llama a un stub local de `ecommerceApi.ts` que ni siquiera pega al backend.
- Vínculo cliente↔solicitud (investigado en los 3 modelos): `solicitudes_importacion.email_solicitante` + `id_usuario` (nullable, "futura integración"); `solicitudes_ensamble.email_solicitante` + `id_usuario` (nullable); `solicitudes_servicio.email` (sin id_usuario). Las solicitudes se crean SIN auth (flujo público), así que `id_usuario` casi siempre es NULL: el filtro real es **email del usuario autenticado** (normalizado a minúsculas) contra `email_solicitante`/`email`, más `id_usuario` cuando exista. El JWT de cliente (`optionalUser` en pedido.controller) solo trae `id` e `id_role`: hay que leer el email desde `users`.
- Patrón de auth a reutilizar: `optionalUser` de `pedido.controller.js` (`GET /api/pedidos/mis-pedidos`), 401 sin token válido.

## Contrato final

### T1 — `GET /api/ecommerce/config-publica` (sin auth)
200 →
```
{ "nombre_comercial": string, "direccion": string|null,
  "horario": { "inicio": "HH:MM", "fin": "HH:MM" },
  "telefono": string|null, "whatsapp_number": string|null,
  "redes": { "instagram_url": string, "facebook_url": string,
             "tiktok_url": string, "youtube_url": string } }
```
- Fuente: empresa primaria (misma que social-links). `telefono` = `whatsapp_number` (único teléfono que tiene el modelo). Redes/whatsapp con los mismos defaults de ERP que `/api/social-links` (consistencia entre endpoints públicos).
- NUNCA: ruc, sol_user/sol_pass, cert_path, client_id/client_secret, series SUNAT, id_user. `Cache-Control: public, max-age=300`.
- Front: `services/configPublicaService.ts` (fetch con caché de módulo) + `useSocialLinks` consume el endpoint; fallback = vacío/ocultar.

### T2 — Vigencia de ofertas
- `ofertas` gana `vigente_desde` / `vigente_hasta` (DATETIME, NULL = sin límite) vía `addMissing` en `ensure-commerce-schema.js` (mecanismo idempotente existente).
- `PUT /api/ofertas-del-dia` acepta `vigente_desde`/`vigente_hasta` opcionales por ítem (ISO 8601; error 422 si fecha inválida o `desde > hasta`). `POST /api/productos/asignar-oferta` queda como estaba (oferta sin vencimiento).
- Invariante: `producto.es_oferta`/`precio_oferta*` son caché SOLO de ofertas vigentes ahora. `ofertas.service.sincronizarVigenciaOfertas()` (idempotente) limpia el caché de ofertas vencidas/no iniciadas y lo repone de vigentes; lo invocan las lecturas públicas (`/api/ecommerce/ofertas`, catálogo, detalle) = write-through "al vencer".
- `GET /api/ofertas-del-dia` (admin) incluye `vigente_desde`/`vigente_hasta` y flag `vigente` por fila (curaduría; sin duplicar precio/descuento).
- `GET /api/ecommerce/ofertas` y catálogo: solo ofertas vigentes (hoy dentro de [desde, hasta], NULL abierto).

### T3 — `GET /api/ecommerce/mis-solicitudes` (auth cliente JWT)
- Query: `page` (def 1), `limit` (def 10, máx 50). 401 sin token.
- 200 → `{ "success": true, "data": [{ "tipo": "importacion"|"ensamble"|"servicio", "codigo": string, "estado": string, "fecha": ISO }], "paginacion": { "pagina", "limite", "total", "paginas" } }` ordenado por fecha DESC.
- Filtro: `LOWER(email_solicitante|email) = LOWER(user.email)` OR `id_usuario = user.id`. El alias legado `/solicitudes-importacion/mis-solicitudes` apunta al mismo handler (reemplaza el stub; se actualiza `ecommerce-stubs.test.js`).

## Decisiones aplicadas por defecto

1. Email público: no existe en el modelo Company → el endpoint no lo expone y el front deja de mostrar el correo literal (fallback = no mostrar).
2. `telefono` = `whatsapp_number` (único teléfono del modelo).
3. Redes/whatsapp conservan los defaults de ERP de `/api/social-links` para que ambos endpoints públicos digan lo mismo; el front nunca hardcodea (si llega vacío, oculta).
4. Vigencia vía `PUT /ofertas-del-dia` únicamente; `asignar-oferta` (producto.controller) no se toca → crea ofertas sin vencimiento (NULL), comportamiento compatible hacia atrás.
5. Limpieza de caché al vencer: en lectura pública (sincrónica, idempotente), no con cron, para no añadir procesos nuevos.
6. Filtro de mis-solicitudes por email (las solicitudes se crean sin auth; `id_usuario` casi siempre NULL) + `id_usuario` cuando exista.
7. `reconciliarOfertas` sigue recreando filas sin vigencia (NULL) cuando parte del caché; documentado, sin cambio de comportamiento.

## Pendiente fuera de superficie (reportado al orquestador)

Grep de hardcodes del número/correo en Ecommerce/ también da positivo en archivos NO autorizados: `app/layout.tsx`, `app/(public)/{acerca-de,contacto,catalogo,mi-cuenta,mis-pedidos,iniciar-sesion,payment-success,payment-error,order-confirmation/[numeroPedido],producto/[id]}/page.tsx`, `app/(public)/layout.tsx`, `components/ui/ProductModal.tsx`, `components/layout/{Header,CartDropdown,SalesAccessBar}.tsx`, `services/ecommerceApi.ts` (este último además usa el correo como chequeo de "usuario maestro"). Sin ampliar superficies no se puede llegar a grep 0.

## Resultados de verificación (2026-10-11)

- `jest ecom-config-publica.test.js`: PASS (2/2) — 200 con campos; 0 secretos (ruc/sol_*/cert/client_*/series/sunat).
- `jest ecom-ofertas-vigencia.test.js`: PASS (6/6) — vigente, futura, vencida (limpia caché en lectura), NULL, rechazo de vigencia inválida, GET admin con flag `vigente`.
- `jest ecom-mis-solicitudes.test.js`: PASS (5/5) — 401 sin token, lista propia case-insensitive, no ve la de otro, vacío, paginación.
- Regresión: `ofertas-logica` 8/8, `productos` 9/9, `ecommerce-stubs` 9/9, `pedidos` 8/8, `solicitudes-importacion`+`carrito` 15/15, `no-console-log` 1/1, `boot` 3/3 — todo PASS.
- Front: `tsc -p tsconfig.json --noEmit` (contenedor ecommerce): 0 errores.
- Grep `51904589554|904 589 554|cristophercalioro` en los 5 archivos de la superficie (useSocialLinks, Footer, page, soluciones/[slug], configPublicaService): 0 ocurrencias.
- Grep en todo Ecommerce/: SIGUEN 13 archivos fuera de la superficie permitida (listados arriba) → decisión del orquestador.
- Datos de prueba: solo en DB de test (sync force); marcados 'seed-ecom'. Nada sembrado en erp_computacion.

## Cierre T1 — migración de los 13 archivos restantes (decisión del usuario: opción 2)

Migrados a `configPublicaService` (mismo patrón: config-driven, ocultar si no hay dato, sin inventar fallback):
- `app/layout.tsx` (JSON-LD telephone vía `getConfigPublicaServer`, campo omitido si no hay número; layout async).
- `app/(public)/layout.tsx`, `components/layout/SalesAccessBar.tsx`, `components/layout/CartDropdown.tsx`, `components/ui/ProductModal.tsx`, `app/(public)/{acerca-de,catalogo,mis-pedidos,payment-success,payment-error,order-confirmation/[numeroPedido],producto/[id]}/page.tsx` (hook `useConfigPublica` + `buildWhatsAppUrl`/`formatTelefono`).
- `app/(public)/acerca-de/page.tsx` y `app/(public)/contacto/page.tsx`: tarjetas/bloques de EMAIL eliminados (la empresa no tiene email público; no se inventa).
- Nuevo helper server `getConfigPublicaServer()` (BACKEND_INTERNAL_URL, revalidate 300); `soluciones/[slug]` refactorizado para usarlo (sin `headers()`, no fuerza render dinámico).

EXCLUIDOS (pendiente de decisión global sobre el literal del correo maestro — es lógica de privilegio, no de contacto):
- `app/(public)/mi-cuenta/page.tsx`, `app/(public)/iniciar-sesion/page.tsx`, `components/layout/Header.tsx`, `services/ecommerceApi.ts`.

Verificación final:
- `grep -rln "51904589554|904 589 554|904589554|cristophercalioro" app components hooks lib services utils contexts config`: SOLO los 4 excluidos.
- `tsc -p tsconfig.json --noEmit` (contenedor ecommerce): exit=0, 0 errores.
