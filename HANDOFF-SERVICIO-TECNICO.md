# Relevo técnico — módulo Servicio Técnico CRISCOM

Fecha: 2026-08-09  
Proyecto activo (espejo de código): `C:\Users\User\CRISCOM\criscom-web`  
Copia maestra vigente que debe permanecer sincronizada: `C:\Users\User\Downloads\CRISCOM-fusion-work-2026-08-10\merged` (la vieja `Cris-proyecto-respaldo-2026-08-03` quedó **obsoleta**).

## Objetivo acordado

Construir dentro del ERP un apartado desplegable único llamado **Servicio técnico**, conservando la estética actual de CRISCOM y una navegación fluida. La solicitud pública y el ingreso por técnico son flujos diferentes:

- Solicitud web: pre-solicitud; no es todavía una orden ni inicia garantía.
- Ingreso rápido interno: recepción física mínima por el técnico/recepción.
- Orden técnica: expediente completo tras recibir el equipo.

## Referencias analizadas

Se inspeccionaron las cuentas de Instagram `reparopro.latam` y `richard.celulares`, además de la aplicación local `C:\Users\User\Downloads\SistemaTallerDemo.exe` (versión B0.211).

Funciones detectadas en la demo: órdenes, clientes/equipos, marca/modelo, IMEI/serie, estado físico, accesorios, fotos, audio, PIN/patrón, diagnóstico, reparación, cotización, adelantos, recargos, saldo, servicio rápido, estados configurables, PDF, ticket 80 mm, etiqueta 40x30, WhatsApp, garantías, órdenes anulables con auditoría, caja técnica separada del POS y configuración de condiciones legales.

Decisión: aprovechar la funcionalidad, pero no copiar su UI sobrecargada. CRISCOM usa capas y progressive disclosure.

## Capas previstas

1. Recepción y solicitudes.
2. Orden, diagnóstico, presupuesto y autorización.
3. Ejecución, repuestos, pruebas y evidencia.
4. Cobros, saldos y caja técnica.
5. Entrega, garantía, reingreso e historial.
6. Documentos: orden, cotización, ticket, etiqueta y constancia.
7. Legal: autorización de diagnóstico, datos personales, respaldo/pérdida de información, abandono del equipo, límites de garantía y firmas.
8. Configuración: estados, tipos de equipo, formas de pago, plantillas y condiciones.

## Implementado

### ERP

- `Frontend/src/pages/services/QuickIntakePage.tsx`: ingreso interno simple.
- `Frontend/src/pages/services/WorkOrdersPage.tsx`: tablero, filtros, expediente, estados rápidos, impresión, WhatsApp, saldos y CSV.
- `Frontend/src/pages/services/WebRequestsPage.tsx`: bandeja de solicitudes públicas y conversión explícita a orden.
- `Frontend/src/services/workOrderService.ts`: servicio existente de órdenes.
- `Frontend/src/services/serviceRequestService.ts`: API de solicitudes web.
- `Frontend/src/layouts/DashboardLayout.tsx`: apartado desplegable Servicio técnico.
- `Frontend/src/App.tsx`: rutas `/services/intake`, `/services/web-requests`, `/services/technical`, `/services/pc-builds`.

### Backend

- Modelo nuevo `Backend/src/models/solicitud_servicio.model.js`.
- Controller nuevo `Backend/src/controllers/solicitudServicio.controller.js`.
- Router admin nuevo `Backend/src/routes/solicitudServicio.routes.js`.
- Endpoint público `POST /api/ecommerce/solicitudes-servicio`.
- Endpoints ERP protegidos: `GET/PUT /api/solicitudes-servicio` y `POST /api/solicitudes-servicio/:id/convertir`.
- La conversión crea una `OrdenServicio`, conserva el código web en accesorios/notas y deja pendiente verificar físicamente el equipo.

### Ecommerce

