# Atencion al cliente - Libro de reclamaciones: logica (auditoria 10-oct)
Tabla libro_reclamaciones VACIA (0 filas). Flag FEATURE_LIBRO_RECLAMACIONES=false (Backend/.env:77, compose). Rutas: Backend/src/{controllers/libro_reclamaciones.controller.js,controllers/ecommerceLibroReclamaciones.controller.js,routes/libro_reclamaciones.routes.js,models/libro_reclamaciones.model.js}, POST publico /api/ecommerce/libro-reclamaciones (limiter 8/15min), front Frontend/src/pages/libro-reclamaciones/LibroReclamacionesPage.tsx + servicio.
## Defectos
C1 POST publico guarda con el flag apagado y el ERP no puede leerlo -> con flag off el POST publico responde 503 {message}.
C2 Tabla sin ensure-*-schema (sync global se omite en prod) -> crear/migrar en ensure-commerce-schema.js (idempotente, ALTER ADD COLUMN IF NOT EXISTS por information_schema).
C3 Front/menu roles [1,2] pero backend crisitusOnly -> usar [authMiddleware, verificarRolesSinHorario([1,2])] (patron routes/social_links.routes.js). Front: leer isError y mostrar error con reintento, distinto de vacio.
C4 Sin plazo legal: columnas fecha_vencimiento(DATE), fecha_respuesta, respuesta(TEXT), respondido_por(FK users). 15 dias HABILES (sin prorroga) desde fecha, con feriados peruanos en una constante editable (Backend/src/utils o services). Exponer dias_restantes y vencido en el listado.
C5 PUT acepta cualquier campo y DELETE borra fisico sin auditoria -> whitelist {estado, respuesta}; transiciones validadas (409); eliminar DELETE (archivar = estado 'archivado'); registrarAuditoria + capturarEstadoOriginal (patron routes/blog.routes.js) tabla libro_reclamaciones.
A1 Datos estructurados aplastados en descripcion -> columnas: codigo(unico), tipo(reclamo|queja), documento, domicilio, es_menor, apoderado, tipo_bien, bien, monto(DECIMAL), pedido. descripcion queda con el detalle.
A2 Sin correo -> copia al consumidor al registrar y correo al responder (services/mail.service.js, MAIL_MODE dry en dev).
A3 Validacion solo en cliente -> servidor: email, documento DNI8/CE9/RUC11, monto >=0 finito, topes de longitud, es_menor booleano estricto y apoderado obligatorio si menor, errores por campo {message, errores:{campo:msg}}.
A4 Codigo LR-AAAA-NNNNNN persistido, correlativo por anio en transaccion, anio en hora Lima.
A5 Listado sin paginar y PII completa -> GET /?page&limit&estado&q&tipo&vencido -> {rows,total,resumen:{por estado, vencidos, por_vencer}}; q busca codigo, nombre, documento, email.
M2 Exportar: GET /export.csv (mismos filtros). M3 fechas hora Lima como ISO -05:00 (ver marketing-blog-logica.md, iso()). M4 honeypot (campo 'website' no vacio -> 201 falso sin guardar) + dedupe email+detalle 24h (409). M5 estado ENUM pendiente|en_proceso|respondido|archivado.
## Decisiones del usuario pendientes (se aplicaron valores por defecto reversibles)
1 encender flag en produccion; 2 roles 1 y 2 (no solo cuenta maestra); 3 archivar, no borrar; 4 15 dias habiles sin prorroga; 5 feriados en codigo; 6 correo automatico si; 9 ambos tipos.

## Contrato final (implementado 10-oct)
Estado: C1-C5, A1-A5, M2-M5 hechos en backend; front solo adaptado al contrato (rediseno visual pendiente desde Open Design). Dev: FEATURE_LIBRO_RECLAMACIONES=true (Backend/.env) y VITE_FEATURE_LIBRO_RECLAMACIONES=true (Frontend/.env.local, ignorado por git). Tabla vacia; ALTER idempotente en ensure-commerce-schema.js.

