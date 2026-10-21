# Criscom Group: shell redesign (sidebar, layout, navbar, footer)

## Objective
Full visual redesign starting with the application shell, driven by the new
purple Criscom Group logo, commissioned through Open Design (agent `claude`,
model Sonnet 5.5) and later ported to the code.

## Problem / why
Current shell is the legacy cyan/electric-blue look. The brand moved to a purple
logo (C with pixel squares and circuit traces). The shell frames every screen, so
it goes first.

## Scope
- Storefront (Ecommerce, Next.js): Header, Footer, SalesAccessBar, floating
  WhatsApp button, CartDropdown trigger. `app/(public)/layout.tsx`.
- ERP (Frontend, React/Vite under /erp/): DashboardLayout sidebar, top navbar,
  content frame. `src/layouts/DashboardLayout.tsx`.
- Out of scope now: Ecommerce `app/admin/*` panel, inner pages.

## Constraints
- Model rule (user, 2026-10-10): everything in this project runs on Sonnet 5.5
  (`claude-sonnet-5-5`): every subagent, Open Design runs, any delegation. Never Opus.
- Design happens in Open Design, not in the repo (user rule).
- Briefs follow the 7-section DESIGN.md convention with measured defects.
- Repo is a backup without git: no work-unit commits possible until it has one.

## Tasks
- [x] T1 Measure both shells live (Playwright, 1440x900 and 390x844), capture references, extract real tokens and nav data.
- [x] T2 Write briefs: `odd/opendesign/criscom-tienda-shell/` and `odd/opendesign/criscom-erp-shell/` (DESIGN.md, data json, referencias/, logo).
- [x] T3 Create Open Design projects, upload files, launch runs with Sonnet 5.5.
- [x] T4 Review deliverables with the user. ERP shell approved 2026-10-10 ("me encanto como quedo el erp").
- [x] T5a Port ERP shell to code (route: inline, Sonnet 5.5; user ordered ERP only, ecommerce LAST).
  Files: Frontend/src/index.css (tokens), tailwind.config.js (shell colors), public/logo-criscom.png,
  src/layouts/DashboardLayout.tsx (rewrite of render), src/components/business-hours-indicator.tsx (pill).
  Proof: tsc + eslint clean in the frontend container; Playwright 1440x900 light/dark, rail, 390x844 drawer:
  sidebar 272, rail 64, drawer 288, nav scroll 0, overflow-x 0, crumb+title ok. No git: no commit possible.
  Original layout backup: /tmp/DashboardLayout.orig.tsx (volatile).
