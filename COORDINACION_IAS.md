# COORDINACIÓN ENTRE IAs — CRISCOM

+## Actualización 2026-08-25 — catálogo, imágenes y proveedores

- Relevo especializado vigente: `HANDOFF-CATALOGO-IMAGENES-2026-08-25.md`.
- Copia usada por el bloque más reciente: `C:\Users\User\Documents\Codex\2026-08-24\pu\work\criscom-current`.
- Estado al cierre: 2929 productos, 2879 pendientes de completar y 7189 imágenes faltantes para llegar a tres por producto.
- El manifiesto canónico del trabajo es `Backend/src/scripts/verified-image-manifest.json`; el importador reemplaza toda galería anterior para impedir imágenes equivocadas o duplicadas.
- Antes de continuar, leer completo el relevo especializado, verificar el árbol real y confirmar qué copia es la fuente activa. No volver a introducir marcas de agua de Rematazo, CompuTactus, Createc ni otros distribuidores.
- Último producto completado: 2447, Corsair Vengeance 16 GB DDR5-5600 SODIMM CL48, `CMSX16GX5M1A5600C48`.
- Se consolidó el duplicado WD Green 2 TB (2800/2801) sin duplicar stock; la ficha canónica es 2800.


## Actualización 2026-08-10 — Vendedores, roles y afiliados

- Menú canónico: **Vendedores y roles**; no crear módulos paralelos.
- Roles: 1 Gerente/Crisitus, 2 Administrador, 3 Vendedor o afiliado, 4 cuenta pública/sin ERP, 5 Auditor temporal, 6 Técnico.
- La autoridad maestra no depende solo del rol: el correo canónico es `cristophercalioro@gmail.com`. No puede ser degradado por otro usuario.
- El Administrador puede recibir superusuario temporal con expiración; no puede ampliarlo, modificar a Crisitus ni acceder a Importaciones.
- Auditor: caducidad comprobada en cada petición; revisa/corrige incidencias operativas con trazabilidad, sin administrar estructura o accesos.
- Permisos extraordinarios usan `area_grants` y `access_requests`; solo Crisitus aprueba, vence o revoca. Importaciones no es delegable.
- Tipos: `fisico`, `virtual`, `afiliado`; únicamente el físico usa el horario del local.
- `affiliate_business_id` separa productos, ventas y cierres. `NULL` pertenece a CRISCOM.
- La misma separación es obligatoria para proveedores, compras, cotizaciones, Kardex y Servicio Técnico. Toda consulta de registros hijos debe validar primero la entidad padre dentro del tenant.
- Un afiliado puede publicar/administrar productos propios, confirmar efectivo de pedidos totalmente propios y operar un área técnica propia concedida. Nunca recibe solicitudes web de CRISCOM.
- Identidad afiliada: `affiliate_businesses.logo_url` + `identidad_configurada`. La primera configuración exige nombre y logo; hasta completarla el backend responde `428 AFFILIATE_IDENTITY_REQUIRED` salvo en `/api/affiliates/me`. Logo público en `/uploads/affiliate-logos`, PNG/JPG/WEBP, 2 MB; UI exige mínimo 256 × 256 y renderiza con `object-contain`.
- La tarjeta web aplica un recargo servidor de 5% sobre el subtotal de productos afiliados; no confiar en importes calculados por el navegador.
- Carrusel: no reintroducir `/banner.png` como fallback obligatorio. Cero registros activos muestra el hero institucional; uno no muestra controles; varios ordenan por `banner.orden`. Campos canónicos: `titulo`, `activo`, `orden`, `media_type`.
- Servicio: `/services` es el hub de navegación; `/services/technical` y `/services/pc-builds` reutilizan `ordenes_servicio` diferenciadas por `tipo`. Importaciones solo se enlaza a `/imports`; nunca duplicar su expediente dentro de Servicio.
- Nunca sumar operaciones afiliadas a caja, dashboards, libros o reportes CRISCOM. Solo se reconoce la comisión pagada y validada.
- Comisión: 8% mensual solo para afiliados. Culqi confirmado reactiva automáticamente; pago manual requiere validación del gerente.
- Archivos: `Backend/src/models/affiliate_*.model.js`, `Backend/src/controllers/affiliate.controller.js`, `Backend/src/routes/affiliate.routes.js`, `Frontend/src/pages/vendors`, `Frontend/src/pages/affiliates` y `Frontend/src/services/affiliateService.ts`.
- `unscoped()` sobre `Venta`, `Producto` o `CierreCaja` exige un filtro explícito por `affiliate_business_id`.

