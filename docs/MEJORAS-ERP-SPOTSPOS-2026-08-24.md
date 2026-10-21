# Mejoras del ERP derivadas de SpotsPOS — delta sobre la matriz P0/P1/P2

**Fecha:** 2026-08-24 · **Autor:** CRiSTEM (Anthropic) · **Rama:** `work/roadmap-fase1`
**Fuente nueva:** SpotsPOS / RepairSpots (`web.spotspos.com`), evaluado desde su producto público (`WEB-V`) y desde la sesión real del navegador de Crisitus (`SESS-A`). No hubo acceso a su base de datos (cloud, login-gated).

> **Regla de no-choque.** Este documento **no rehace** el P0 de `docs/MATRIZ-BRECHAS-TALLER-2026-08-24.md` (P0-A activo técnico, P0-B recepción estructurada, P0-C WMS quants, P0-D compatibilidad), que está declarado **ACTIVO por Codex** en la bitácora. Aquí solo se especifica el **delta que SpotsPOS aporta y la matriz no cubre**, marcando dependencias con ese P0. Es diseño, no código: **no autoriza despliegue** ni edita código de producto.

## 0. Qué aporta SpotsPOS que la matriz no cubre

| Idea SpotsPOS | Estado en CRISCOM | ¿En la matriz? | Propuesta (spec) |
|---|---|---|---|
| Firma digital al **crear** la orden y al **aceptar garantía** | Firma no capturada en recepción | No | **S1** |
| Actualización de estado **automática** por cada transición del ticket | WhatsApp manual + consentimiento | Parcial (P1-C outbox) | **S2** (define el disparador por evento) |
| **Cierre de caja / End-of-Day** automático con desglose y envío | Caja técnica calculada, cierre manual | Parcial (P1-B) | **S3** |
| **Consola multi-tienda** + transferencia de inventario entre **locales propios** | Multi-tenant afiliados; sin transfer entre locales propios | No | **S4** (depende de P0-C) |
| Sugerencias **en el punto de acción** (parte compatible, stock bajo, upsell) | Reglas de diagnóstico; sin sugerencia inline gobernada | Parcial (P0-D, P1) | **S5** |
| **Citas (appointments)** y recordatorios | No existe | No | **S6** |
| **Feedback/reseña** post-entrega | No existe | No | **S7** |
| Analítica **peak hours** y retorno por modelo/repuesto | Caja/costos actuales | Parcial (P1-B) | **S8** |

Todo lo demás de SpotsPOS (intake guiado, catálogo device→marca→modelo, POs, inventario por ubicación) **ya está cubierto** por el P0/P1 de la matriz; no se duplica aquí.

---

## S1 — Firma digital en creación de orden y en garantía

**Objetivo.** Capturar firma del cliente al registrar el ingreso y al aceptar cobertura de garantía, para proteger términos y disputas (patrón SpotsPOS: *collect signature on repair creation and warranty submission*). CRISCOM ya versiona cotización y consentimiento WhatsApp; falta la firma como evidencia vinculante.

**Modelo de datos (migración idempotente, estilo `ensure-service-schema.js`).**
Reutilizar el mecanismo de evidencias existente en lugar de una tabla nueva. Extender la evidencia por etapa con dos tipos:
- `orden_evidencias`: añadir valores de enum `momento`: `firma_recepcion`, `firma_garantia` (ya existen `recepcion/diagnostico/reparacion/pruebas/entrega/otro`).
- Campos: `firma_svg_path` (o `archivo` reutilizado, PNG/SVG en `/uploads/orden-firmas`, privado), `firmante_nombre`, `firmante_dni`, `hash_sha256`, `ip`, `user_agent`, `capturado_por`, `capturado_en`.
- Scoping: hereda `affiliate_business_id` de la orden padre (validar padre dentro del tenant, regla COORDINACION §13).

**Backend.**
- `POST /api/servicio/ordenes/:id/firma` body `{ momento, firma_base64, firmante_nombre, firmante_dni }` → valida orden del tenant, guarda archivo privado, calcula hash, registra evidencia. Idempotente por `(orden, momento)`: reemplazar exige rol ≥ técnico y deja auditoría.
- La firma de garantía se exige **antes** de permitir `entregado` cuando la orden tiene cobertura; bloquear cierre si falta (consistente con la regla "una orden solo se entrega con pago completo, venta contable y repuestos conciliados").
- Uploads privados: mismo endurecimiento que `/uploads/affiliate-logos` (tipo, tamaño ≤ 2 MB, sin ejecución).

