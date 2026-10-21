# ESTADO PARA LA SIGUIENTE SESION (actualizado 11-oct-2026, manana)
Rediseno Criscom Group: ciclo auditoria paralela -> logica -> brief+run Open Design -> aprobacion -> port. Respuestas cortas, en espanol. Modelo OD: claude-sonnet-5-5. Repo sin git: respalda en odd/backup/<seccion>/.

## *** ERP TERMINADO (11-oct) ***: TODAS las secciones rediseñadas y aprobadas por el usuario (Inventario, Marketing, Atencion al cliente, Servicio tecnico, Ventas/Caja/Dashboard, Administracion 12/12 incl. Tickets PDF, Manual de mi perfil y Solicitudes de acceso). SIGUIENTE FASE: landing/ecommerce.

## Hecho (lógica + diseño aprobado + port)
- Inventario y compras (7), Marketing (4), Atencion al cliente (Libro de reclamaciones, Cambios y garantias), Servicio tecnico, Ventas/Caja/Dashboard.
- ADMINISTRACION portada (10 de 10): Empresa y horario, SUNAT, Pagos y POS, Usuarios y afiliados, Cuenta maestra, Exportar productos, Solicitudes de importacion, Cotizaciones de armado, Logs de auditoria, Tickets PDF.

## PENDIENTE INMEDIATO
1. ~~TICKETS PDF~~ PORTADO (11-oct): entrada fina GenerateCardProductPage + pages/generate-ticket-pdf/tickets/* (17 archivos) + styles/tickets.css (.pg-tickets); motor PDF movido sin tocar logica, raiz quedo en shims. vitest tkLogic 4/4, Playwright 3 resoluciones OK, descarga real verificada con pdfinfo (2 hojas A4). OJO: chrome-headless-shell no renderiza PDF en iframe (solo en esa prueba sale en blanco); selector de hoja no aplica a la vista previa (es el PDF real). Dejo 1 fila audit_logs de la descarga de prueba.
2. Revisar visualmente el conjunto de Administracion con el usuario (los 9 portados se midieron con Playwright por sus writers, nadie vio el conjunto): CompanySunatPage ahora envuelve las pestanas en .pg-empresa; SUNAT/Pagos/Usuarios renombraron clases para no chocar; verificar que no quede doble h1 en las pestanas.
3. Limpieza de seeds (preguntar al usuario): users 9001-9013 (seed-adm/seed-care), affiliates negocios 1-3, access_requests/area_grants seed-adm, solicitudes_importacion 1-4 (+importacion id 6), solicitudes_ensamble 1-4 (+cotizacion comercial id 9 y 10), libro_reclamaciones descripcion LIKE '%seed-care%' (8), solicitudes_postventa ids 3-11 + postventa_historial, productos seed-adm, audit_logs de pruebas (ids ~190, 207, 213, 215-222...), y los de Inventario/Marketing (SEED-COT-*, SEED-PRD-001 (409 al borrar: SQL), SEED-FCH-*, SEED-MKT-OFE-01..07, banners 3-6, posts 2-8, miembros seed-marketing, campanas [seed]).

## INCIDENTE RESUELTO (no repetir)
La BD dev erp_computacion se vacio por un sync({force:true}) suelto. Recuperada por binlog (percona/percona-server:8.0 trae mysqlbinlog; mysql:8.0 no). Respaldos: odd/backup/administracion/db-restore/ y binlog-recovery/. REGLA: prohibido sync({force})/DROP/TRUNCATE/DELETE masivo contra erp_computacion; NODE_ENV=test NO cambia de BD (solo __tests__/setup.env.js).

## Decisiones pendientes del usuario
- Seguridad: /uploads/private/* publico (app.js:85); cifrar secretos SUNAT/Culqi en BD; xml_path/cdr_path expuestos en /facturacion/documentos; 7 literales del correo maestro en el front (usar user.es_maestra).
- Accesos: rol 5 y area_grants no llegan a /postventa, /audit-logs (App.tsx y DashboardLayout fijos), /generate-*; /company rechaza rol 3 con grants empresa_sunat/pagos_pos (App.tsx solo [1,2]).
- Negocio: encender FEATURE_LIBRO_RECLAMACIONES en prod (compose vps = false); SMTP real + PUBLIC_BASE_URL (MAIL_MODE=live); plazo devolucion 7 dias/garantia_meses (informativo); nota de credito/reembolso/reingreso (solo registro); adjuntos de evidencia; correo vs WhatsApp; generar PDF/Excel en navegador vs servidor; cron de vencimiento de cotizaciones; vigencia de ofertas, oferta vs mayorista, stock 0 en ecommerce, doble opt-in, WhatsApp fijo en hero, tarjetas, formato del blog.
- Tecnico: bug de hora de pared en ordenServicio.controller.js:1113,1134 (credencial temporal; recepcion-custodia.test.js falla bajo UTC, pasa con TZ=America/Lima); orden-servicio-garantia.test.js falla por fechas fijas vencidas; app.js cors sin exposedHeaders (X-Total-Count/X-Truncated no llegan al front); lib/api.ts redirige a /login sin BASE_URL (/erp); PUT /affiliates/me/identity 500 con PNG; POST /users acepta afiliado sin nombre_comercial; limiter publico 8/15min compartido (variar X-Forwarded-For para sembrar).

## Siguientes secciones
Ecommerce / landing (al final), dialogos POS, Manual de mi perfil.

## Herramientas y trucos
- Lanzar OD: python3 odd/tools/od_launch.py <projectId> "<nombre>" <carpeta> <prompt.txt> (proxy 127.0.0.1:7456). OJO: no verifica que el proyecto se cree; exigir conversationId (503 intermitente del daemon). Bajar diseno: GET /api/projects/<id>/raw/index.html con cabeceras x-od-workspace-id q1dbv4rg06ozqzaruzfhoha4 y x-od-workspace-member-id zxn4av29yqyvvakkg8c4wzcd.
- Jest SOLO en contenedor y con candado: mkdir /tmp/jest.lock; docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T -e NODE_ENV=test backend npx jest --runInBand --forceExit --testTimeout=120000 <suite>; rmdir /tmp/jest.lock. Suites juntas a veces fallan por contencion de la BD de test: repetir solas.
- Playwright: browser.newContext() propio; playwright de ~/.deck2pdf con executablePath ~/Library/Caches/ms-playwright/chromium_headless_shell-1243; /tmp/crlogin.js es funcion en texto -> page.evaluate('('+src+')()'). API :3100, front :5173 (base /erp/).
- Ninguna llamada de herramienta con mas de ~4 KB (upstream_timeout 90 s). Write/Edit convierte tildes a \uXXXX: python3+heredoc o constantes.
- /tmp/* (dq.sh, crlogin.js, jest.lock) puede desaparecer al reiniciar: dq.sh = mysql dentro del contenedor db con DB_PASSWORD de Backend/.env.
- Docs: odd/tasks/port-inv-instrucciones.md (metodo de port), port-adm-instrucciones.md, admin-brief-instrucciones.md, admin-logica-instrucciones.md, care-*/marketing-*/admin-*-auditoria.md (contratos finales).

