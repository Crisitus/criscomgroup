# Auditoría de referentes de taller y roadmap CRISCOM

Fecha: 2026-08-24. Fuente canónica: este repositorio, rama `work/roadmap-fase1`.

## Artefactos completos

- Matriz profunda y relevo: `C:\Users\User\CRISCOM\criscom-web\docs\MATRIZ-BRECHAS-TALLER-2026-08-24.md`.
- Informe: `C:\Users\User\CRISCOM\cristem\generated\auditoria-sistemas-taller-criscom.md`.
- Mapa: `C:\Users\User\CRISCOM\cristem\generated\mapa-menus-tres-sistemas.html`.
- Flujo: `C:\Users\User\CRISCOM\cristem\generated\flujo-taller-criscom.html`.
- SQLite Repair Pro: `C:\Users\User\CRISCOM\cristem\generated\repair-pro-database-audit.json`.
- SQLite profunda Repair Pro: `C:\Users\User\CRISCOM\cristem\generated\repair-pro-database-deep-audit.json`.
- UI Repair Pro: `repair-pro-uia-pages.json`, `repair-pro-uia-forms-and-support.json`, `repair-pro-uia-submenus.json` y `repair-pro-uia-repair-submenus.json` bajo `generated`.
- Binario Sistema Taller: `sistema-taller-pyinstaller-inventory.json` y `sistema-taller-pyz-modules.json` bajo `generated`.
- Manifiesto para otra IA: `C:\Users\User\CRISCOM\cristem\generated\auditoria-taller-handoff-2026-08-24.json`.
- Prueba/limpieza: `C:\Users\User\CRISCOM\cristem\generated\repair-pro-audit-seed.json`.
- Respaldo: `C:\Users\User\CRISCOM\cristem\generated\audit-backups\20260824-043112`.

## Lectura de evidencia

`UI-V` visto; `UI-A` accesibilidad; `DB-A` base; `BIN-A` ejecutable; `CFG-A` flag; `SRC-A` código; `COND` condicionado/no ejecutado.

## Hallazgos

Sistema Taller destaca en recepción, foto/audio, PIN/patrón, servicio rápido, PDF/ticket/etiqueta, WhatsApp, caja y POS. Su binario también contiene infraestructura LAN/móvil/sincronización y fiscalidad multinacional, pero no se considera una función habilitada solo por estar empacada. No evidencia catálogo visible, compatibilidad formal, inventario técnico ni IA diagnóstica.

Repair Pro: 14 módulos laterales, 86 capturas de submenús seguros, 10 filtros de reparación, 8 formularios de alta abiertos y 10 pestañas de configuración. Base actual: 69 tablas, 32 vistas, 53 triggers, 126 índices, 27 migraciones, 1100 modelos y 63 marcas; reparación, compatibilidad, quants/movimientos, despiece, piezas recuperadas, pérdidas, IA, POS, facturación, QR, cámaras, WhatsApp, migración, nube/móvil/LAN, usuarios y auditoría.

Defectos a no copiar: unicidad de quants que no modela correctamente varios lotes/seriales; riesgo de trigger POS que requiere validar capa de aplicación; mezcla francés/inglés/español y defaults argelinos. El backup instalado nunca fue verificado y el último intento falló con 401 por credenciales inválidas.

Dataset `AUDIT-*` creado: cliente, producto serializado, quant, reparación, repuesto, adelanto, gasto, despiece, pieza recuperada, cotización y factura. Activó `low_stock` y badges. Relaciones limpiadas; cliente/producto quedaron archivados porque Repair Pro prohíbe hard-delete. La inserción directa no prueba reserva/descuento/liberación desde UI.

CRISCOM ya tiene solicitudes web, ingreso, expedientes, historial, anulaciones, cotizaciones versionadas, pagos, repuestos/Kardex, evidencias, IA revisada por humano, WhatsApp/OpenClaw, garantía/reingreso, caja y gastos. No duplicar.

## Arquitectura P0

`Cliente → Activo técnico → Orden → Diagnóstico → Cotización → Inventario/repuestos → Pruebas → Entrega → Garantía`.

1. Activo/modelo/variante y recepción estructurada.
2. Extender inventario actual con ubicación, condición, lote, serie y disponible/reservado.
3. Compatibilidad explicable compartida por taller, armado, ventas y compras.
4. Bóveda efímera cifrada para desbloqueo; destruir al entregar.
5. Usados/despiece sobre `adquisiciones_usados`, SMART/TBW/ciclos, grado, QR y margen.
6. IA con fuentes, confianza, versión, costo/tokens y feedback; aprobación humana obligatoria.

## Navegación

- Ingreso: `Cliente → Identificar equipo → Estado y accesorios → Evidencias → Consentimientos → Comprobante`.
- Expediente: `Recepción`, `Diagnóstico`, `Cotización`, `Trabajo y repuestos`, `Pruebas`, `Pagos`, `Entrega y garantía`, `Historial`.
- Inventario: `Existencias`, `Ubicaciones`, `Movimientos`, `Compatibilidad`, `Series y lotes`, `Equipos usados y despiece`.

## Restricciones y continuidad

- Preflight web bloqueado por API key inválida de Gemini; repetir antes de adoptar dependencias.
- Preservar `affiliate_business_id`, idempotencia, concurrencia, rollback y privacidad.
- Nuevas tablas/columnas deben entrar en `ensure-service-schema.js`.
- No desplegar ni sincronizar Descargas hasta validar.
- Estado al crear este relevo: auditoría profunda terminada; implementación P0 aún no iniciada. Comenzar por una migración vertical pequeña `Cliente → Activo técnico → Orden` con pruebas, no por reescribir `WorkOrdersPage.tsx`.
