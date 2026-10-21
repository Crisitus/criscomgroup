# Marketing - Blog y contenidos: logica de negocio

## Arreglos hechos
- Handlers async envueltos (`safe`): errores reales de BD -> 500 JSON `{message}`; 409 para slug duplicado por carrera.
- Listados (publico y admin) excluyen `contenido`; `GET /admin/:id` devuelve el post completo.
- `publicado_en` se conserva al despublicar/republicar; es editable (ISO) y permite programar (futuro = no sale en /public).
- Fechas de respuesta: ISO con offset `-05:00` (Lima). Ojo: con MySQL el servidor lee las fechas como hora de pared; se serializa sin shift extra (ver `iso()`); tras crear/actualizar se hace `reload()` para que la salida venga siempre de la BD. Antes el ISO salia con `Z` y 5 h corrido.
- Validacion por campo + `message` general + `errores:{campo:msg}`. Resumen > 320 ya no se trunca en silencio.
- Slug: colision -> sufijo `-2`, `-3`... con `aviso_slug`; slug vacio (titulo no latino) -> 400 `errores.slug`; en post publicado el slug NO cambia salvo `cambiar_slug:true` (si no, se mantiene y se devuelve `aviso_slug`). No se guarda redireccion.
- Categoria normalizada (acentos/mayusculas): reutiliza la grafia existente; `GET /admin/categorias`.
- Auditoria (`registrarAuditoria` + `capturarEstadoOriginal`) en crear/actualizar/eliminar (tabla `blog_posts`). DELETE ahora responde 200 `{message}` (con 204 el middleware no registra).

## Contrato API (`/api/blog`)
Publico (sin auth, contrato Ecommerce intacto):
- `GET /public` -> array `{id_post, slug, titulo, resumen, imagen_url, categoria, palabras_clave, estado, publicado_en, creado_en, actualizado_en}` (sin `contenido`, sin `autor_id`), solo `estado=publicado` y `publicado_en <= ahora`, orden `publicado_en DESC`.
- `GET /public/:slug` -> igual + `contenido`; 404 si no publicado/futuro.
Admin (roles 1 y 2, area marketing):
- `GET /admin?q&estado&categoria&limit&offset` -> array sin `contenido`, header `X-Total-Count`; limit max 200 (sin limit = todos).
- `GET /admin/:id` (completo) - `GET /admin/categorias` -> `string[]`.
- `POST /admin` -> 201 post (+`aviso_slug`); `PUT /admin/:id` (campos parciales OK) ; `DELETE /admin/:id` -> 200.
- Cuerpo: `titulo, slug?, resumen, contenido, imagen_url?, categoria?, palabras_clave?, estado, publicado_en?, cambiar_slug?`.
- Error: `{message, errores?:{campo:msg}}` (400 validacion, 404, 409, 500).

## Reglas de campos
titulo 5-180 | slug 3-180 (a-z0-9-) | resumen 20-320 | contenido >= 80 | imagen_url vacia, `https://...` o `/uploads/...` (<=500) | categoria <= 80, default Tecnologia | estado `borrador|publicado`.
Estados: borrador; publicado (publicado_en pasado = visible; futuro = programado). El frontend marca "programado".

## Decisiones necesarias del usuario
1. Rol 5 (auditor): hoy no accede al blog (solo roles 1 y 2); no se cambio. Decidir si puede ver (solo lectura).
2. Redireccion 301 de slugs antiguos: hoy solo se avisa; requeriria tabla/campo nuevo (fuera de alcance).
3. Programacion: no hay cron; la visibilidad es por fecha en consulta (sirve), pero sitemap/Ecommerce con cache no se invalida solo al llegar la hora.
4. `registro_id` de auditoria en "crear" queda NULL (limitacion del middleware compartido).
5. Escribir contenido como texto plano vs Markdown/HTML: sin definir (no hay sanitizacion HTML; Ecommerce decide el render).

## Brief para el rediseno
Pantalla: listado con filtros (busqueda, estado, categoria), paginacion por X-Total-Count, chips estado (borrador/publicado/programado), editor con errores por campo, contador de resumen, selector de fecha (hora Lima), aviso de cambio de slug, dialogo de borrado, estados de carga/error/vacio.

## Run OD
- Proyecto OD: `criscom-mkt-blog` ("Marketing - Blog y contenidos"). runId `d9787925-2ff9-446e-9ddc-90960267c20a` (lanzado 10/10/2026; 5-30 min; no esperado).
- Brief: `odd/opendesign/criscom-mkt-blog/DESIGN.md` + `blog-data.json`; generador `odd/tools/brief_mkt_blog.py`; prompt `odd/tmp/prompt-mkt-blog.txt`.
- Semillas (API, slug `seed-marketing-*`, se conservan para el port): id 2 elegir-laptop (publicado 02/09), 3 ssd-nvme-sata (publicado 15/09), 4 mantenimiento-pc (publicado 28/09), 5 impresoras-tinta-laser (borrador), 6 proteger-wifi (borrador), 7 black-friday-2026 (programado, 20/11/2026 9:00), 8 monitores-diseno (borrador, titulo largo 150 car.). Categorias: Laptops, Redes, Servicio tecnico.
- Medido (actual): 1440 main 1168x1754, contenido 1072, 0 filas visibles (lista empieza en y=1067); 1280 main 1008, pagina 1842; 390 lista en y=1266, h1 64 px; 22/24 controles <44 px, 1 degradado, 3 sombras.