> Fuente canónica para retomar el proyecto sin depender del chat, la memoria de un modelo ni una terminal concreta. Toda IA debe leer este archivo completo antes de editar.

## 1. Mapa de espacios y alcance

- Workspace de OpenClaw (identidad, memoria y configuración de CRiSTEM): `C:\Users\User\CRISCOM\cristem`.
- **MAESTRA / fuente de verdad (git): `C:\Users\User\CRISCOM\criscom-web`.** Decisión CRiSTEM 2026-08-13: una copia maestra debe tener control de versiones (historial, ramas, diff, rollback). `criscom-web` es repo git y contiene TODO el trabajo (checkpoint `05c6f68` en `work/roadmap-fase1`). Aquí se desarrolla; desde aquí se generan releases al Ryzen y se refresca el respaldo.
- **RESPALDO (congelado): `C:\Users\User\Downloads\CRISCOM-fusion-work-2026-08-10\merged`.** Es una carpeta plana SIN git (snapshot fusión validada del 08-10). Sirve como copia de seguridad; NO es maestra ni se desarrolla ahí (sin git = cambios sin rastro). Está desactualizada respecto a criscom-web. La vieja `Cris-proyecto-respaldo-2026-08-03` quedó obsoleta.
- **DESPLIEGUE: Ryzen `/root/criscom-releases/<fecha>/`** (releases Linux inmutables), generadas desde la maestra.
- Al refrescar el respaldo de Descargas: nunca copia masiva; comparar por capacidad/contrato, preservar sus mejoras y excluir `node_modules`, `.next*`, `.next-*`, `dist`, `.runtime`, `*.tar.gz`, logs, cachés y otros artefactos generados.
- Producción real: `docker-compose.vps.yml` + gateway nginx en `deploy/nginx/criscomgroup.gateway.conf`. No asumir que `docker-compose.yml`/Traefik representa producción.

## 2. Qué comparten y qué no comparten las IAs

- OpenClaw tiene un agente configurado: `main`. Sus modelos alternativos comparten workspace, memoria y herramientas autorizadas.
- Los subagentes Codex comparten el filesystem del proyecto, pero reciben contexto conversacional limitado según su creación.
- Una IA abierta en otra terminal o aplicación no recibe automáticamente conversaciones, memoria, navegador, credenciales ni sesiones. Solo conoce lo que lea explícitamente y lo que permitan sus permisos.
- Estos documentos coordinan el trabajo, pero ninguna IA los conoce automáticamente: debe abrirlos.
- Crisitus es propietario y decisor final. Ninguna IA despliega pagos ni realiza acciones externas/cobros sin su autorización.

## 3. Orden de lectura obligatorio

1. `COORDINACION_IAS.md` — índice maestro, estado vigente y siguiente acción.
2. `HANDOFF-SERVICIO-TECNICO.md` — diseño y avance del módulo técnico.
3. `HALLAZGOS_CRISTEM.md` — auditoría histórica detallada; sus hallazgos viejos pueden estar resueltos o descartados.
4. `git status --short --branch` en el repo canónico.
5. Diff de los archivos que se pretenden modificar.

Si hay contradicción, prevalecen en este orden: estado real del repo maestro `criscom-web` (git, pruebas ejecutadas) → este documento → handoff especializado → respaldo de Descargas → historial de hallazgos → memoria conversacional.

## 4. Protocolo anti-choque

1. Declarar en la bitácora: IA, fecha, objetivo y archivos que tocará.
2. No editar archivos que otra IA tenga declarados como activos.
3. Preservar cambios ajenos; nunca usar `reset --hard`, limpieza masiva ni checkout destructivo.
4. Al cerrar: registrar archivos, verificaciones, resultados, pendientes y liberar el bloque.
5. Sincronizar el código hacia Descargas solo después de validar y comparar; nunca copiar dependencias o builds.
6. No iniciar procesos duplicados. Puertos habituales: tienda/gateway `3000`, API `3100`, ERP Vite `5173`. Revisar procesos antes de arrancar.