**Frontend** (`Frontend/src/pages/services`, expediente → pestañas `Recepción` y `Entrega y garantía`).
- Componente `SignaturePad` (canvas táctil, exporta PNG base64). Botón `Capturar firma` en recepción y en `Entregar y activar garantía`.
- Mostrar sello "Firmado por {nombre} · {fecha}"; nunca exponer la firma en canales públicos ni en PDF de seguimiento tokenizado del cliente.

**Criterios de aceptación.**
1. No se puede pasar a `entregado` una orden con garantía sin firma de garantía.
2. La firma queda como evidencia privada con hash; auditable quién/cuándo.
3. Aislamiento por negocio verificado (una orden de otro tenant no acepta firma cruzada).
4. `tsc -b && vite build` OK; suite backend de servicio verde.

**Riesgo/límite.** Firma digital ≠ firma electrónica avanzada legal; se documenta como evidencia contractual interna, no como firma con validez fiscal SUNAT.

---

## S2 — Notificaciones de estado automáticas (event-driven)

**Objetivo.** Emitir aviso automático al cliente en cada transición relevante del ticket (`recibido → diagnosticado → cotizado → en_reparacion → listo → entregado`), patrón SpotsPOS *automatic status updates*. **Complementa P1-C** (outbox/idempotencia): P1-C define el canal; S2 define **el disparador y las plantillas por estado**.

**Diseño.**
- Emisor: en el controlador de orden, al confirmar cambio de estado dentro de la misma transacción, encolar un mensaje en el **outbox** (P1-C) con `clave_idempotente = orden_id:estado:version`.
- Respeta el **consentimiento** ya existente (`Registrar autorización` / `Revocar permiso`): si no hay permiso vigente, no encola (queda en `historial manual`).
- Plantillas por estado en `plantillas_notificacion` (`estado`, `canal`, `idioma`, `cuerpo`), sin filtrar notas internas ni credenciales. Placeholders: `{cliente}`, `{orden}`, `{equipo}`, `{estado}`, `{link_seguimiento}` (token público distinto del expediente).
- Canal: WhatsApp vía OpenClaw (no SMS de pago como SpotsPOS). Mantener "Abierto ≠ enviado/entregado/leído": el estado real lo da el ACK del proveedor (P1-C), no el disparador.

**Backend.**
- Tabla `plantillas_notificacion` (CRUD solo rol ≥ administrador; scoping por tenant, `NULL` = plantillas CRISCOM base).
- Hook en `orden.controller` transición de estado → `outboxService.enqueueStatusUpdate(orden, nuevoEstado)`.

**Frontend.** `Comunicación al cliente`: sección `Automatizaciones` para activar/desactivar por estado y editar plantilla; vista previa antes de activar.

**Criterios de aceptación.**
1. Cambiar estado con consentimiento vigente encola exactamente 1 mensaje idempotente; reintento no duplica.
2. Sin consentimiento no se encola; queda registrado el motivo.
3. La plantilla nunca incluye notas internas ni PIN/patrón.

**Riesgo.** No activar antes de que P1-C (outbox con ACK) exista; de lo contrario se prometen envíos sin confirmación real. Marcar **dependencia dura: P1-C**.

---

## S3 — Cierre de caja / End-of-Day automático

**Objetivo.** Reporte de cierre diario con desglose (patrón SpotsPOS *End of Day Reports* + *Register Management*), reutilizando la Caja Técnica y `CierreCaja` existentes. Hoy CRISCOM calcula KPIs por periodo; falta el **cierre formal con arqueo y envío**.