### Publico: POST /api/ecommerce/libro-reclamaciones (limiter 8/15 min)
Cuerpo: nombre(3-160), email, telefono?(6-30; digitos + - ( ) espacio), documento(DNI 8 | CE 9 alfanum | RUC 11), domicilio(5-255), es_menor(boolean estricto), apoderado(3-160, obligatorio si es_menor), tipo_bien(producto|servicio), bien(3-255), monto?(>=0, 2 decimales), tipo(reclamo|queja), detalle(20-4000; alias mensaje/descripcion), pedido(5-1000), acepta_declaracion(true), website(honeypot, siempre vacio).
- 201 `{success, codigo:"LR-2026-000001", fecha:ISO-05:00, fecha_vencimiento:"AAAA-MM-DD", correo:"enviado|omitido|error", message}` (copia por correo al consumidor).
- 400 `{message, errores:{campo:msg}}` | 409 `{message}` mismo email+detalle en 24 h | 503 `{message}` flag apagado | 429 limiter | 500 `{message}`.
- Honeypot (`website` no vacio): 201 falso con codigo `LR-AAAA-000000`, sin guardar ni enviar correo.

### ERP: /api/libro-reclamaciones (token; roles 1 y 2; otro rol 403, sin token 401)
- `GET /?page=1&limit=20(max100)&estado=&tipo=&q=&vencido=true` -> `{rows, total, page, limit, resumen}`. `q` busca codigo, nombre, documento, email. Orden fecha DESC. 400 `{message, errores}` si estado/tipo invalido.
  - `rows[]` (sin documento/domicilio/pedido/telefono/detalle): `id_reclamo, codigo, tipo, estado, nombre, email, tipo_bien, bien, monto, fecha(ISO-05:00), fecha_vencimiento(AAAA-MM-DD), fecha_respuesta, dias_restantes(int|null), vencido, por_vencer, respondido_en_plazo(bool|null), extracto(160)`.
  - `resumen` (toda la tabla, ignora filtros): `{total, por_estado:{pendiente,en_proceso,respondido,archivado}, vencidos, por_vencer}`. `por_vencer` = abierta y quedan <=3 dias habiles (incluye vence hoy).
- `GET /:id` -> fila + `telefono, documento, domicilio, es_menor, apoderado, pedido, descripcion, respuesta, respondido_por`. 404 si no existe.
- `PUT /:id` cuerpo `{estado, respuesta?}` (solo esos dos; lo demas se ignora). Responder = `estado:"respondido"` + `respuesta`(20-4000, obligatoria); registra fecha_respuesta, respondido_por y envia correo (`correo` en la respuesta). 400 `{message, errores}`; 409 transicion invalida / mismo estado / cambio concurrente; 404.
  - Transiciones: pendiente -> en_proceso|respondido|archivado; en_proceso -> respondido|archivado; respondido -> archivado; archivado definitivo.
- `GET /export.csv` mismos filtros (sin page/limit; max 10000): text/csv UTF-8 con BOM, `Content-Disposition: attachment`, `X-Total-Count`, celdas con formula neutralizadas (`'=`). Audita accion `exportar`.
- Sin DELETE (404). PUT queda auditado (`actualizar`, tabla libro_reclamaciones, con estado anterior).
- Plazo: 15 dias habiles sin prorroga desde la fecha de registro (hora Lima); feriados en `Backend/src/services/feriados-peru.js` (fijos + Jueves/Viernes Santo calculados + `FERIADOS_EXTRA` editable para decretos). Dia de registro no cuenta.

