# Marketing: Ofertas - correccion de logica (antes del rediseño)

## Arreglado (2026-10-10)
- PUT /api/ofertas-del-dia acepta `precio_fijo` (con IGV): se guarda EXACTO en precio_oferta_con_igv; neto = fijo/1.18 (IGV_RATE); ofertas.descuento derivado (2 decimales).
- PUT atomico (transaccion): si algun item falla NO se aplica ninguno. Los validos quedan `omitida`. Resultado por item.
- DELETE /:productoId limpia el producto aunque no exista fila en `ofertas`. Nuevo POST /eliminar-lote.
- Controllers con try/catch (500 JSON), body nulo/vacio -> 400, maximo 500 items.
- Reconcile idempotente: `Backend/src/services/ofertas.service.js#reconciliarOfertas` + `node src/scripts/reconcile-ofertas.js`. Corrido en dev: 3 filas creadas (desync 0).
- POST /api/productos/asignar-oferta delega al mismo servicio (escribe ofertas tambien). Editar precio con oferta vigente mantiene ofertas.descuento.
- Modelo Oferta: descuento 0.01-99.99 (antes 1-99; un precio fijo puede dar <1%).
- Front: offerService al contrato real; OffersPage sin % por defecto silencioso (omite + aviso), errores por item, un toast por lote, seleccionar-todo por pagina, estado de error con Reintentar, slider max 99.

## Contrato API (todo requiere rol 1 o 2)
- GET /api/ofertas-del-dia -> [{id_oferta,id_producto,descuento,producto:{nombre,precio_unitario}}]
- PUT /api/ofertas-del-dia  body item o lista; item = {id_producto, precio_fijo} | {id_producto, descuento(1-99)}. precio_fijo manda sobre descuento.
  - 200 {success:true, resultados:[{id_producto,estado:'aplicada',motivo:null,descuento,precio_oferta_con_igv}], procesadas, errores:[]}
  - 422 {success:false, message, resultados (error|omitida), procesadas:[], errores:[...]}  | 400 body vacio/nulo.
- DELETE /api/ofertas-del-dia/:id -> 200 {success:true,resultados:[..]} | 404 {success:false,message,resultados} (sin oferta / no existe).
- POST /api/ofertas-del-dia/eliminar-lote {ids:[..]} -> 200 todo ok | 207 parcial | 404 ninguno; resultados por item (aplicada|omitida|error).
- POST /api/productos/asignar-oferta {id_producto, descuento | precio_fijo} -> {message, producto}.

## Reglas
- 0 < precio_fijo < precio normal con IGV; descuento 1-99; producto sin precio normal valido no admite oferta.
- Un producto tiene como mucho una oferta (ofertas.id_producto unico). Sin vigencia: la oferta vive hasta que se quite.
- Estados de item para la UI: aplicada / omitida / error + motivo (mostrar por fila, no solo toast).

## Propuestas NO implementadas
1. Vigencia: ofertas.fecha_inicio / fecha_fin (DATETIME, interpretar en America/Lima), job o filtro al leer que apague las vencidas; la UI muestra "programada / vigente / vencida".
2. Oferta vs mayorista: hoy coexisten precio_oferta y precio_mayoritario sin regla. Proponer: gana el menor precio final para el cliente, o la oferta anula mayorista; decidirlo con negocio y reflejarlo en ecommerce y POS.
3. Stock 0: el ecommerce deberia ocultar (o marcar agotado) las ofertas con stock 0 para no promocionar lo que no se puede vender.
4. Auditoria: registrar quien/cuando aplica o quita ofertas (hoy solo actualizado_en).
5. Horario laboral: el front bloquea fuera de 8-20 pero el backend no lo exige (verificarRolesSinHorario); decidir si debe aplicarse en servidor.

## Run OD (2026-10-10)
- Proyecto OD: `criscom-mkt-ofertas` ("Marketing - Ofertas"), conversacion a17f9426-bf7f-479d-9227-9de8ac65f003.
- runId: `18e2804d-4e66-4083-a7f3-c4aceb991f07` (lanzado con `odd/tools/od_launch.py`; salida esperada: `index.html` en el proyecto, 5-30 min). Brief: `odd/opendesign/criscom-mkt-ofertas/` (DESIGN.md + ofertas-data.json + referencias/).
- Generadores: `odd/tools/brief_mkt_ofertas.py` (usa `briefs_mkt_common.py` con MKT_RAW=odd/tmp/mkt_ofertas_raw.json), prompt `odd/tmp/prompt-mkt-ofertas.txt`.
- Seeds (marca `seed-marketing`, se conservan para el port): productos SEED-MKT-OFE-01..07 (ids 39-45): 01 Auriculares Sony S/189 oferta 15%; 02 Parlante JBL S/149 PRECIO FIJO 129 (13,42%); 03 Teclado K380 S/129 (mayorista 119, sin oferta); 04 Disco Seagate S/289 stock 0, oferta 20%; 05 Silla Cougar S/899 (mayorista 849) oferta 10%; 06 Camara TP-Link S/119 sin oferta; 07 Impresora Epson S/999 sin oferta. Ademas SEED-RAM-16 (id 19) con precio fijo 169 (10,58%). Ofertas previas no tocadas: ids 2, 5, 21.
- Medido (1440x900 / 1280x720 / 390x844): 1a fila en y=810/846/1456 (1/0/0 filas visibles); 20 degradados, 46 sombras, 13 blur; 85 objetivos <44px; desborde de tabla 43/203/466 px; h1 en x=353 (esperado 296), en movil x=53.