## 5. Arquitectura

- `Backend/`: Node.js, Express, Sequelize y MySQL.
- `Frontend/`: ERP React 19 + Vite + TypeScript, publicado bajo `/erp/`.
- `Ecommerce/`: Next.js 15 standalone, tienda pública.
- Producción enruta `/erp/`, `/api/` y `/uploads/` desde el gateway nginx. La barra final de `proxy_pass ...frontend/` es significativa: recorta `/erp/` y permite servir los assets del ERP desde la raíz del contenedor.

## 6. Estado funcional consolidado

### Pagos multicanal / POS

- Implementados efectivo, POS físico, QR (Yape/Plin) y link.
- Efectivo se confirma inmediatamente; canales externos quedan pendientes.
- Solo Crisitus/rol 1 configura proveedores, selecciona el predeterminado y confirma pagos.
- El backend impide a vendedores elegir otro proveedor o confirmar.
- Referencia única por proveedor y auditoría de registrador/confirmador/fechas.
- No se guarda PAN, CVV, PIN ni track; solo marca/últimos cuatro opcionales.
- Pendiente: migración MySQL 5.7, pruebas de roles/idempotencia/rollback, configuración real del adquirente y prueba con voucher antes de deploy.

Archivos principales: `Backend/src/{models/adquirente_pos.model.js,models/pago_pos.model.js,controllers/pos.controller.js,routes/pos.routes.js}` y `Frontend/src/{services/posService.ts,pages/payments/PaymentsPage.tsx}` más integración en ventas.

### Servicio Técnico

- Separados tres flujos: solicitud web, ingreso rápido interno y orden técnica.
- Implementados formulario público, bandeja ERP, conversión a orden, tablero, historial de eventos, anulación lógica auditada y garantía iniciada al entregar.
- El script `Backend/src/scripts/ensure-service-schema.js` actualiza instalaciones existentes de forma idempotente.
- Pendiente visual/funcional: historial dentro del expediente, documentos formales, pagos parciales, repuestos, evidencias privadas, consentimiento versionado, garantía/reingresos y caja técnica conciliable.
- Bloqueo operativo registrado: la instancia antigua del backend en `3100` debe reiniciarse de forma controlada para cargar el código/esquema nuevo; no levantar un duplicado.

### Tienda, banners y UX

- Carrito con notificación discreta, carrusel/banners administrables, corrección de mensaje de login y checkout Culqi reforzado.
- Pendiente confirmar persistencia real de banners después de reiniciar correctamente el backend.
- Logo “C”: tamaño aprobado; pedido registrado de moverlo 18 px a la derecha sin alterar espaciados.

## 7. Infraestructura y riesgos conocidos

- `docker-compose.yml` (Traefik) y `docker-compose.vps.yml` (gateway real) representan arquitecturas distintas. Usar el compose equivocado puede romper `/erp/`.
- Producción declarada usa MySQL 5.7, fuera de soporte desde octubre de 2023; planificar migración a 8.0 con respaldo, ensayo y revisión de autenticación/compatibilidad.
- Verificar la configuración nginx viva antes de cambiar rutas. No reabrir H2/H6 sin comprobar gateway y barra final de `proxy_pass`.
- Mantener rate limiting de autenticación y protección estricta de uploads privados.

### Servidor Ryzen (host de infra) — acceso compartido para cualquier IA

