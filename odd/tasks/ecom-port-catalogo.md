# Port a código - criscom-ecom-catalogo (/catalogo + /producto/[id])

Estado: **done**. 11/10/2026.

## Qué se hizo

El writer anterior dejó `Ecommerce/components/catalogo/*` y `Ecommerce/styles/catalogo.css` creados pero con
errores de parseo (500 global en dev server) y las páginas de entrada viejas. Este port:

1. **Arreglados los errores de parseo** de `CatalogoClient.tsx` (paréntesis desbalanceado en la línea de
   resultados, JSX roto en `rs`) y un bug de lógica: `patch()` siempre forzaba `page: 1`, lo que rompía la
   paginación por completo (ahora `page: p.page ?? 1`).
2. **Entrada fina** `app/(public)/catalogo/page.tsx`: server component con `metadata` + `Suspense` ->
   `CatalogoClient`. La página vieja (1685 líneas) quedó respaldada.
3. **Detalle** `app/(public)/producto/[id]/page.tsx` fino -> `components/producto/ProductoDetail.tsx` +
   `ProductoGallery.tsx` (nuevos). Sin "ID: N" ni "12 mes(es)" crudos ("Garantía de 12 meses"), galería con
   placeholder plano si la imagen falta o está rota (onError -> icono de categoría), precio con miles,
   oferta con tachado y %, stock icono+palabra, `estado_observaciones` solo en segunda mano, relacionados
   en cliente (misma categoría, máx 4, excluye el actual) con `CatCard` + quick-view, CTA WhatsApp
   config-driven (`useConfigPublica` + `waHref`, oculto si vacío), acciones fijas abajo en móvil (`.mbar`),
   404 con "Volver al catálogo". `layout.tsx` (SEO + JSON-LD) intacto.
4. **`styles/catalogo.css` importado explícitamente** desde `CatalogoClient` y `ProductoDetail`
   (`import "@/styles/catalogo.css"`) - sin el import el checklist visual fallaba masivo. Añadidas reglas
   de galería (`.gal`/`.thumbs`/`.th` de 56px) y el **fix de oscuro**: `globals.css` fuerza
   `.dark span:not(.pg-home *):not(.pg-chrome *) { color:#C0C0C0 !important }` (especificidad 0-3-1);
   dentro de `.pg-catalogo` se neutraliza con `.dark span:is(.pg-catalogo *):not(...) { color:inherit !important }`
   (0-4-1, patrón de `cuenta.css`) y se repintan los spans con color propio (`.st.*`, `.off`, `.pr-old`,
   `.cnt`, `.tile`, `.bx`, etc.).

## Archivos

- `Ecommerce/app/(public)/catalogo/page.tsx` - reescrito (entrada fina).
- `Ecommerce/app/(public)/producto/[id]/page.tsx` - reescrito (entrada fina).
- `Ecommerce/components/catalogo/CatalogoClient.tsx` - parseo + paginación + import CSS + wrapper redundante.
- `Ecommerce/components/catalogo/CatFilters.tsx` - X de la hoja como icono lucide (eslint unused import).
- `Ecommerce/components/catalogo/{CatCard,CatQuickView,CatStates,catShared}` - tipografía normalizada (escapes `\u` -> caracteres reales).
- `Ecommerce/components/producto/ProductoDetail.tsx`, `ProductoGallery.tsx` - nuevos.
- `Ecommerce/styles/catalogo.css` - galería + fix oscuro.
- Backups ya existentes en `odd/backup/ecommerce/catalogo/` (pre-port, del writer anterior): no se regeneraron.

## Verificación observada

- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T ecommerce sh -c 'npx tsc --noEmit'`: **0 errores** (EXIT=0; los errores de `components/servicios/ImportacionesForm.tsx` que había al inicio eran de otro writer y ya no aparecen).
- `npx eslint "app/(public)/catalogo" "app/(public)/producto" components/catalogo components/producto`: **0** (EXIT=0).
- Playwright (chromium headless shell 1243, contextos propios) en localhost:3000:
  - /catalogo 1440/1280/390 claro+oscuro: **0 gradientes, 0 backdrop-filter, 0 sombras fuera de diálogos, 0 objetivos <44px en .pg-catalogo, sin overflow-x, 0 pageerror**. Alturas de página: 2132 / 2748 / 3234 px (diseño: 2091 / - / 3222).
  - Primera tarjeta y=244 a 1440 (objetivo ≤380; diseño: 244).
  - `/catalogo?categoria=3`: filtra (12 tarjetas en página 1 de 19 de la categoría, chip activo). `/catalogo?ofertas=1`: 8/8 tarjetas.
  - Búsqueda sin resultados: estado "Sin resultados para "..."" + Limpiar filtros restaura el grid.
  - Quick-view abre (0 blur), Escape cierra; en 390 es hoja inferior (top 199, ancho 390).
  - Agregar: `catalogo_cart_items` +1 y badge del navbar 0 -> 1.
  - Paginación: página 2 activa (`aria-current="page"`).
  - Hoja de filtros móvil: checks de 44px, "Aplicar" fijo abajo (bottom = 844), aplica y cierra.
  - /producto/39 (oferta): h1 sin "ID:", "Garantía de 12 meses", tachado + %, 4 relacionados, WhatsApp `wa.me/51904589554?text=...` (config), ficha de 3 filas; h1 y=174 (diseño: 174); en 390 h1 y=398 y `.mbar` flex.
  - /producto/999999: 404 diseñado con "Volver al catálogo".
  - Imagen rota (request abortada) -> placeholder plano con icono en detalle y en las 12 tarjetas.
  - Precios con miles en grid: "S/ 2,399.00", "S/ 2,594.82", "S/ 1,768.82".
  - Oscuro: h1 #F8FAFC, contador #94A3B8 (no el gris genérico forzado), stock verde, badge de oferta legible.

## Diferencias diseño vs backend

- Ninguna bloqueante. "Más recientes" ordena por id descendente (el contrato no trae fecha) - igual que la maqueta.
- Descripciones seed-* se limpian en cliente (`cleanTexto`/`descVisible`); nombres con marca seed se muestran limpios.

## Pendientes

- Ninguno en mis rutas. (Los seeds seed-* en catálogo son decisión de limpieza global ya anotada en port-inv-instrucciones.md.)

## Key Learnings

1. `patch()` con `page: 1` fijo después del spread rompía toda la paginación del catálogo.
2. Sin `import "@/styles/catalogo.css"` explícito el checklist visual falla masivo (Next no lo carga solo).
3. globals.css fuerza spans grises en oscuro con !important; hace falta especificidad 0-4-1 para neutralizarlo.
4. El badge del carrito se actualiza con el evento `catalogo_cart_items_updated` que dispara `addToCartHome`.
5. Las imágenes externas (Unsplash) no pasan por `/storage/`: el placeholder debe cubrir también URLs remotas rotas.
