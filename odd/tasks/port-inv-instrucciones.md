# Port de diseños OD aprobados — Inventario y compras (instrucciones comunes)

Repo: /Users/soulkin/Downloads/criscom-web-main (sin git; respalda cada archivo que reescribas en odd/backup/inventario/front/ antes de tocarlo, si no existe ya ahí).

## Método (el mismo de Ventas y Servicio técnico, ya probado)
1. CSS: `python3 odd/tools/od2css.py odd/opendesign/criscom-inv-<x>/index.html .pg-<x> Frontend/src/styles/<x>.css` y luego `python3 odd/tools/fixcq.py Frontend/src/styles/<x>.css .pg-<x>`. Revisa el CSS resultante: quita lo que sea solo del tablero (índice, marcos de estado, etiquetas de estado). Inputs/selects a min-height 44px.
2. JSX a mano sobre los SERVICIOS REALES (Frontend/src/services/*). La lógica de negocio ya está corregida en el backend: no la cambies; llama a los endpoints existentes y muestra sus mensajes de error (`error.response.data.message`).
3. Patrón de página (copia de Frontend/src/pages/services/WebRequestsPage.tsx y Frontend/src/pages/services/expedientes/*):
   - Raíz `<div className="pg-<x>">` con host de altura `calc(100dvh - 108px)` en desktop (`-84px` en móvil) si la pantalla es bandeja+detalle; listados largos pueden hacer scroll normal.
   - Modo móvil por ancho del contenedor con ResizeObserver (no por viewport).
   - Diálogos con `ErpDialog` (components/erp/ErpDialog.tsx) envolviendo el contenido con la clase `pg-<x>` (van en portal).
   - Iconos de components/erp/icons.tsx o lucide-react; formato de dinero/fecha de components/erp/format.ts.
   - `useDocumentTitle` como en las páginas existentes.
   - Sin window.confirm/prompt. Estados con icono + palabra. Un solo acento morado.
4. Conserva rutas, roles, `RoleProtectedRoute`, horario laboral (useBusinessHours) y deep links existentes.

## Verificación obligatoria (reporta `<comando>: <resultado observado>`)
- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T frontend sh -c 'npx tsc -p tsconfig.app.json --noEmit; npx eslint <rutas tocadas>'` → 0 errores nuevos (warnings preexistentes ok).
- Playwright a 1440x900, 1280x720 y 390x844 en http://localhost:5173/erp/<ruta>. Login: en una página del ERP ejecuta el JS de /tmp/crlogin.js (pone token y user en localStorage) y recarga. Mide: 0 gradientes, 0 backdrop-filter, box-shadow solo en diálogos/menús/paneles, 0 objetivos interactivos < 44 px de alto dentro de `.pg-<x>`, sin overflow horizontal, h1 a x=24 del main (12 en móvil).
- Prueba el flujo real principal de la pantalla (crear/editar/acción de estado) contra el backend y confirma el resultado en la UI. Usa solo datos con marca seed (SKU SEED-*, notas 'seed-inventario') o crea los tuyos con esa marca.
- Datos DB: helper `/tmp/dq.sh "<SQL>"` (ejecútalo con cwd = raíz del repo).

## Entrega
Estado (done/partial/blocked), archivos tocados, resultados de verificación observados, y cualquier diferencia entre el diseño y lo que el backend permite.

## Aprendizajes de ports anteriores
- od2css.py solo convierte `.lap`/`.c2` en la regla de 1099 px: si el diseño usa `.cmp`, pásalo antes por una copia temporal cambiando `.cmp ` por `.lap `.
- El contenido de ErpDialog necesita envoltorio `.pg-x.dlgw` con `container-type:normal` (si no, cae en reglas móviles).
- Write/Edit convierte comillas tipográficas, rayas y elipsis a ASCII: repónlas con python y verifica con grep.
- Fechas del backend ya llegan en hora de Lima: no restar 5 h.
- Botones aria-disabled: en Playwright usar click({force:true}) para probar el motivo.
- Quita CommercialNavigation: el sidebar ya da esa navegación.
- [x] Categorías portadas (CategoriesPage, CategoryDetailPage, styles/categorias.css).
- OBLIGATORIO: ninguna llamada de herramienta con más de ~6 KB de contenido (el stream se corta a los 90 s). Escribe archivos en partes (`cat >>`) o divide en archivos pequeños dentro de la carpeta de la página.
- Para no pelear con las comillas, define constantes con \u (SEP, DASH) en un archivo shared.
- Después de crear un registro espera a que termine load() antes de seleccionarlo.
- [x] Importaciones portadas (ImportsPage + importsShared/ImportSheet/ImportDetail/ImportDialogs, styles/importaciones.css).
- [x] Adquisiciones portadas (AcquisitionsPage + acqShared/AcqDetail/AcqPick/AcqDialogs/AcqWizard/AcqSteps/AcqEval/acqFormState, styles/adquisiciones.css). Nuevo expediente = asistente de 4 pasos en la misma pantalla; ingresar al stock = PUT {producto_id, registrar_inventario:true}. Sin edicion de expedientes (el diseno no la tiene); sin estado auditor (la ruta es solo roles 1 y 2).
- macOS es insensible a mayusculas y el contenedor Docker conserva el fantasma: si renombras `acqForm.ts` y existe `AcqForm.tsx`, tsc resuelve el .ts viejo. Nunca uses dos archivos que difieran solo en mayusculas (renombra a otro nombre).
- [x] Compras portadas (CommercialControlPage queda como router fino: tab=purchases -> purchases/PurchasesPage, tab=quotes -> QuoteManager con h1 simple, tab=inventory -> /products; purchases/: PurchasesPage, PurchaseList, PurchaseFilters, Pager, PurchaseDetail, VoidDialog, ReceiveForm, ReceiveLines, ProductPicker, receiveCalc, SuppliersTab, SupplierPanel, purchasesShared; styles/compras.css).
- Panel lateral (detalle de compra, proveedor) = ErpDrawer (components/erp/ErpDialog.tsx, primer uso) con contenido envuelto en `.pg-x.dlgw.drw`; el contenedor `.pnl` pasa a flex:1 estatico. Un ErpDialog (anular) puede abrirse encima del drawer sin problema.
- container-type:inline-size crea bloque contenedor para fixed/absolute y el scroll es el de la ventana (main no hace scroll): `position:sticky`/`fixed` para un pie movil NO funciona. Usa host `.fx` (height calc(100dvh - 84px), flex column) + zona `.rcs` con overflow-y:auto + pie como hermano flex:none.
- Backend: createPurchase acepta `fecha` ISO (hoy = new Date().toISOString(), otro dia = T12:00:00-05:00); el costo asignado y subtotal van en SOLES aunque la compra sea USD; anular devuelve 409 con el producto y las unidades en `message` (mostrarlo tal cual). Un producto repetido lo rechaza el backend: la UI suma cantidad al volver a escanear en vez de crear otra linea.
- Anular una compra puede dejar el costo promedio 0.01 distinto del original (redondeo del backend).
- [ ] Pendientes despues: Cotizaciones, Ficha de producto, Productos (orden sugerido).
- [x] Compras portadas (pages/commercial/purchases/*, styles/compras.css).
- [x] Cotizaciones portadas (pages/commercial/quotes/*, styles/cotizaciones.css). El enlace a la venta se lee de 'Venta #N' en notas.
- [x] Productos portado (pages/products/list/*, styles/productos.css; ProductsPage.tsx re-exporta).
- [x] Ficha de producto portada (pages/products/detail/*, styles/producto-detalle.css; ProductDetailPage.tsx re-exporta).
- Aprendizaje: con writers en paralelo el Playwright MCP es compartido (abrir page.context().newPage()) y las capturas relativas caen en /Users/soulkin/odd/tmp.
- Aprendizaje: .erp-dlg label{margin-top:14px} rompe rejillas: .erp-dlg .pg-x label{margin-top:0}. Ancho de dialogo/drawer con :has(.pg-x.wide) / :has(.pg-x.drw).
- Aprendizaje: container-type rompe fixed/sticky: usar host .fx de altura fija con zona interna overflow-y:auto y pie flex:none.
- PENDIENTE: borrar seeds (odd/opendesign/criscom-inventario-unseed.sql y los de SEED-COT-*, SEED-PRD-*, SEED-FCH-*, SN-SEED-TEST*, COM-MV2*, Tecno Seed UI, venta #176); verificar href 'Ver venta #N' en Cotizaciones; rol 3 fuera de horario en Productos.

## MARKETING (aprobado por el usuario el 10-oct; logica + diseno + port terminados)
- [x] Ofertas: pages/offers/* (17 archivos ofe*), styles/ofertas.css. Backup odd/backup/marketing/OffersPage.pre-port.tsx.
- [x] Redes y banners: pages/social-links/{networks,banners}/*, styles/redes-banners.css. BannerListManager.tsx eliminado.
- [x] Blog y contenidos: pages/marketing/blog/*, styles/blog.css. Lista completa sin contenido, filtros/contadores en cliente.
- [x] Comunidad y correos: pages/marketing/community/* (22 archivos), styles/comunidad.css. Solo MAIL_MODE dry en dev.
- Notas de logica/contrato: odd/tasks/marketing-{ofertas,redes-banners,blog,comunidad}-logica.md. Disenos: odd/opendesign/criscom-mkt-*/index.html.
- Aprendizajes: Write/heredoc convierten tildes a \uXXXX (reponer con script); Playwright MCP compartido (usar browser.newContext() propio); renombrar .tsx->.ts en Vite deja modulo fantasma; con container-type usar host .fx + zona interna con scroll; reglas de columna en @container despues de la base; fixcq no prefija @container de una linea.
- PENDIENTE (decisiones del usuario): vigencia de ofertas; oferta vs mayorista; stock 0 en ecommerce; rol 5 auditor; doble opt-in; WhatsApp fijo en hero de Ecommerce (page.tsx ~505/547); tarjetas (retirar?); formato del contenido del blog; SMTP real; VITE_PUBLIC_SITE_URL para 'Ver en la web' (hoy criscomgroup.pe); estado fuera de horario de Ofertas sin probar.
- PENDIENTE (limpieza): seeds seed-marketing (SEED-MKT-OFE-01..07 ids 39-45, SEED-RAM-16 oferta 169, banners 3-6, posts blog 2-8, miembros seed-marketing+1..25@example.invalid, campanas [seed] 2-5) y los de Inventario (SEED-COT-*, SEED-PRD-001, SEED-FCH-*, SN-SEED-TEST*, COM-MV2*, Tecno Seed UI, venta 176).
- SIGUIENTE: Atencion al cliente, Administracion, ecommerce/landing, dialogos POS.
