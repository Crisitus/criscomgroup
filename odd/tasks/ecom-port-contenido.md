# ecom-port-contenido — port a código de criscom-ecom-contenido (11/10/2026)

## Estado: done

Port de /blog, /blog/[slug], /libro-reclamaciones, /cambios-devoluciones, /terminos, /privacidad y app/sitemap.ts al diseño aprobado `odd/opendesign/criscom-ecom-contenido/`. Backups de los originales en `odd/backup/ecommerce/contenido/`.

## Archivos

- `Ecommerce/styles/contenido.css` (nuevo): scope `.pg-contenido`; tokens del sistema morado (globals.css); breakpoints del diseño (container query 600/900 del marco) mapeados a media queries. Sin gradientes, sombras ni backdrop-filter. Regla de impresión para la constancia (`body.pr-contenido` oculta chrome y cabecera).
- `Ecommerce/components/contenido/` (nueva carpeta):
  - `contenidoShared.tsx` — PageHead (h1 24/28 según lectura + bajada de una línea), Estado (icono + palabra), Alerta; importa contenido.css.
  - `Campos.tsx` — Campo (etiqueta arriba, pista, error por campo), Opcion (checkbox/radio de 44px, caja completa clicable), Honeypot ("website" oculto).
  - `legalData.ts` — texto LITERAL de términos y privacidad (verificado contra contenido-data.json: 0 diferencias, 6+6 secciones).
  - `LegalDoc.tsx` — índice sticky en desktop / desplegable en móvil, anclas s1..s6 con scroll-spy (IntersectionObserver) y aria-current, enlaces cruzados al cierre.
  - `BlogList.tsx` — cliente: skeleton / error con Reintentar / vacío / lista de filas clicables (chip, fecha dd/mm/aaaa, "Leer guía").
  - `LibroPage.tsx` — 3 bloques numerados + indicador de pasos, errores por campo + resumen con anclas, apoderado solo si es menor, constancia (código LR- y fecha límite grandes, fecha civil sin convertir zona, estado de correo, Imprimir con window.print), 409 con mensaje del servidor, 503 con tarjeta de módulo no disponible + Reintentar.
  - `CambiosPage.tsx` — pestañas en móvil (Nueva solicitud / Consultar seguimiento accesible desde el inicio), "Antes de enviar" plegado, formulario con cantidad (1-999, del contrato), botón deshabilitado con motivo escrito, éxito con código POS grande + "guárdalo", seguimiento con datos clave + línea de tiempo vertical y 404 genérico.