- [ ] T5b Port storefront shell (Ecommerce) - LAST, after the whole ERP redesign (user order).
- [ ] T6 Redesign ERP inner pages one by one, same OD flow.
  - T6.1 Dashboard (4 tabs): briefs in odd/opendesign/criscom-dashboard/ (DESIGN.md D1-D14, dashboard-data.json, 10 refs,
    seed-dashboard.sql = 172 sales + 7 cierres, observaciones='seed-dashboard', delete before real use).
    OD project criscom-dashboard, run c44c3cda-0b05-4b0c-8bd3-1784404df0aa (claude-sonnet-5-5), launched 2026-10-10.
    DONE ~15 min, no stalls. Deliverable odd/opendesign/criscom-dashboard/index.html (12 states + 11b). Verified by me in Playwright:
    0 gradients, 0 box-shadow, 0 backdrop-filter. Paneles height 1605->580 (1440), caja diaria visible above the fold.
    User said "quedo fenomenal" (2026-10-10) = APPROVED. PORTED (inline, Sonnet 5.5): pages/dashboard/DashboardPage.tsx + useDashboardData.ts
    (agrupa por dia de LIMA), styles/erp.css (clases erp-* compartidas, container queries), components/erp/{charts,icons,format}.
    Verified Playwright: 0 gradients/shadows/blur, 0 targets <44, h1 x=24 (12 mobile), no overflow. Paneles 1605->532 px (1440), 2799->1127 (390).
    Fixes while porting: Control Semanal starts Monday (was Tuesday); cierre by date no longer falls back to cierre[0] of another day;
    daily/weekly sums from the already-loaded /ventas by Lima date (no N requests). Productos Mas Vendidos hidden when /ventas has no `detalles`.
    weekly-sales-charts.tsx, current-week-analysis.tsx, charts/* now unused by Dashboard (not deleted).
  - T6.2-T6.7 SECCION VENTAS en paralelo (user pidio avanzar rapido, 6 runs OD a la vez, claude-sonnet-5-5, 2026-10-10):
    criscom-venta-nueva f68846d7 | criscom-ventas-historial ee7cce72 | criscom-venta-detalle 178e40c2 |
    criscom-pedidos-web 14f67349 | criscom-entregas 218fe934 | criscom-caja-diaria 83f412eb
    Briefs basados en BACKEND (no en capturas): odd/opendesign/<proyecto>/{DESIGN.md,*-data.json,referencias/}.
    ALL 6 RUNS SUCCEEDED (~15-25 min, no stalls). Copied to odd/opendesign/<proyecto>/index.html. Verified by me in Playwright:
    0 gradients, 0 backdrop-filter, 0 targets <44, 0 JS errors; shadows only on dialogs/menus/drawers/toasts; POS frames fit 840px (no page scroll).
    States: nueva 22 frames, historial 15, detalle 14, pedidos 17, entregas 13, caja 16. NOTAS block present in each.
    PENDING: user approval of each, then port (T6.2-T6.7).
    Seed extra: odd/opendesign/criscom-ventas-seed.sql (12 pedidos CG-SEED-*, POS Izipay, codigos_barras, comprobantes y pagos_pos sobre ventas).
    Known LOGIC bug out of design scope: Control Semanal default week starts Tuesday (06/10) due to double TZ shift in DashboardPage useState.

## Progress
- Stack running in Docker (`-p criscom`), demo catalog seeded.

- T1/T2 (delegated, gentle-ai-worker): 18 references per shell, DESIGN.md 7 sections each, data JSONs parse, no secrets in output.
- Brand palette from logo: #2F115C ink, #4B2281 core, #743AB4 vivid, #A867E3 highlight, #CEB9E1 lavender. Logo unreadable on dark (~1.2:1): needs light plate.
- T3: OD projects `criscom-tienda-shell`, `criscom-erp-shell`; runs 0da2c2bd-4a3a-4f23-9835-728f021dbac0 and 993303d3-5b03-442f-8445-801420d5f2fc, events confirm model claude-sonnet-5-5.

- Tienda run succeeded (108 KB, 13 states): chrome 182->96 px desktop, footer 1498->532 px, no 390px overflow, 0 tap targets <44 px.
- ERP run 993303d3 looped: Sonnet tried one huge Write, stream stalled 90 s, Write arrived without content (InputValidationError x2). Cancelled; relaunched bd7bf820-885a-454f-b2a7-5ec23ccb1d44 with a chunked-write rule (<=20 KB per Write/Edit): succeeded, 35 KB, 14 states rendered by JS from NAV data. Sidebar 320->272 px, Servicio tecnico hidden scroll 154->0 px.
- Both rendered with Playwright: 0 console errors, 0 broken images. Copies in odd/opendesign/<project>/index.html.

## Next step
T4: user review of both deliverables; then T5 port (needs authorization).


## 2026-10-10 PORTS A CODIGO (todos aprobados por el usuario)
Metodo: odd/tools/od2css.py convierte el CSS del diseno OD en CSS con ambito (.pg-<pantalla>, container queries) -> Frontend/src/styles/<pantalla>.css;
el JSX se reescribe a mano sobre datos/servicios reales. Dialogos/paneles = Radix en portal (components/erp/ErpDialog + clases erp-*).
- [x] Dashboard, Entregas (DeliveryQueuePage), Pedidos web (WebOrdersPage: AHORA confirma pago manual), Historial (SalesPage: estados desde estado_comprobante),
  Detalle (SaleDetailPage), Caja diaria (DailyCashPage: cuadre efectivo; cierra con PUT si ya hay cierre abierto).
- Verificado Playwright en cada una: 0 gradientes/blur, h1 x=24 (12 movil), sin overflow; flujos reales probados (confirmar pago, cerrar caja).
- [x] Registrar venta (NewSalePage): solo se reemplazo el JSX de layout (logica/handlers intactos); styles/pos.css. Escritorio: captura+lineas | panel de cobro con Cobrar siempre visible; <1180px: barra inferior + hoja de cobro. Probado: venta efectivo (#174) y tarjeta con N.º de operacion (#175), 1440/1280x720/390, 0 gradientes/sombras, 0 objetivos <44px, sin scroll de pagina.
- [ ] Pendiente: dialogos de utils/salesDialogs (cliente, descuento, confirmar, carritos guardados, exito) siguen con el estilo antiguo.

## 2026-10-10 SERVICIO TECNICO (tanda A portada)
- [x] Resumen del taller (ServiceAreaPage + styles/taller-resumen.css): tablero con KPI, «Requieren acción hoy», pipeline.
- [x] Nuevo ingreso (QuickIntakePage + styles/taller-ingreso.css): chips, fotos con progreso, fallo parcial recuperable. FIX real: workOrderService.addWorkOrderEvidence no mandaba multipart -> las fotos de recepción/evidencias NUNCA se subían.
- [x] Expedientes/Mantenimientos/Armado PC (WorkOrdersPage + pages/services/expedientes/{shared,tabs,ExpedienteView,EditSheet} + styles/taller-expedientes.css). Original en odd/backup/WorkOrdersPage.old.tsx.
  Probado: cambio de estado 1 clic, pago, edición, diálogo anular, móvil 390 (0 overflow, 0 objetivos <44).
- HALLAZGO backend: al entregar, el backend CREA la venta contable, clasifica fiscalmente y consume repuestos; solo bloquean pago completo e importe > 0. El checklist del diseño se corrigió: 2 obligatorios + 3 informativos «Al entregar».
- Deep link ?orden=<id> desde el Resumen. Servicios nuevos: credencial temporal (estado/revelar/eliminar), annulWorkOrder.
- [ ] Tanda B pendiente: Caja y ventas de servicio, Gastos, Diagnóstico asistido, Comunicación (WhatsApp), Solicitudes web.

## 2026-10-10 SERVICIO TECNICO tanda B portada (5 pantallas, aprobadas por el usuario)
- [x] Caja y ventas de servicio (CajaTallerPage + styles/taller-caja.css): héroe «Ganancia estimada» con la resta y explicación; rango de fechas corrige hasta exclusivo.
- [x] Gastos (GastosTallerPage + taller-gastos.css): alta en panel lateral, tabla por día, eliminar con diálogo, orden imputada por código, fecha en hora de Lima.
- [x] Solicitudes web (WebRequestsPage + taller-web.css): bandeja + detalle, flujo Contactar -> Marcar -> Convertir, aviso sin consentimiento. Servicio: campo consentimiento_contacto.
- [x] Diagnóstico asistido (DiagnosticAssistantPage + taller-diagnostico.css): 2 columnas, next_tests, versiones anteriores, revisión humana, copiar diagnóstico. FIX: las versiones llegaban en orden ascendente -> se ordenan por versión desc.
- [x] Comunicación WhatsApp (WhatsAppStatusPage + taller-whatsapp.css): conversación unificada (Gateway + manual con origen), panel de envío, consentimiento, fotos con confirmación al publicar.
- Probado en navegador 1440/390: 0 overflow, 0 objetivos <44; flujos: crear/eliminar gasto, preparar mensaje, generar/aprobar diagnóstico, marcar contactado.
- Pendiente: probar Convertir a orden (crea orden real), Abrir en WhatsApp, publicar foto (no hay fotos en el seed), diálogos del POS (salesDialogs).

## 2026-10-10 INVENTARIO Y COMPRAS (6 pantallas) - paso 1 hecho (analisis + seed), runs NO lanzados
- Seed: odd/opendesign/criscom-inventario-seed.sql (13 productos SEED-*, 4 categorias, 5 ubicaciones, 11 quants, 4 proveedores, 5 compras, 6 cotizaciones, 4 adquisiciones, 5 importaciones). Borrar: criscom-inventario-unseed.sql (marca 'seed-inventario' / prefijo SEED-).
- Codigo real: pages/products/{ProductsPage,ProductDetailPage}, pages/commercial/{CommercialControlPage,QuoteManager}, pages/categories/*, pages/acquisitions, pages/imports (las de 70 lineas NO delegan: todo en el archivo).
- Hallazgos de logica clave: (1) ProductDetail manda stock=sum(codigos) siempre -> pone en 0 un producto con stock y sin codigos; (2) alta/foto pisan condicion/origen/garantia a nuevo/local/12; (3) cotizacion convertida puede volver a enviada y convertirse 2 veces; (4) margen mezcla precio con IGV vs costo sin IGV; (5) vigencia_dias no se aplica; (6) compra/importacion/adquisicion no tocan quants; (7) importacion: nada se revierte tras recibida; (8) permisos importaciones: dos fuentes (MASTER_ADMIN_EMAIL vs email fijo); (9) adquisiciones: no hay fotos ni documentos, sin precio de reventa, area compras da 403.