**Diseño.**
- Extender `CierreCaja` (o crear `cierre_caja_dia` si no cubre servicio+retail juntos) con: `esperado_por_metodo` (JSON), `contado_por_metodo` (JSON, ingreso manual del arqueo), `diferencia`, `cobrado_servicios`, `cobrado_repuestos`, `anulaciones`, `abierto_por`, `cerrado_por`, `abierto_en`, `cerrado_en`, `observacion`.
- Cálculo en backend (nunca confiar en el navegador): agrega `Venta`/`pago_pos`/caja del día por `affiliate_business_id` (NULL = CRISCOM). No mezclar afiliados (COORDINACION §19).
- Al cerrar: snapshot inmutable + PDF/HTML de arqueo; opción de enviar resumen por WhatsApp/correo al gerente.

**Backend.**
- `GET /api/caja/cierre/preview?fecha=` → esperado por método.
- `POST /api/caja/cierre` `{ contado_por_metodo, observacion }` → calcula diferencia, congela, genera comprobante interno. Solo rol 1/administrador con superusuario.

**Frontend.** `cash-register`: pantalla `Cierre de día` con esperado vs contado, diferencia resaltada y botón `Cerrar caja`.

**Criterios de aceptación.**
1. Esperado se recalcula en servidor; diferencia = contado − esperado por método.
2. Cierre es inmutable (no edita importes tras cerrar).
3. Afiliados nunca suman a la caja CRISCOM.

---

## S4 — Consola multi-tienda + transferencia de inventario entre locales propios

**Objetivo.** Patrón SpotsPOS *Multi-Manager* + *inventory transfer between shops* + *cross-shop vendor network*, pero para **locales propios de CRISCOM** (no afiliados; los afiliados ya están aislados por diseño y **no se mezclan**). Útil cuando CRISCOM opere >1 tienda física.

**Dependencia dura:** requiere **P0-C (WMS: ubicaciones + quants disponible/reservado + movimientos)**. Sin ubicaciones normalizadas no hay "entre locales". **No implementar antes que P0-C.**

**Diseño (una vez exista P0-C).**
- Entidad `ubicacion` ya incluye local/almacén/tienda/taller. Añadir `local_id` (agrupador físico) sobre ubicaciones.
- Transferencia = 2 movimientos atómicos (`salida_transferencia` en origen, `entrada_transferencia` en destino) con `transferencia_id`, estado `en_transito → recibida`, conservando lote/serie/costo. Nunca descuenta sin contrapartida.
- Consola: stock consolidado por local, alertas de stock bajo por local, sugerencia de transferencia cuando un local tiene excedente y otro faltante.

**Criterios de aceptación.**
1. Transferencia conserva identidad (lote/serie) y costo; suma cero global.
2. En tránsito no es vendible en ningún local.
3. Aislamiento afiliado intacto.

---

## S5 — Sugerencias en el punto de acción (SpotsAI, pero gobernado)

**Objetivo.** Traer el valor de *SpotsAI* (sugerir parte compatible, alertar stock bajo antes de comprometer, upsell en cobro) **sin** ceder autoridad a la IA (CRISCOM ya exige validación humana; se conserva).

**Diseño (depende de P0-D compatibilidad y P0-C stock).**
- En **cotización** (`Agregar repuesto compatible`): al elegir falla/componente, backend devuelve repuestos **compatibles** (motor P0-D) ordenados por disponibilidad y margen; marca "sin información" cuando la regla no aplica. La sugerencia **no reserva** sola.
- **Alerta stock bajo antes de reservar**: al reservar, si el quant disponible cae bajo el mínimo, avisar (no bloquear) y ofrecer orden de compra (reutiliza compras/proveedores).
- **Upsell en cobro**: sugerir accesorios/servicios frecuentes por modelo (analítica S8); el vendedor decide. Nunca autoañade al total.
- Gobernanza: toda sugerencia registra origen (regla vs modelo), y si algún día usa LLM, aplica P1-B (proveedor/versión/confianza/costo/feedback). **Sin autoridad para aprobar, cobrar o descontar.**

**Criterios de aceptación.**
1. Sugerir nunca modifica stock, total ni estado sin acción humana explícita.
2. Compatibilidad muestra explicación (`compatible / con condición / no compatible / sin info`).

---

## S6 — Citas (appointments) y recordatorios

**Objetivo.** Agenda de citas de recepción/entrega (patrón SpotsPOS *Appointments*), inexistente en CRISCOM.