- Host físico: `DESKTOP-S83K8G1` — Ryzen 5 PRO 3400G (4C/8T), 14 GB RAM, Win 11 Pro. Disco `D:` con ~877 GB libres para datos/Docker/respaldos.
- **Acceso desde esta laptop para CUALQUIER IA o herramienta:** `ssh ryzen "<comando PowerShell>"`. El alias `ryzen` está definido en `~/.ssh/config` (usuario `ACM`, llave `~/.ssh/criscom-ryzen-server-ed25519`, IP fija `192.168.15.56`). El shell remoto por defecto ya es PowerShell, así que se pueden encadenar comandos con `;` sin escaping raro.
- IP **estática** `192.168.15.56` y `sshd` en arranque automático → sobrevive reinicios sin intervención. Está en Wi-Fi (perfil de todos los usuarios, conecta sin login); hay puerto Ethernet libre para mayor estabilidad 24/7.
- Rol previsto: Docker Engine (sobre WSL2), web vía **Cloudflare Tunnel**, bot de WhatsApp. GPU integrada Vega 11 → **no apta para IA local pesada**; el "cerebro" del bot debe ir por API en la nube o una máquina con GPU.
- No abrir puertos en el router. Acceso público solo por Cloudflare Tunnel / Tailscale.

## 8. Validación más reciente — 2026-08-09

Auditoría ejecutada sobre la copia de Descargas, sin aplicar fixes de producto:

- Ecommerce `npm run type-check`: correcto.
- Ecommerce build aislado: correcto; 32 rutas, incluida `/servicio-tecnico`.
- Frontend tests: 11 archivos y 26 pruebas, todos correctos.
- Frontend build: falla porque falta `Frontend/src/services/posService.ts` en la copia y el test `SocialLinksPage.test.tsx` no importa globals de Vitest para el `tsc` de build.
- Backend tests: 3 suites pasan y 11 no cargan. Causas raíz observadas: `helmet`/`express-rate-limit` declarados en código pero ausentes del `node_modules` de la copia; también faltan `adquirente_pos.model.js` y `pago_pos.model.js` en esa copia.
- Conclusión: Descargas era la variante más mejorada, pero había perdido piezas POS y algunos fixes de seguridad/pagos presentes en `criscom-web`. La consolidación se hace selectivamente sobre Descargas.

## 9. Próxima acción recomendada

1. Mantener Descargas como base mejorada.
2. Integrar allí solo capacidades superiores de `criscom-web`, resolviendo conflictos por módulo.
3. Validar build/tests en Descargas y corregir regresiones.
4. Cuando la consolidación esté estable, convertirla en fuente de verdad formal y sincronizar el repo complementario sin artefactos.
5. Registrar hashes/resultado.
6. Reiniciar de forma controlada la única API de `3100` y ejecutar pruebas integrales antes de cualquier deploy.

## 10. Mensaje de arranque para otra IA

> Lee completamente `C:\Users\User\CRISCOM\criscom-web\COORDINACION_IAS.md`, luego `HANDOFF-SERVICIO-TECNICO.md`, el final de `HALLAZGOS_CRISTEM.md` y `git status --short --branch`. El repo canónico es `criscom-web`; Descargas es solo espejo revisado. Declara tus archivos en la bitácora antes de editar y no reconstruyas módulos existentes.

## 11. Bitácora de turnos

### 2026-08-09 — CRiSTEM — CERRADO / ARCHIVOS LIBERADOS

- Consolidó pagos multicanal, coordinación inicial y el relevo de Servicio Técnico.

### 2026-08-09 — CRiSTEM/Codex — CERRADO / DOCUMENTACIÓN LIBERADA

- Objetivo: unificar conocimiento durable y auditar la copia de Descargas.
- Archivos documentales: `COORDINACION_IAS.md`, `HANDOFF-SERVICIO-TECNICO.md`, `HALLAZGOS_CRISTEM.md`.
- Resultado: jerarquía de fuentes corregida, estado consolidado y fallos de sincronización documentados.
- Próximo bloque: comparación e integración bidireccional controlada; no copiar en masa.

## 12. Fusión con respaldo de Descargas — 2026-08-10

La copia de Descargas fue consolidada selectivamente con este repositorio y validada: Backend 63/63, build del Frontend ERP, TypeScript y build del Ecommerce. `criscom-web` permanece como instancia local activa; Descargas es el respaldo fusionado y probado. Los cambios futuros deben sincronizarse de forma controlada, preservando las mejoras específicas de Ecommerce e infraestructura del respaldo.
## Marketplace multinstancia (2026-08-10)