## Run OD (11-oct-2026, madrugada)
- criscom-adm-manuals («Manual de mi perfil», /erp/manuals): runId 73ae2687-2937-4b71-92cb-40fef570bc0b, conversationId f8de4183-97cf-4018-b7a8-c460aeddaa4e. Brief: odd/opendesign/criscom-adm-manuals/ (brief_adm_manuals.py, manuals-data.json con el contenido literal extraído de ManualsPage.tsx; defectos medidos D1-D8 en adm_manuals_medidas.json).
- criscom-adm-access («Solicitudes de acceso», /erp/access-center): runId 4b27de37-aa58-40a3-8bde-8c80ecc0163c, conversationId 1c33b2c0-d7d0-4934-ba79-86a8175cea70. Brief: odd/opendesign/criscom-adm-access/ (brief_adm_access.py, access-data.json con datos reales; D1-D8 en adm_access_medidas.json).
- Seeds nuevos (limpiar): access_requests id 10 (user 9006, auditoria) y 11 (user 9010, servicio_tecnico), marca 'seed-adm:' en reason.
- Hallazgo backend: GET /access/my devuelve fechas en texto de BD sin zona («2026-10-11 18:00:00»); /access/requests sí ISO -05:00. Pendiente alinear /access/my con isoFields.
- Hallazgo front: ManualsPage elige la guía maestra por literal de correo; la regla correcta es user.es_maestra (demostrado con Playwright: rol 3 + correo maestro ve el manual maestro).
- El daemon de Open Design estaba apagado (503 DAEMON_UNAVAILABLE): se levantó con `open -a "Open Design"` y tardó ~30 s en responder 200.