**Diseño.**
- Tabla `citas` (`cliente_id?`, `equipo_desc`, `tipo` recepcion/entrega/diagnostico, `inicio`, `fin`, `estado` agendada/confirmada/cumplida/cancelada, `canal`, `affiliate_business_id`, `creada_por`).
- Recordatorio automático vía outbox (S2/P1-C) 24 h y 2 h antes, con consentimiento.
- Al cumplirse, enlace directo a `Nuevo ingreso` precargando datos.

**Frontend.** Nueva vista bajo `services` (`Citas`), calendario simple semanal.

**Criterios de aceptación.** Cita cumplida enlaza a ingreso sin re-tipear cliente; recordatorio idempotente.

---

## S7 — Feedback / reseña post-entrega

**Objetivo.** Solicitar reseña tras entrega (patrón SpotsPOS *Customer Feedback / review requests*).

**Diseño.**
- Tras `entregado`, encolar (S2) un mensaje con link tokenizado a un formulario público mínimo (1–5 estrellas + comentario). Tabla `resenas_servicio` (`orden_id`, `puntaje`, `comentario`, `token`, `creada_en`).
- Panel interno: promedio por técnico/modelo (feed analítica S8). Reseñas negativas alertan al gerente; **no** se publican automáticamente.

**Criterios de aceptación.** 1 solicitud por orden entregada; token de un solo uso; sin datos internos en el formulario público.

---

## S8 — Analítica de operación (peak hours + retorno)

**Objetivo.** Añadir a los reportes actuales: **horas pico** (para dotar personal, patrón SpotsPOS *Peak Hours*) y **tasa de retorno / first-time-fix por modelo/repuesto/técnico** (ya previsto como P2 en la auditoría; aquí se concreta la vista).

**Diseño (solo lectura, sobre datos existentes + S7 + P0/P1).**
- Vistas SQL de solo lectura: ingresos por hora/día de semana; retorno por modelo (reingresos de garantía / entregados); margen real por reparación; piezas inmovilizadas.
- Dashboard bajo `Servicio técnico → Resumen del taller` (tarjetas nuevas), sin escribir datos.

**Criterios de aceptación.** Consultas no bloqueantes; nada de escritura; respeta tenant.

---

## 9. Qué NO adoptar de SpotsPOS

- **Su facturación**: no emite comprobantes SUNAT. CRISCOM conserva su clasificación (`recibo_honorarios` / `boleta_factura`, `pendiente_emision`).
- **Pagos y SMS de EE. UU.**: usar los canales locales ya integrados (efectivo, POS físico, QR Yape/Plin, link, Culqi) y WhatsApp/OpenClaw, no SMS de pago.
- **IA como caja negra**: mantener validación humana y gobernanza (P1-B).
- **Nube/lock-in**: CRISCOM sigue autoalojado (Ryzen), dueño de sus datos e IA.
- **USD por local**: sin costo recurrente por tienda.

## 10. Orden sugerido y dependencias

```
P0 (Codex, en curso): A activo técnico · B recepción · C WMS quants · D compatibilidad
   └── habilita → S4 (multi-tienda), S5 (sugerencias)
P1-C outbox/ACK  └── habilita → S2 (estados auto), S6 (recordatorios), S7 (reseñas)

Independientes / de bajo acoplamiento (se pueden hacer sin esperar el P0 de Codex):
   S1 firma digital · S3 cierre de caja · S8 analítica de lectura
```

**Recomendación de arranque (no-choque):** empezar por **S1**, **S3** y **S8** — no tocan modelos de inventario/activo técnico que Codex tiene activos, aportan valor inmediato y son verificables con `tsc -b && vite build` + suites backend. S2/S4/S5/S6/S7 se activan cuando sus dependencias (P0-C, P1-C) estén listas.

## 11. Nota de coordinación

Este documento es diseño. No se modificó código de producto, base ni configuración. No sustituye ni contradice `MATRIZ-BRECHAS-TALLER-2026-08-24.md`; lo extiende con el cuarto referente (SpotsPOS). Antes de implementar cualquier `Sn`, declarar los archivos en la bitácora de `COORDINACION_IAS.md` y confirmar que no colisionan con el bloque P0 activo.