- La tienda pública muestra productos CRISCOM y de todos los negocios afiliados.
- El carrito de visitantes vive en localStorage; al autenticarse se persiste y fusiona mediante `/api/carrito`.
- Al confirmar un pedido mixto, el backend genera ventas separadas por instancia de punto de venta mediante `pedido_ventas`. Inventario, caja y libros afiliados no se mezclan con CRISCOM.
- Vendedor = encargado de CRISCOM (físico o virtual). Afiliado = negocio independiente gestionado por CRISCOM.
- El afiliado solo valida pagos de pedidos íntegramente propios. Pedidos ajenos o mixtos requieren Crisitus o Auditor temporal vigente.
- Cada afiliado recibe dos meses de prueba gratuita. Durante la prueba no se cobra 8% ni se suspende el acceso.
- Después de la prueba, la liquidación se paga con Culqi o queda pendiente de validación manual exclusiva de Crisitus.
- Marketplace: tarjeta/Culqi primero; contraentrega para delivery o recojo en tienda; luego Yape, Plin y transferencia.
- Envío: Lima y Arequipa se cotizan por ruta desde orígenes configurables (por defecto Galerías Wilson en Lima y Compuplaza, Octavio Muñoz Nájar 223, en Arequipa). Lima cobra S/10 hasta 5 km y S/7 por km adicional; Arequipa cobra S/7 hasta 5 km y S/3 por km adicional; otros destinos S/30; recojo en tienda S/0. El backend recalcula el costo y lo suma al pedido.
- Flujo ERP: impagos en `Pagos por confirmar`; pagados y contraentregas validadas en `Deliverys por confirmar`. Los impagos vencen y se eliminan a las 24 horas; también pueden eliminarse manualmente o al cancelarse.

### 2026-08-10 19:45 - CRiSTEM/Codex - REVISION AUXILIAR CERRADA / ARCHIVOS LIBERADOS

- Crisitus solicito apoyar a la instancia Anthropic desde el filesystem compartido.
- No se modifico codigo de producto ni se iniciaron procesos adicionales.
- Servicios detectados: Ecommerce `3000` (PID 10400), API `3100` (PID 27760) y ERP `5173` (PID 2104), una instancia por puerto.
- `git diff --check` detecto solamente lineas vacias nuevas al EOF en `Backend/src/routes/{categoria,company,producto,venta}.routes.js`; tambien hay avisos generalizados LF/CRLF. Pendiente limpiar al cerrar el bloque activo, evitando conversiones masivas de EOL.
- Backend tests, Frontend build y Ecommerce type-check no produjeron salida antes del timeout de 120 s bajo ejecucion paralela. No se consideran fallos funcionales confirmados; repetir por separado cuando termine el trabajo activo y revisar saturacion de Node/OpenClaw.
- Todos los archivos quedan liberados. Anthropic puede continuar sin conflicto con este turno.

### 2026-08-13 — CRiSTEM (Anthropic) — Maestra fijada + trabajo asegurado en git
- **Decisión:** MAESTRA = `criscom-web` (git). RESPALDO = `Downloads\...\merged` (snapshot sin git, congelado). DESPLIEGUE = releases Ryzen. Corrige la designación previa (Descargas ya no es "maestra": sin git no puede serlo, y está desactualizada).
- **Asegurado:** commit `05c6f68` en `work/roadmap-fase1` preserva ~255 cambios sueltos (controllers/models/tests de POS, órdenes servicio, afiliados/marketplace, carrito, seguridad). Es checkpoint de preservación, NO validado aún.
- **`.gitignore`:** añadidos `.runtime/`, `Ecommerce/.next-*/`, `*.tar.gz` (se colaban 2691 archivos basura + tarball de pagos). Untracked reales: 2691→143.
- **Pendiente (no tocado):** correr errores HALLAZGOS (H3/H7/H8...), validar build/tests, terminar módulos (Servicio Técnico, POS testing, SEO, correos, WhatsApp), migración MySQL 5.7→8.0, deploy. Requiere secuencia y pruebas.
- Archivos liberados.

