# Port criscom-ecom-servicios -> Ecommerce Next.js (informe)

Fecha: 2026-10-11. Estado: **completado**.
Continua y termina el trabajo iniciado por un writer anterior (components/servicios/*, styles/servicios.css, entrada de /importaciones).

## Alcance entregado
1. **Parseo arreglado**: `ImportacionesForm.tsx` tenía un fragmento JSX sin cerrar en el `titulo` de la sección plegable "Enlaces de imágenes" (tumbaba el dev server con 500 global). Cerrado; tsc queda en 0.
2. **/importaciones**: entrada fina server con metadata + `ImportacionesForm` (diseño: secciones "Qué producto buscas" / "Tus datos", segmento de 7 tipos con icono, presupuesto US$, detalles e imágenes plegados, errores por campo + resumen, 409/429/red con aviso, éxito con código SOL- grande y copiable). Honeypot corregido: el writer anterior enviaba siempre `website` vacío (input no controlado); ahora se lee del `FormData` en el submit (el backend responde éxito falso a bots).
3. **/solicitud-importacion**: `redirect("/importaciones")` (ya estaba; verificado 307).
4. **/armar-pc**: reescrito. Asistente de 3 pasos del diseño: (1) camino (3 tarjetas planas: Sé lo que quiero / Guíame / Traigo mis piezas, Continuar deshabilitado con motivo hasta elegir), (2) rama: marketplace (buscador, cantidades, total referencial S/ en vivo, aside + barra fija móvil), presupuesto (tiers, "otro" con monto S/, uso, periféricos, marcas, prioridades máx. 2 con contador y 3.ª deshabilitada con motivo), ensamble propio (mensaje mín. 10 con contador y motivo), (3) datos (nombre, teléfono, ciudad, email opcional) + envío. Éxito con código ARM- y recap por camino.
5. **/servicio-tecnico**: reescrito (segmento de 6 equipos, marca/modelo, falla con contador, disponibilidad, datos, checkbox de consentimiento con error 400 mapeado). Éxito con código WEB- y nota del token privado. **/servicio-tecnico/seguimiento**: consulta por token (formulario, skeleton, 404 con Reintentar + WhatsApp config-driven, error de red distinto de vacío), resultado con cabecera (código/equipo/chip de estado con icono), fechas, línea de tiempo de avances y cuadrícula de evidencias con URL firmada del endpoint; ambas con empty-state. Deep link `?codigo=`/`?token=` conservado.

## Archivos
- `Ecommerce/components/servicios/ImportacionesForm.tsx` (fix parseo + honeypot + import css)
- `Ecommerce/components/servicios/ExitoSolicitud.tsx` (variante `out` para la acción primaria)
- `Ecommerce/components/servicios/ArmarPcMarketplace.tsx` (quitado eslint-disable sin uso)
- `Ecommerce/components/servicios/serviciosShared.tsx`, `serviciosValidacion.ts` (del writer anterior, sin cambios)
- Nuevos: `ArmarPcWizard.tsx`, `ArmarPcPresupuesto.tsx`, `ArmarPcPropio.tsx`, `ArmarPcDatos.tsx`, `ServicioTecnicoForm.tsx`, `SeguimientoOrden.tsx`, `SeguimientoResultado.tsx`
- Páginas (entrada fina server + metadata): `app/(public)/armar-pc/page.tsx`, `servicio-tecnico/page.tsx`, `servicio-tecnico/seguimiento/page.tsx`, `importaciones/page.tsx`, `solicitud-importacion/page.tsx` (redirect, sin tocar)
- `Ecommerce/styles/servicios.css` (contenedor max-1280/32px como el diseño; fix oscuro `.dark .pg-servicios span` por el `!important` gris de globals.css; capitalize de etapa de evidencia)
- Backups: `odd/backup/ecommerce/servicios/` (4 `.pre-port` ya existentes y verificados idénticos + `importaciones.page.tsx.w1` del writer anterior)

## Verificación observada
- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T ecommerce sh -c 'npx tsc --noEmit'`: **0 errores en todo el proyecto** (grep -c "error TS" = 0; no quedaron errores de otros writers).
- `npx eslint "app/(public)/armar-pc" "app/(public)/servicio-tecnico" "app/(public)/solicitud-importacion" "app/(public)/importaciones" "components/servicios"`: **0 problemas** (sin salida).
- Rutas: `/importaciones`, `/armar-pc`, `/servicio-tecnico`, `/servicio-tecnico/seguimiento` -> **200**; `/solicitud-importacion` -> **307 a /importaciones**; home 200.
- Playwright (chromium_headless_shell-1243, contexto propio, 1440x900 / 1280x720 / 390x844, claro+oscuro, 16 escenarios): **0 gradientes, 0 backdrop-filter, 0 box-shadow, 0 objetivos <44 px** (checkbox medido a >=24) **en .pg-servicios, sin overflow-x, 0 pageerror**. h1 en x=112 (1440), x=32 (1280), x=16 (390) como el diseño. Oscuro: `.mut` rgb(148,163,184) (token), no el gris forzado #C0C0C0.
- Flujos UI (Playwright, marca seed-ecom): importación **SOL-20261011-YKEK8P4HGQ** (id 7; éxito + "Copiar código" con portapapeles verificado); servicio **WEB-261011-7370B5**; armar-pc presupuesto **ARM-20261011-8T8X8BGSCZ** (3.ª prioridad `aria-disabled=true` observado). Reenvío idéntico de la importación -> **409 "Solicitud duplicada" con enlace a /seguimiento** (captura `flujo-imp-409.png`).
- Flujos API (curl, marca seed-ecom): importación **SOL-20261011-MMJ8JCDMPW** (id 6) y seguimiento por código+teléfono4 OK; servicio **WEB-261011-3E9B4D**; ensamble **ARM-20261011-TRR8HKHKNG**; seguimiento de orden `seedtoken04` -> ST-SEED-004 con 8 avances; token inexistente -> **404**.

## Diseño vs backend (diferencias)
- Ninguna orden de servicio en dev tiene evidencias con `visible_cliente=1`: la cuadrícula real con imágenes no pudo ejercitarse con datos; el empty-state sí (ST-SEED-004, MT-SEED-008). ST-SEED-006 del JSON de diseño no tiene avances en DB (el ejemplo era aspiracional); se verificó con ST-SEED-004.
- La línea de tiempo de ST-SEED-004 muestra "En reparación" dos veces: son dos eventos reales del backend, no un fallo del front.
- `solicitudes-servicio` no tiene honeypot en el backend (importación y ensamble sí): se conserva el input oculto del diseño pero no se envía. Los otros dos POST lo envían leyéndolo del `FormData`.
- El 400 de `solicitudes-servicio` devuelve `{message}` plano (sin mapa por campo): el front valida todo en cliente y mapea el mensaje de consentimiento a su campo; el resto se muestra como aviso.
- El aviso 409 enlaza a `/seguimiento` (página unificada del proyecto cuenta, fuera de este port).

## Pendientes / riesgos
- En 390 px, el botón flotante del toggle de tema (chrome global, `components/layout`, fuera de superficie) se superpone al botón "Continuar" de la barra fija inferior del marketplace. No editado por regla; evaluar en el proyecto chrome.
- Clipboard en headless sin permisos: "Copiar código" degrada en silencio (diseñado así; con permisos otorgados copia y anuncia "Copiado").

## Seeds creados (marca seed-ecom)
- `solicitudes_importacion`: id 6 SOL-20261011-MMJ8JCDMPW (curl), id 7 SOL-20261011-YKEK8P4HGQ (UI; la 2.ª ejecución idéntica sirvió de prueba 409).
- `solicitudes_servicio`: WEB-261011-3E9B4D (curl), WEB-261011-7370B5 (UI).
- `solicitudes_ensamble`: ARM-20261011-TRR8HKHKNG (curl, presupuesto gamer), ARM-20261011-8T8X8BGSCZ (UI, presupuesto gamer).
