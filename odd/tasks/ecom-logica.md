# ecom-logica - corrección de lógica backend ecommerce (fase previa al rediseño)

Repo /Users/soulkin/Downloads/criscom-web-main (sin git), cwd = raíz. Español.
Método: odd/tasks/admin-logica-instrucciones.md (auditoría -> fix -> jest en contenedor con candado).
Decisión de ruta: delegada (1 writer, secuencial). Sin git: respaldos en odd/backup/ecommerce/.

## Objetivo
Dejar el backend público del ecommerce listo para el rediseño landing/ecommerce aprobado (estructura de 27 -> 20 rutas, home con banners/categorías/ofertas/blog/tarjetas/comunidad conectados).

## Tareas

### T1. Endpoint público de empresa + eliminar hardcodes
- Nuevo `GET /api/ecommerce/config-publica` (sin auth): nombre comercial, dirección, horario, teléfono/WhatsApp y redes (tomando whatsapp/redes de social_links). SOLO campos públicos seguros; JAMÁS secretos, RUC interno ni credenciales SUNAT/Culqi.
- Front Ecommerce: eliminar hardcodes `51904589554` / `+51 904 589 554` / correo literal en hooks/useSocialLinks.ts, components/layout/Footer.tsx, app/(public)/page.tsx, app/(public)/soluciones/[slug]/page.tsx y cualquier otro que aparezca en grep. Centralizar en un hook/servicio que consuma el endpoint (con caché).
- Aceptación: jest del endpoint (200 con campos, sin secretos) + grep 0 hardcodes del número/correo en Ecommerce/ (salvo seeds/tests).

### T2. Unificar ofertas + vigencia opcional
- Fuente de verdad única: tabla `ofertas` + columnas `vigente_desde`/`vigente_hasta` NULL (NULL = sin vencimiento). Cambio de esquema SOLO por el mecanismo de migración existente del repo; PROHIBIDO sync({force})/DROP/TRUNCATE/DELETE masivo.
- `producto.es_oferta`/`precio_oferta` = caché derivado mantenido por el servicio al asignar/quitar oferta (write-through); documentar en el informe.
- `/api/ofertas-del-dia` queda como curaduría/orden sobre ofertas vigentes (no duplica precio/descuento).
- `GET /api/ecommerce/ofertas` y catálogo: solo ofertas vigentes (hoy dentro de [desde, hasta]).
- Aceptación: jest de vigencia (vigente, futura, vencida, NULL) + regresión de suites de productos/ofertas.

### T3. mis-solicitudes real
- Implementar `GET /api/ecommerce/mis-solicitudes` (auth cliente): agrega solicitudes de servicio técnico, importación y ensamble del cliente autenticado, con tipo, código, estado y fecha; paginado. Reemplaza el stub 200 vacío.
- Aceptación: jest (lista propia, vacío, no ve las de otro cliente, 401 sin token).

## Constraints
- Jest SOLO en contenedor con candado /tmp/jest.lock (ver ESTADO-SESION.md Herramientas). NODE_ENV=test NO cambia de BD.
- PROHIBIDO enviar nada real a SUNAT/Culqi/correo. Datos de prueba con marca 'seed-ecom'.
- Ninguna llamada de herramienta > ~4 KB. Tildes: python3+heredoc o constantes.
- No tocar Frontend/ (ERP) salvo lectura.

## Progreso
- [x] T1 — backend + 18 archivos Ecommerce/ migrados a config-publica (grep 0). EXCLUIDOS por decisión del usuario (opción 2, chequeo "usuario maestro" por correo literal, pendiente de decisión global): app/(public)/mi-cuenta/page.tsx, app/(public)/iniciar-sesion/page.tsx, components/layout/Header.tsx, services/ecommerceApi.ts
- [x] T2 — vigencia opcional + write-through; suites nueva y regresión en verde
- [x] T3 — mis-solicitudes real con auth/paginación; suite en verde

## Runs OD ecommerce

Lanzados el 2026-10-11 (rediseño total del ecommerce, 3 proyectos Open Design):
- `criscom-ecom-home` (Criscom ecommerce - Home; landing + chrome global navbar/footer): runId `2d7fe9b0-950c-4e52-b6cf-4c6a00495d3e` — running.
- `criscom-ecom-catalogo` (Catálogo y producto; /catalogo + /producto/[id]): runId `2254efa5-98e0-49f7-bb3b-789f6da0f457` — running.
- `criscom-ecom-checkout` (Checkout y confirmaciones; /checkout + /order-confirmation/[n] + /payment-success + /payment-error): runId `3db5bd68-67d7-46c3-b7d9-3657af6847b6` — running.