### Datos para el brief de diseno
- Estados y chips: pendiente (nueva, sin atender) | en_proceso | respondido | archivado. Plazo: `vencido` (rojo), `por_vencer` (ambar, <=3 dias habiles), normal (N d habiles), `null` si ya respondida/archivada (mostrar "respondido en plazo / fuera de plazo" con `respondido_en_plazo`).
- Tipos: reclamo (disconformidad con producto/servicio), queja (malestar con la atencion). Tipo de bien: producto | servicio.
- Pantalla: tarjetas de resumen (total, pendientes, por vencer, vencidas), filtros (busqueda, estado, tipo, solo vencidas), tabla paginada 15/pag con columnas Codigo, Cliente(nombre+correo), Tipo, Registro, Plazo, Estado, Acciones; boton Exportar CSV; detalle en panel/dialogo con datos del consumidor, bien, monto, detalle, pedido y caja de respuesta (min 20 car., "Enviar respuesta" + "Archivar"); estados cargando / error con "Reintentar" / vacio sin datos / vacio con filtros.
- Ejemplo real de fila: `{"id_reclamo":1,"codigo":"LR-2026-000001","tipo":"reclamo","estado":"pendiente","nombre":"Lucia Prueba","email":"lucia@example.invalid","tipo_bien":"producto","bien":"Monitor 24 pulgadas","monto":650,"fecha":"2026-10-10T16:37:15.000-05:00","fecha_vencimiento":"2026-10-30","fecha_respuesta":null,"dias_restantes":15,"vencido":false,"por_vencer":false,"respondido_en_plazo":null,"extracto":"El monitor llego con lineas verticales en la pantalla desde el primer dia."}`.
- Ejemplo resumen: `{"total":1,"por_estado":{"pendiente":1,"en_proceso":0,"respondido":0,"archivado":0},"vencidos":0,"por_vencer":0}`.
- Ejemplo error de validacion: `{"message":"Revisa los campos marcados.","errores":{"documento":"Documento invalido: DNI de 8 digitos, CE de 9 o RUC de 11.","acepta_declaracion":"Debes aceptar la declaracion para registrar la hoja."}}`.
- Tienda (Ecommerce/app/(public)/libro-reclamaciones/page.tsx): muestra `message` + lista de `errores`; incluye campo senuelo `website` oculto. Constancia: codigo + fecha + plazo.

### Pendiente / decisiones
1. Produccion: poner FEATURE_LIBRO_RECLAMACIONES=true en el entorno del VPS (docker-compose.vps.yml lo lee con default false) y definir MAIL_MODE=live + SMTP para que salgan los correos.
2. Hojas archivadas no se pueden reabrir (decision tomada por defecto).
3. Feriados puente o dias no laborables por decreto: agregar a FERIADOS_EXTRA.

## Run OD
- Proyecto Open Design: `criscom-care-libro` («Atención al cliente - Libro de reclamaciones»). runId `3eb4650e-b262-44a2-8392-74ba73b24a8d` (conversación `5c088c51-6453-42f0-827a-62f8ddb70b98`), lanzado el 10/10/2026.
- Archivos: `odd/opendesign/criscom-care-libro/` (DESIGN.md, libro-data.json, referencias/*.png, referencias aprobadas + logo), `odd/tools/brief_care_libro.py`, `odd/tmp/prompt-care-libro.txt`, `odd/tmp/care_libro_raw.json`, `odd/tmp/care-libro-medidas.json`.
- Seeds en BD (marca `seed-care`, 8 hojas LR-2026-000001..000008, ids 3..10): las fechas/estados de 8 filas se ajustaron por SQL para cubrir vencido/por vencer/respondido en y fuera de plazo/archivado; el id 1 y 2 ya no existen. Limpiar al final: `DELETE FROM libro_reclamaciones WHERE descripcion LIKE '%seed-care%'`.

## Port a código (10-oct)
- Hecho: pages/libro-reclamaciones/* (LibroReclamacionesPage entrada fina + useLibroList/useLibroDetail/useScrollTop, LibroFilters, LibroList, LibroDetail, LibroMobileDetail, Detail{Plazo,Ficha,Respuesta,Footer}, LibroBanner, ArchiveDialog, LibroPanels, libroCommon, libroParts) y styles/libro-reclamaciones.css (prefijo .pg-libro). Backup del original en odd/backup/atencion/.
- Bug corregido: fecha_vencimiento (fecha civil AAAA-MM-DD) se formatea como texto (fCivil/fLarga), sin new Date() local.
- Móvil: lista a pantalla completa + detalle con «Volver a la lista» y pie de acciones como hermano flex (no sticky); diálogo Archivar con ErpDialog (.pg-libro.dlgw).
- Seeds tocados por las pruebas: LR-2026-000004 respondido (en plazo), LR-2026-000002 archivado; LR-2026-000001 se restauró a pendiente. Limpiar al final: DELETE FROM libro_reclamaciones WHERE descripcion LIKE '%seed-care%'.