## Port manuals + access-center (11-oct-2026, manana) - APROBADOS y PORTADOS
- /erp/manuals: entrada fina ManualsPage + ManualScreen/Guide/Denied + manualData.ts (textos literales desde manuals-data.json) + manualProfile.ts (5 tests) + styles/manuals.css (.pg-manuals). CORREGIDO: perfil por user.es_maestra (ya no literal de correo).
- /erp/access-center: entrada fina AccessCenterPage + pages/access/solicitudes/* (11 archivos) + styles/sol-acceso.css (.pg-solacc). MaeAccessCenter quedo como re-export de compatibilidad; /master-account verificado intacto.
- Verificacion: tsc 0, eslint 0 (contenedor), vitest 11/11, Playwright 3 resoluciones x claro/oscuro OK ambas, flujo real (solicitud, aprobar seed 10 -> grant 9, rechazar seed 11, seed 12 propia aprobada+rechazada -> grant 10 inactivo).
- Seeds tocados (limpiar): access_requests 10 (aprobada), 11 (rechazada), 12 (creada por user 1 y rechazada); grants 9 (activo) y 10 (inactivo).
- Pendiente backend (no tocado): GET /access/my con fechas sin zona -> alinear con isoFields; el front las trata como hora local Lima (fmtAccess).

## Ecommerce - rediseno total (11-oct-2026)
- Estructura aprobada por el usuario (navbar: Inicio/Catalogo/Arma tu PC/Importaciones/Servicio tecnico). Logica backend LISTA (odd/tasks/ecom-logica.md, auditoria en ecom-logica-auditoria.md): config-publica, ofertas con vigencia, mis-solicitudes. Pendiente: 4 archivos con correo maestro literal (mi-cuenta, iniciar-sesion, Header, ecommerceApi.ts).
- 6 runs OD lanzados: home 2d7fe9b0-950c-4e52-b6cf-4c6a00495d3e, catalogo 2254efa5-98e0-49f7-bb3b-789f6da0f457, checkout 3db5bd68-67d7-46c3-b7d9-3657af6847b6, servicios 5670335d-27c1-49c5-a3fb-e7aa44bf754f (succeeded), cuenta b2e8c5c1-b523-458a-90d4-67e5fcf6f5b9 (succeeded), contenido 4a331ad6-4ebf-46e0-8d58-2c5b67eef82b (running).
- SIGUIENTE: bajar index.html de cada proyecto (GET /api/projects/<id>/raw/index.html), que el usuario apruebe, luego port a Ecommerce/ (Next.js, no Vite). Seeds: tarjetas 1-3 'seed-ecom'.

## Ecommerce - PORTS COMPLETOS (11-oct-2026)
- Portados y aprobados: home+chrome, catalogo+producto, checkout+confirmaciones, servicios (armar-pc/importaciones/servicio-tecnico), cuenta (+/seguimiento unificada), contenido (blog+legales). Informes: odd/tasks/ecom-port-*.md y nota en ecom-logica.md.
- Empalme final: enlaces de Header/Footer/Home a /importaciones, /seguimiento, /mi-cuenta?tab=... ; sitemap sin rutas viejas. tsc 0, eslint 0 (app+components), rutas principales 200, rutas muertas 404/307.
- PENDIENTES: (1) logo-criscom.png es opaco con fondo blanco: falta variante transparente/oscura para modo oscuro; (2) correo maestro literal en Header.tsx, ecommerceApi.ts, LoginPanel/MiCuentaPanel; (3) ThemeToggle flotante tapa botones inferiores en movil; (4) Components/admin/ huerfano; (5) NEXT_PUBLIC_CULQI_PUBLIC_KEY sin configurar (modal de tarjeta no abre en dev); (6) seeds seed-ecom (tarjetas 1-3, pedidos 26-28, users 9015+, solicitudes, LR-2026-000009, suscriptor); (7) revision visual conjunta del usuario.
- (11-oct) RESUELTO: logo del Ecommerce ahora transparente y horizontal: public/logo.png (claro), logo-dark.png, logo-mark.png; Header/Footer alternan .logo-l/.logo-d con .dark. Respaldo del anterior en odd/backup/ecommerce/logo/. components/admin/ BORRADO (respaldo en odd/backup/ecommerce/admin-huerfano/). Pendiente menor: el ERP (Frontend/public/logo-criscom.png) sigue con fondo blanco.