- `app/(public)/blog/page.tsx` — wrapper server (metadata) → BlogList.
- `app/(public)/blog/[slug]/page.tsx` — server: migas Blog / categoría, h1 28, fecha + chip, resumen UNA vez (si el primer párrafo del contenido ya lo repite, hace de entradilla), "Volver al blog" + único CTA "Ver catálogo". Sin enlace a /contacto.
- `app/(public)/blog/[slug]/not-found.tsx` — 404 "Guía no encontrada" (diseño s02b).
- `app/(public)/libro-reclamaciones/page.tsx`, `cambios-devoluciones/page.tsx`, `terminos/page.tsx`, `privacidad/page.tsx` — wrappers con metadata.
- `app/sitemap.ts` — sin rutas muertas (fuera: servicios, soluciones/*, especialidades/*, acerca-de, contacto, social); entran /importaciones (nueva ruta del writer de servicios) y /servicio-tecnico/seguimiento.

## Verificación observada

- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T ecommerce npx tsc --noEmit`: 0 errores en mis rutas (quedan errores de parseo de otros writers en components/checkout/CheckoutPage.tsx, components/servicios/ImportacionesForm.tsx, components/catalogo/CatalogoClient.tsx — fuera de superficie).
- `… exec -T ecommerce npx eslint "app/(public)/blog" "app/(public)/libro-reclamaciones" "app/(public)/cambios-devoluciones" "app/(public)/terminos" "app/(public)/privacidad" "app/sitemap.ts" "components/contenido"`: exit 0.
- Playwright (chromium_headless_shell-1243, contextos propios) 1440/1280/390 × claro/oscuro × 6 páginas = 36/36 OK: 0 gradientes, 0 box-shadow, 0 backdrop-filter, 0 objetivos < 44 px en .pg-contenido, sin overflow horizontal, h1 en x=112/32/16, 0 pageerror.
- Flujo real: /blog lista las 3 guías reales de la API (títulos, chips, fechas 28/09, 15/09, 02/09/2026); /blog/seed-marketing-elegir-laptop renderiza con migas/fecha/resumen único/CTA único; slug inexistente → 404 con la vista del diseño; estados del blog (skeleton 3 filas, error con Reintentar que recupera la lista, vacío) verificados interceptando la API.
- Libro: envío real de UNA hoja seed-ecom → 201 y constancia con LR-2026-000009, "Te respondemos a más tardar el 30/10/2026", fecha de registro 11/10/2026, aviso de correo "Enviado" (captura verificada). Reenvío idéntico → 409 con alerta warn y mensaje del servidor.
- Cambios: 390px con pestañas (y=244, h=44) y consulta visible a y=304 sin overflow; seguimiento POS inexistente → POST 404 → alerta genérica; formulario con correo inválido → POST 400 → resumen "Revisa 1 campo antes de registrar" + ancla #cb-email.
- Privacidad: 6 entradas de índice, 6 secciones, "Última actualización: 11/08/2026", ancla con sección activa; enlace "Contactar" → wa.me/51904589554 (config-publica); términos 390: índice desplegable navega a #s5.
- `curl http://localhost:3000/sitemap.xml`: 200, 46 URLs, 0 rutas muertas.

## Diferencias diseño vs backend / notas

- El contrato tipado de `ecommerceClaimService.create` omite `fecha_vencimiento` y `correo` del 201; el backend SÍ los devuelve y la constancia los usa (cast local en LibroPage; services/ecommerceApi.ts está fuera de superficie).
- El enlace "Contactar (/contacto)" del cierre de privacidad se redirige a WhatsApp (config-publica, wa.me/51904589554) con respaldo al inicio, por la eliminación aprobada de /contacto. El texto legal que menciona "contacto" queda literal (es el contrato).
- /seguimiento no existe: el sitemap refleja el seguimiento real /servicio-tecnico/seguimiento; /seguimiento-solicitud solo tiene página por código (sin índice, no va al sitemap). /solicitud-importacion sigue viva (la nav la enlaza) y convive con la nueva /importaciones.
- El scroll-spy puede marcar la sección siguiente si la clicada es corta y ambas entran en la banda de IntersectionObserver (comportamiento estándar; hash y ancla correctos).
- Modo oscuro: globals.css fuerza `span { color: #C0C0C0 !important }` fuera de .pg-home/.pg-chrome; en .pg-contenido NO se usan spans (texto en línea con <i>, <b>, <small>) — fix de oscuro dentro de mi CSS sin tocar globals.css.

## Pendientes / riesgos

- Otros writers tienen errores de parseo en curso (servicios, catálogo, checkout): cuando su sintaxis rompe, Turbopack devuelve 500 en TODAS las rutas, incluidas estas. Se destrabó con `docker compose … restart ecommerce` (gotcha conocido del montaje :delegated + WATCHPACK_POLLING). Si vuelve a pasar, no es de este port.
- Limpieza posterior: el seed de la reclamación (LR-2026-000009) cuando se depuren los seed-ecom.

## Seeds (marca seed-ecom)

- Libro de reclamaciones: 1 hoja, código LR-2026-000009, correo seed-ecom+contenido@example.invalid, detalle con marca "seed-ecom" (el reenvío idéntico fue rechazado por 409: no creó otra).
- Cambios: ningún registro creado (solo 400 de validación y 404 de consulta; no hubo 201).