### 2026-08-13 — CRiSTEM/Codex — CERRADO: tercera ola, plataforma e infraestructura
- Objetivo: validar Ecommerce, Backend, dependencias productivas y Compose real después de estabilizar el ERP.
- Archivos activos: `docker-compose.vps.yml` y esta bitácora.
- Estado previo al cambio: Ecommerce lint/type-check/build (53 páginas) correctos; Backend 151 archivos con sintaxis válida, modelos/app cargan, 26 suites y 109 pruebas correctas; `--detectOpenHandles` no reportó fugas; auditoría productiva de los tres paquetes = 0 vulnerabilidades.
- Hallazgo: el Compose VPS permitía sustituir seis variables críticas ausentes por cadenas vacías; se endurecen con validación `${VAR:?mensaje}` para abortar antes de un despliegue inválido.
- `.env.example` ahora documenta `PAYMENT_CREDENTIALS_KEY` como clave independiente de `JWT_SECRET`.
- Verificación: sin variables, Compose falla temprano con el nombre faltante; con las seis variables requeridas, `docker compose -f docker-compose.vps.yml config --quiet` finaliza correctamente.
- No se inició ni desplegó ningún servicio. Archivos liberados.

### 2026-08-13 — CRiSTEM/Codex — CERRADO: segunda ola de validación ERP
- Objetivo: ejecutar lint, tests y build del ERP tras `90c3973`, corrigiendo errores bloqueantes sin ampliar alcance.
- Archivo activo: `Frontend/src/pages/offers/OffersPage.tsx`.
- Primer hallazgo: ESLint reportó un único error (`no-empty`) en el fallback del escáner de código de barras; las 346 advertencias preexistentes no bloqueantes quedan fuera de este micro-fix.
- Corrección: el fallback ahora documenta explícitamente que continúa con la búsqueda local y elimina el `any` innecesario del `catch`.
- Verificación: ESLint sin errores (`--quiet`), Vitest 11/11 archivos y 26/26 pruebas, build productivo Vite/TypeScript correcto (3653 módulos).
- Riesgo no bloqueante: Vite advierte chunks mayores de 500 kB; conviene tratarlo como optimización separada.
- Archivos liberados.

### 2026-08-13 — CRiSTEM/Codex — CERRADO: ventas y pedidos enlazados con kardex

- Fuente canónica: `criscom-web`, rama `work/roadmap-fase1`.
- Punto de partida en producción: release `413d07e`. El cambio descrito aquí todavía no está desplegado.
- Commit local `00aa45b` (`fix: enlazar ventas con kardex y proteger stock web`).
- Las ventas creadas desde el ERP ahora registran un `movimientos_inventario` de tipo `venta` dentro de la misma transacción que crea la venta, sus detalles y descuenta existencias.
- La finalización de pedidos web pagados también crea la venta, descuenta stock y registra el movimiento de kardex dentro de una única transacción. Cada movimiento conserva stock anterior/nuevo, costo, usuario, referencia a la venta y negocio propietario.
- Se eliminó una posibilidad de sobreventa web: el backend agrupa líneas repetidas del mismo producto antes de validar existencias. La finalización vuelve a validar el total reservado bajo bloqueo de escritura.
- Validación: 26/26 suites y 110/110 pruebas del Backend; pruebas específicas de ventas/pedidos 11/11. Árbol Git limpio al cerrar el bloque.
- Próximo bloque obligatorio: auditar caja diaria y conciliación `pedido → pago → venta → caja → comprobante → entrega → reportes`. No asumir que caja o reportes están correctos solo porque venta, stock y kardex ya coinciden.
- Archivos liberados: `Backend/src/controllers/{pedido,venta}.controller.js`, `Backend/src/services/order-finalization.service.js` y sus pruebas de integración.

### 2026-08-13 — CRiSTEM/Codex — CERRADO: facturación y caja de Servicio Técnico