- Página pública nueva `Ecommerce/app/(public)/servicio-tecnico/page.tsx`.
- Servicio `ecommerceServiceRequestService` en `Ecommerce/services/ecommerceApi.ts`.
- Enlace “Servicio técnico” agregado al header.
- Consentimiento básico: la solicitud no equivale a diagnóstico, cotización ni garantía.

## Estado de validación

- Build del ERP completado correctamente (`npm run build`).
- Vite advierte sobre tamaño de bundle existente; no es un error del módulo.
- `localhost:3000/erp/services/intake` y `/erp/services/technical` respondieron HTTP 200 antes de la última capa.
- Backend actual corre en 3100 como API interna; la web pública/ERP se sirve por 3000. No confundirlos.

## Pendiente inmediato antes de considerar terminada la capa 1

1. Ejecutar build de Ecommerce.
2. Ejecutar prueba de sintaxis/backend y reiniciar una sola instancia del backend para que Sequelize cree `solicitudes_servicio`.
3. Probar POST público, listado ERP y conversión con autenticación maestra.
4. Confirmar el dropdown responsive en escritorio/móvil.
5. Sincronizar nuevamente todos los archivos con la carpeta de Descargas.

## Siguientes capas recomendadas

- No borrar órdenes: añadir `anulada`, motivo, usuario y fecha de anulación.
- Modelo de eventos/historial de estado (no sobrescribir solamente `estado`).
- Modelo de pagos parciales; `adelanto` único es insuficiente.
- Repuestos/componentes como renglones vinculados a inventario.
- Evidencias privadas (fotos/audio) con uploads protegidos.
- Aprobación de cotización y evidencia de consentimiento.
- Garantía: fecha inicio al entregar, vencimiento, cobertura, exclusiones y reingreso asociado a orden original.
- Condiciones legales configurables y versionadas; no hardcodear textos definitivos sin revisión legal peruana.
- PDF formal, ticket 80 mm y etiqueta; reutilizar infraestructura PDF existente cuando sea posible.
- Caja técnica separada de POS, pero conciliable con caja diaria.
- Seguimiento público mediante token no predecible, mostrando solo campos seguros.

## Restricciones y decisiones

- Acceso del apartado técnico actualmente restringido al usuario maestro `cristophercalioro@gmail.com` y rol 1, siguiendo la implementación previa.
- No iniciar pruebas gratuitas ni aceptar condiciones/cobros externos sin autorización explícita.
- Preservar estética, espaciados y responsive del ERP existente.
- Aplicar cambios tanto al proyecto activo como a la copia de Descargas.
- No levantar otro backend si 3100 ya está ocupado; comprobar puertos primero para evitar `EADDRINUSE` y alertas rojas de OpenClaw.

## Avance posterior al relevo inicial — 2026-08-10

- Corregido el tipado del menú desplegable responsive de Servicio técnico.
- Ecommerce compilado correctamente usando `NEXT_DIST_DIR=.next-validation`; la ruta `/servicio-tecnico` aparece en el build.
- Se agregó `distDir: process.env.NEXT_DIST_DIR || '.next'` para validar sin competir con `next dev` por `.next`.
- Flujo solicitud web → bandeja ERP → conversión a orden probado en API temporal 3101: estados HTTP 201/200/201. Registros de prueba eliminados.
- Nueva trazabilidad: modelo `ordenes_servicio_eventos`, endpoint `GET /api/ordenes-servicio/:id/historial` y eventos de creación/edición/cambio de estado/anulación.
- Garantía ampliada: inicio y fin, cobertura, exclusiones, fecha real de entrega y orden original para futuros reingresos.
- La garantía comienza automáticamente al cambiar a `entregado`; prueba verificada con 30 días exactos.
- El DELETE lógico ahora anula con motivo obligatorio y conserva la orden para auditoría.
- Script `ensure-service-schema.js` agrega de forma idempotente las columnas nuevas a instalaciones existentes.
- TypeScript del ERP y build aislado de Ecommerce: correctos. Sintaxis y prueba funcional del backend: correctas.