Seeds creados (limpiar luego): tabla `tarjetas` ids 1-3 con prefijo «seed-ecom | » (la API de marketing está apagada en dev, FEATURE_MARKETING off; se insertaron directo en BD con charset utf8mb4 tras un primer intento doble-codificado que se corrigió con UPDATE).

## Runs OD ecommerce (cuenta, servicios, contenido)
Fecha 11/10/2026. criscom-ecom-cuenta: run b2e8c5c1-b523-458a-90d4-67e5fcf6f5b9 (conv 59b6d850-37f1-45ef-bdba-0f13f112bfdb). criscom-ecom-servicios: run 5670335d-27c1-49c5-a3fb-e7aa44bf754f (conv 86caae03-193a-4067-9304-c89483efc2c9). criscom-ecom-contenido: run 4a331ad6-4ebf-46e0-8d58-2c5b67eef82b (conv 4dbd51c8-2b60-40b9-b0ae-33fd1f512a53).


## Port home (2026-10-11)

- Home + chrome global portados desde `odd/opendesign/criscom-ecom-home/` (navbar, hero carrusel, categorías, ofertas, «¿Qué necesitas?», tarjetas, blog, comunidad, footer). CSS propio: `Ecommerce/styles/chrome.css` (.pg-chrome) y `Ecommerce/styles/home.css` (.pg-home); tokens morados en `app/globals.css` (claro+oscuro; el cyan sale del chrome/home; `--secondary` queda #743AB4 para no romper páginas pendientes).
- Entrada fina: `app/(public)/page.tsx` → `components/home/HomePage.tsx` + secciones por archivo; servicios en `services/homeService.ts` (banners con `whatsapp`/`orden`, tarjetas, blog, estadísticas, suscripción con `fuente:"home"`).
- Navbar: mega-menú de Catálogo por clic/teclado (Esc cierra), WhatsApp config-driven, carrito localStorage con contador, menú de cuenta (Mi cuenta, Mis pedidos, Mis solicitudes, ERP rol 3/maestra, Salir). SalesAccessBar eliminada (accesos absorbidos).
- Borrados (respaldo en `odd/backup/ecommerce/home/`): `app/(public)/{servicios,soluciones,especialidades,acerca-de,contacto,social}/`, `app/admin/`, `components/layout/SalesAccessBar.tsx`. Todas devuelven 404 sin romper el build.
- Desviaciones del diseño (backend/rutas reales mandan): enlaces de categoría/ofertas usan `/catalogo?categoria=<id>` y `/catalogo?ofertas=1` pero el catálogo actual SOLO lee `?search` (filtros pendientes para el writer de Catálogo); footer Ayuda enlaza «Mis solicitudes» → /mis-solicitudes porque /seguimiento-solicitud no tiene página índice (404) y /seguimiento no existe (fusión pendiente de otro writer); botón flotante de WhatsApp se conserva config-driven por instrucción del orquestador (las NOTAS del diseño proponían quitarlo); el logo nuevo (`logo-criscom.png`) tiene fondo blanco opaco horneado y en oscuro se ve como parche claro — falta variante con transparencia/oscura de marca.
- `app/sitemap.ts` y los enlaces `/contacto` de `blog/[slug]` y `privacidad` quedan FUERA de superficie: reportados al orquestador (referencian rutas muertas). `components/admin/` queda huérfano tras borrar `app/admin/`.
- Verificación: tsc 0 / eslint 0 en contenedor; Playwright 1440/1280/390 claro+oscuro: 0 degradados, 0 backdrop-filter, 0 sombras fuera de menús, 0 objetivos <44px en .pg-*, sin overflow, sin pageerror; flujo real OK (mega-menú 7 categorías, Agregar suma al carrito, suscripción 201 con consentimiento, sesión de cliente, carrusel con video+Pausar). Suscripción de prueba sembrada: `seed-ecom+port-home@example.invalid` (marca seed-ecom, fuente home). Medidas: navbar 64px, hero 460px en y=88, primera sección de valor a y=548, footer 360px, home 3337px desktop / 5216px móvil (el diseño estimaba ~3100/~4300; la diferencia sale del footer legal completo y las 8 tarjetas de oferta reales).
- Gotcha del entorno: `next dev` en el contenedor (montaje `:delegated` + WATCHPACK_POLLING) sirvió globals.css viejo tras editarla; se destrabó con restart + touch + recompile (verificar el chunk compilado con grep `--primary:#4b2281`, no confiar en el primer render).