- Regla operativa definida por Crisitus: Servicio Técnico sin productos/repuestos se clasifica como `recibo_honorarios`; si contiene cualquier producto o repuesto, la operación completa se clasifica como `boleta_factura`.
- Al completar el pago se crea idempotentemente una venta contable de categoría `servicios`, enlazada uno a uno con `ordenes_servicio`. La orden queda `pendiente_emision`; no se declara aceptada por SUNAT sin respuesta real del proveedor fiscal.
- El cierre en estado `entregado` exige pago completo y venta contable creada. Después de facturar se bloquean cambios de importes, nuevos repuestos y anulaciones operativas de pagos.
- Los repuestos de inventario crean movimiento de kardex `reserva`; su retiro crea `liberacion`. La corrección evita descuentos de stock sin trazabilidad.
- Caja Técnica separa `cobrado_servicios`, `cobrado_repuestos`, costo de repuestos, cobro total, anulaciones, saldo y método de pago. Los periodos hoy/semana/mes y rango personalizado se calculan en Backend.
- Límite explícito: todavía no existe integración externa RHE de SUNAT en el proyecto. El ERP clasifica, contabiliza y deja la emisión pendiente; nunca inventa número, aceptación ni constancia RHE.
- Validación: Backend 27/27 suites y 114/114 pruebas; prueba específica 3/3; ERP TypeScript/build (3655 módulos) y ESLint de archivos modificados correctos. Cambio aún no desplegado.

### 2026-08-23 — CRiSTEM (Anthropic) — CERRADO: fix visibilidad Gerente + íconos submenú Servicio Técnico

- Archivo tocado: `Frontend/src/layouts/DashboardLayout.tsx`.
- Bug: el bloque de menú "Servicio técnico" se incluía con `isMasterLike || userRole===6 || grant`, e `isMasterLike` depende del email maestro (`isCrisitus`). Efecto: un **Gerente (rol 1)** que no fuera la cuenta maestra NO veía el área técnica en el menú, pese a que las rutas `/services*` permiten `[1,6]` + `area_grants('servicio_tecnico')` + superusuario temporal (`RoleProtectedRoute` líneas 34/44). Menú más restrictivo que las rutas.
- Fix: gate ahora `isMasterLike || [1,6].includes(userRole) || grant` → consistente con `App.tsx`/`RoleProtectedRoute`. Sin ampliar permisos reales (rol 1 ya estaba permitido por ruta).
- Submenú: íconos repetidos `Wrench` (padre + "Resumen del taller" + "Expedientes técnicos") diferenciados → "Resumen del taller" `Gauge`; "Expedientes técnicos" `ClipboardList`.
- NO tocado: rol 2 (Administrador). Meterlo al área técnica exige también cambiar las rutas `[1,6]`; queda como decisión de permisos pendiente de Crisitus.
- Validación: `tsc -b && vite build` OK (1m1s), solo warning preexistente de chunk >500 kB.
- Pendiente al cerrar: commit + push al backup `Crisitus/criscom-web`, refresco del respaldo Descargas a HEAD, y confirmar con Crisitus el deploy a prod Ryzen.

### 2026-08-24 — CRiSTEM/Codex — ACTIVO: núcleo técnico P0

- Relevo obligatorio: `docs/AUDITORIA-REFERENTES-TALLER-2026-08-24.md`, `docs/MATRIZ-BRECHAS-TALLER-2026-08-24.md` y artefactos enlazados.
- Objetivo: activo técnico, recepción estructurada, compatibilidad e inventario técnico sin duplicar fuentes.
- Investigación profunda: Repair Pro con 14 módulos, 86 submenús seguros, 10 filtros de reparaciones, 8 formularios y 10 pestañas de configuración abiertos sin guardar; base actual de 69 tablas, 32 vistas, 53 triggers y 126 índices. Sistema Taller inventariado hasta su archivo PyInstaller/PYZ (1552 entradas, 1460 módulos), configuración, LAN/móvil/fiscalidad y previews. CRISCOM cruzado contra modelos, controladores y navegación.
- Riesgos de referente documentados: quants lote/serie defectuosos, posible cadena incompleta del trigger POS, localización/defaults argelinos y backups nunca verificados. No copiar.
- Código de producto todavía no modificado en este bloque.
- Preflight externo bloqueado por API key inválida del buscador Gemini.
- No desplegar ni sincronizar Descargas hasta implementar y validar.