### Bloqueo operativo actual

La API principal de 3100 sigue siendo la instancia antigua PID 11040, iniciada con privilegios superiores. Windows negó detenerla desde OpenClaw. No se levantó un duplicado. Para activar el código nuevo en localhost debe cerrarse/reiniciarse esa instancia elevada; al arrancar ejecutará `ensureServiceSchema`.

### Próximo trabajo recomendado

1. Exponer el historial visualmente dentro del expediente ERP.
2. Completar documentos de garantía con cobertura/exclusiones y fecha de vigencia.
3. Añadir pagos parciales como movimientos, no un solo campo `adelanto`.
4. Añadir repuestos/componentes por renglón e integración opcional con inventario.
5. Evidencias privadas y consentimiento versionado.

## Consolidación de coordinación — 2026-08-09

- El índice maestro vigente es `COORDINACION_IAS.md`; este archivo queda como relevo especializado de Servicio Técnico.
- Crisitus confirmó que Descargas es la versión más mejorada y base de consolidación; `criscom-web` aporta módulos puntuales.
- La auditoría más reciente confirmó que Ecommerce compila y que sus tipos pasan en Descargas, incluida `/servicio-tecnico`.
- La copia de Descargas no puede validar el ERP/Backend completo porque le faltan archivos del módulo POS y tiene dependencias locales desincronizadas. Esto no invalida el diseño de Servicio Técnico, pero impide declarar el espejo saludable hasta sincronizarlo desde el canónico.
- Antes de continuar capas nuevas: integrar diferencias válidas, validar el repo canónico, sincronizar el espejo y reiniciar controladamente la única API de `3100`.

## Rediseño UI de la página pública — 2026-08-11

- **Qué cambió:** el formulario público `Ecommerce/app/(public)/servicio-tecnico/page.tsx` adoptó el mismo sistema visual del menú **Importa con Nosotros** (`solicitud-importacion/page.tsx`) para unificar la experiencia. No cambió ningún flujo, endpoint ni permiso: sigue usando `ecommerceServiceRequestService.crear` (`POST /api/ecommerce/solicitudes-servicio`) y conserva el consentimiento legal (la solicitud no equivale a diagnóstico, cotización ni garantía).
- **Detalles del rediseño:**
  - Ahora es **theme-aware** (respeta claro/oscuro del sitio). Antes estaba clavado en `bg-slate-950`, por lo que desentonaba en modo claro.
  - Gradientes `primary→secondary`, ícono hero en caja con gradiente, título con gradiente, fondo con blobs y animaciones `framer-motion`.
  - El campo **Tipo de equipo** pasó de un `<select>` plano a **tarjetas seleccionables con íconos** (PC/laptop, celular, monitor, impresora, consola, otro), igual que el selector de tipo-producto de importaciones.
  - Inputs `border-2` con labels en negrita + íconos, agrupados en sección "Tus datos de contacto"; estado de éxito animado con el código de seguimiento; cards informativas al pie.
  - Se conservaron del diseño original el *pill badge* de marca y las trust-chips.
- **Reciprocidad:** a `solicitud-importacion/page.tsx` se le añadió el mismo *pill badge* ("Importaciones CRISCOM") sobre el ícono, para que ambas páginas rimen.
- **Despliegue:** editado en `criscom-web` (ESLint 0/0) → sincronizado byte-idéntico a la maestra `CRISCOM-fusion-work-2026-08-10\merged` → desplegado a prod editando la release activa `/root/criscom-releases/20260811-ecommerce-typed-clean` (backup previo en `/root/criscom-backups/20260811-073343/`), rebuild de la imagen `criscom-ecommerce` y `docker compose -p criscom -f docker-compose.vps.yml up -d ecommerce`. El build de Next prerenderizó sin errores. Validado por gateway y por `https://criscomgroup.com.pe` (ambas páginas HTTP 200 con el contenido nuevo). Rollback: restaurar los 2 archivos del backup + rebuild de `ecommerce`.