### 2026-08-24 — CRiSTEM (Anthropic) — CERRADO: blueprint de mejoras SpotsPOS (solo diseño)
- Contexto: Crisitus pidió usar la investigación de SpotsPOS (cuarto referente) para mejorar el ERP. Detecté que el bloque **P0 núcleo técnico está ACTIVO por Codex**, así que NO edité código de producto ni archivos de ese P0 para evitar choque.
- Entregable (solo documentación): `docs/MEJORAS-ERP-SPOTSPOS-2026-08-24.md` — delta sobre `MATRIZ-BRECHAS-TALLER-2026-08-24.md` con 8 specs buildables (S1 firma digital, S2 notificaciones de estado automáticas, S3 cierre de caja/end-of-day, S4 multi-tienda + transfer, S5 sugerencias gobernadas SpotsAI, S6 citas, S7 reseñas, S8 analítica peak-hours), cada uno con modelo de datos, endpoints, UI, criterios de aceptación y dependencias respecto al P0/P1.
- Recomendación de arranque no-choque: S1, S3, S8 (no tocan inventario/activo técnico de Codex). S2/S4/S5/S6/S7 dependen de P0-C (WMS) y P1-C (outbox).
- Archivos tocados: `docs/MEJORAS-ERP-SPOTSPOS-2026-08-24.md` (nuevo) y esta bitácora. Cero código de producto. Bloque liberado.

### 2026-08-24 — CRiSTEM (Anthropic) — ACTIVO: relevo del P0 (Codex sin tokens) + implementación S1 (firma digital)
- Crisitus confirmó que **Codex se quedó sin tokens** → el bloque "núcleo técnico P0" queda muerto. CRiSTEM (Anthropic) **toma el relevo** del taller.
- Este bloque implementa **S1 (firma digital)** de `docs/MEJORAS-ERP-SPOTSPOS-2026-08-24.md`: captura de firma en recepción y en aceptación de garantía, reutilizando el pipeline de evidencias (etapas nuevas `firma_recepcion`/`firma_garantia`, `tipo=firma`, SHA-256, siempre privada). Sin gate destructivo a la transición `entregado` (se deja como política opt-in posterior para no romper tests/producción).
- Archivos declarados ACTIVOS por este bloque:
  - `Backend/src/models/orden_servicio_evidencia.model.js`
  - `Backend/src/scripts/ensure-service-schema.js`
  - `Backend/src/controllers/ordenServicio.controller.js`
  - `Frontend/src/pages/services/WorkOrdersPage.tsx` y componente nuevo `Frontend/src/components/services/SignaturePad.tsx`
- No tocar en paralelo. Validación objetivo: suite backend de servicio + `tsc -b && vite build`. No desplegar sin OK de Crisitus.

### 2026-08-25 — CRiSTEM (Anthropic) — ABIERTO: catálogo de imágenes (delta) + versionado
- Crisitus: "encárgate de todo" del relevo de imágenes (`HANDOFF-CATALOGO-IMAGENES-2026-08-25.md`).
- Archivos declarados ACTIVOS: `Backend/src/scripts/{verified-image-manifest.json,import-verified-images.js,catalog-image-queue.js}` (ahora versionados en git; commit `f744c6e`, antes untracked) y el handoff de imágenes. NO toco los archivos del bloque S1 firma digital.
- Método mejorado (detalle en el handoff, sección "Método mejorado 2026-08-25"): `web_search` Gemini sigue caído → buscador nativo/APIs directas; `curl` LOCAL residencial para saltar el WAF de datacenter (AMD/Amazon dan 403/ECONNRESET al datacenter, 200 desde la IP de casa); extracción de hi-res de Amazon del HTML crudo + render oficial AMD; verificación visual real (Commons = fotos caseras, descartado); import por DELTA (solo IDs nuevos) para no re-procesar ni arriesgar galerías buenas.
- Hecho: 2686 AMD Ryzen 7 7700X (`100-100000591WOF`) con 3 vistas limpias → prod. Auditoría en vivo: pending 2879→2878, missing 7189→7186; contenedor `criscomgroup-backend` healthy.
- Insight: la lista de "bloqueados/ambiguos" no estaba realmente bloqueada, faltaba la fuente correcta. Aparte: varios registros tienen datos corruptos (nombre/precio) que se arreglan en el producto, no con imagen.
- Bloque ABIERTO: continúa por lotes priorizando precio/rotación. Registrar IDs y conteos en el handoff en cada lote.
