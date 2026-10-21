# Auditoría lógica · Administración › Empresa, SUNAT y pagos (`/erp/company`)

Solo lectura de código. Fecha 2026-10-10. BD consultada solo con SELECT (sin valores de secretos). Lo marcado «por lectura» no se ejecutó en vivo (no se tumbó el backend).

## 1) Contrato API actual por pestaña

Contenedor `CompanySunatPage.tsx:24-35`: `canEdit = rol 1`; SUNAT = rol 1/2 o grant `empresa_sunat`; Pagos = rol 1 o grant `pagos_pos`; «Usuarios» solo si email == cristophercalioro@gmail.com (hardcodeado en front, línea 25). Cabecera (solo rol 1) llama `GET /companies/settings/integrations` y `GET|POST /companies/settings/ruc-sheet`.

**Empresa** (`company.routes.js`)
- `GET /companies` (roles 1,2,3) → array de empresas **solo de `id_user` = usuario** (controller:9). Front usa `[0]`.
- `POST /companies` (rol 1, multipart `logo`,`cert` obligatorio; campos razon_social, ruc, direccion, sol_user, sol_pass, client_id, client_secret, production) → 201/400/422/500.
- `PUT|PATCH /companies/:id` (rol 1, audita `actualizar/empresas`) → 200/404/422/400. El front usa PUT.
- `DELETE /companies/:ruc`, `GET /companies/:ruc`, `GET /companies/for-sales` (roles 1,2,3).
- `toJSON` (company.model.js:119-136) **elimina** sol_user, sol_pass, cert_path, client_secret; fechas a Lima `YYYY-MM-DD HH:mm:ss`.
- Ficha RUC: `POST /companies/settings/ruc-sheet` (campo `ficha_ruc`, 422 `{error}`), `GET` → `{uploaded, original_name, updated_at}`.

**Horario**: `GET /companies/settings/business-hours` (roles 1,2,3) → `{horario_inicio, horario_fin, horario_restriccion_activa}`; `PATCH` (rol 1) valida HH:mm, 422 `{error}`, 404 si no hay empresa. Se guarda en la fila de la empresa «predeterminada». Aplica solo a rol 3 `tipo_vendedor='fisico'` (`restricciones.middleware.js:52-72`, hora Lima).

**SUNAT** (`facturacion.routes.js`): `GET /facturacion/emisores` y `/documentos` (roles 1,2,5, sin area_grants), `PATCH /facturacion/emisores/:id` y `/:id/predeterminado` (rol 1 **+ masterOnly**). Errores `{success:false,message}` 400/404/422.

**Pagos y POS**: `/payment-gateways` (catalog, GET, `PUT /:provider`, `POST /:provider/test`, `POST /:provider/default`) exigen **cuenta maestra exacta** (`payment-gateway.routes.js:6`). Otros: `GET /pedidos/admin/pagos` (1,2,3,5), `/pos/adquirentes` (GET 1,2,3; PATCH rol 1 o grant `pagos_pos`), `/pos/pagos`.

## 2) Defectos priorizados

### CRÍTICO
**C1. Secretos SOL y client_secret quedan en claro en `audit_logs`.** `audit.middleware.js:5,~104` solo redacta las claves exactas `password|token|authorization`; el body del PUT/PATCH de empresa trae `sol_pass`, `sol_user`, `client_secret` y se guarda tal cual en `datos_nuevos`. Arreglo: lista de redacción ampliada (`sol_pass`, `sol_user`, `client_secret`, `*_key`, `credentials`) y no loguear multipart sensibles.

**C2. Handlers async sin try/catch ⇒ caída del proceso.** Express 4.21 no captura rechazos y no hay `process.on('unhandledRejection')` ni `express-async-errors` (grep sin resultados). Afecta `company.routes.js:33-82` (business-hours, integrations), `payment-gateway.controller.js:10-21` (`save` lanza en `validate()` con credencial en blanco; `list` lanza si `decrypt` falla), `facturacion.controller.js:79-94`. En Node ≥15 un rechazo no manejado termina el proceso. Por lectura, no probado en vivo. Arreglo: envolver con `asyncHandler` (ya existe en `community.routes.js:6`) + middleware de errores JSON global.

**C3. Badge «Culqi · conectado» siempre verdadero.** `company.routes.js:56` pone `connected: culqi.isConfigured()` y `isConfigured` es `async` (`culqi.service.js:9`): se serializa `{}`, que es truthy en `CompanySunatPage.tsx:63`. Además `public_key/secret_key` leen solo env (líneas 54-55), ignorando las llaves guardadas en BD. Arreglo: `await`, y combinar BD + env.

### ALTO
**A1. Al editar la empresa hay que reescribir las credenciales SOL.** `toJSON` borra `sol_user/sol_pass/cert_path/client_secret`, pero `CompanyPage.tsx:115-126` hace `form.reset({sol_user: company.sol_user…})` con `undefined` y el esquema zod (líneas 54-55) los exige `min(1)`: el gerente no puede guardar ni un cambio de dirección sin volver a teclear usuario y clave SOL. El PUT además fuerza `client_secret: client_secret || null` (controller:220) y borra el secreto. «Certificado cargado» (línea ~455) nunca se muestra porque `cert_path` no llega. Arreglo: devolver flags `sol_configurado`, `certificado_configurado`, `client_secret_configurado`; campos secretos opcionales en edición, y el backend conserva el valor si vienen vacíos (como `payment-gateway save`, que sí fusiona).

**A2. «Modo Producción» de la empresa es un interruptor inerte y engañoso.** `companies.production` solo se devuelve en `for-sales` (controller:63); el modo real sale de `process.env.SUNAT_MODE` (`sunat.service.js:86,109`, `facturacion.controller.js:25`). Se cambia sin confirmación ni auditoría específica (`CompanyPage.tsx` interruptor). Arreglo: quitarlo o mostrarlo de solo lectura desde `/settings/integrations`; cualquier cambio real exige confirmación escrita.

**A3. `SUNAT_MODE` sin definir = producción real, pero la UI dice «Pruebas».** UI/integraciones tratan todo ≠ `production` como sandbox (`company.routes.js:47`, `facturacion.controller.js:25`), pero `sendBill` solo simula si es exactamente `'sandbox'` (`sunat.service.js:109`) y la URL por defecto es producción (línea 116). Un valor vacío o con typo envía comprobantes reales. Arreglo: validar el enum al arrancar (`sandbox|production`) y fallar cerrado.

**A4. `GET /facturacion/emisores` escribe en BD.** `facturacion.controller.js:85-88` deshabilita todo RUC 20 en cada lectura (también para rol 2/5), sin auditoría. Mover a migración/seed. `updateEmitter` (líneas 139-147) además fuerza `facturacion_habilitada` y `emisor_predeterminado=true` sin desmarcar otros ⇒ puede haber dos predeterminados; no valida certificado/SOL ni pide confirmación al cambiar series (el correlativo reinicia en 1 por serie nueva, línea 59).

**A5. Permisos por area_grants no coinciden con el backend.**
- `empresa_sunat`: la pestaña se muestra (`CompanySunatPage.tsx:26`, menú `DashboardLayout.tsx:235,262`) pero `/facturacion/documentos|emisores` solo admiten roles 1,2,5 (`facturacion.routes.js:9-10`, sin parámetro de área) ⇒ rol 3/6 con grant ve 403 y la pantalla muestra «Aún no hay documentos» (`BillingPage.tsx:61-63,146`) en vez de error.
- `pagos_pos`: `/payment-gateways*` exige cuenta maestra exacta (`payment-gateway.routes.js:6`); un grant jamás funciona. `PaymentsPage.tsx:30-36` usa `allSettled` y solo avisa si fallan **todos** ⇒ lista vacía = «Sin configurar».
- Rol 1 que no es maestro (y rol 2) ve el botón «Editar RUC 10» pero el PATCH responde 403 «Acceso denegado» (`BillingPage.tsx:130`, `facturacion.routes.js:11`).
Arreglo: un solo mapa de permisos servido por backend; ocultar/deshabilitar acciones con motivo.

**A6. Pasarelas: estados y cobros incoherentes.**
- `is_default` no se usa en ninguna parte del checkout (grep: solo modelo y controlador). Solo Culqi se consume (`pedido.controller.js:4`, `affiliate.controller.js:4`); la frase «respaldo si Culqi no está disponible» (`PaymentsPage.tsx:74`) es falsa. `webhook_url` mostrado (`controller:7`) apunta a una ruta inexistente; el webhook real es `/api/pedidos/webhooks/culqi`.
- `getActiveCredentials` exige `enabled && connected` (`payment-gateway.service.js:59`) pero `enabled` solo pasa a true en «Usar en próximos cobros». Culqi «conectado» sin ese paso sigue cobrando con llaves de env, sin avisar. Al guardar de nuevo, `connection_status` vuelve a `saved` conservando `is_default` (controller:18).
- Un fallo de red al «Probar conexión» marca `error` y pone `enabled:false` (controller:31) aunque las llaves sean válidas, y `is_default` queda en true ⇒ puede cortar el cobro web.
- `mode` (test/production) se guarda pero `culqi.service.js` lo ignora; no se valida que `sk_test_/sk_live_` concuerde con el entorno. Cambiar a producción no pide confirmación.
- `masked()` (línea 27) revela el valor completo si mide ≤4 caracteres. Clave de cifrado cae a `JWT_SECRET` (línea 12): rotarlo vuelve ilegibles las pasarelas.
- Sin `registrarAuditoria` en pasarelas, horario, ficha RUC ni emisores.

**A7. Ficha RUC y certificado.** `POST /settings/ruc-sheet` (routes:60-65): sin borrar la ficha anterior, sin endpoint de descarga/borrado, `current.json` global (no por empresa) y servido por `/uploads/private` a **cualquier usuario autenticado** (`app.js:84`, solo `authMiddleware`) con la ruta del archivo. Acepta cualquier `image/*` hasta 30 MB (`upload.middleware.js:125`). Certificado: `fileFilter` (líneas 76-85) rechaza `.cer/.cert` que el front anuncia (`CompanyPage.tsx` accept `.pem,.txt,.cer,.cert`) según el MIME del navegador, no valida que sea un PEM con clave privada, ni vigencia, ni el `.pfx` que sí usa el servicio (`sunat.service.js:49`). Errores de multer salen como HTML 500 (no hay handler JSON) ⇒ toast genérico.

### MEDIO
- **M1 RUC sin dígito verificador:** regex `^(10|20)\d{9}$` en `company.controller.js:101,184,269` y `CompanyPage.tsx:49-52`; falta módulo 11 (pesos 5,4,3,2,7,6,5,4,3,2). El RUC demo (…012) no lo pasaría. `syncRuc` (`CompanyPage.tsx:200`) pisa razón social y dirección sin confirmar.
- **M2 `tipo_ruc` no se deriva del RUC:** create/PUT no lo setean (default '10'); un RUC 20 creado desde esta pestaña queda como 10 y con `facturacion_habilitada=false` hasta usar la pestaña SUNAT. Cambiar `ruc` de una empresa con documentos emitidos no está bloqueado.
- **M3 Una empresa por usuario:** `getCompanies`/`createCompany` filtran por `id_user` (controller:9,81). Otro gerente ve el formulario «crear» y su POST choca con `unique(ruc)` ⇒ 500. `fetchCompany` (`companyService.ts:30-44`) traga cualquier error y devuelve `null` ⇒ error de red se pinta como «sin empresa». Horario, SUNAT y `for-sales` usan otra regla (global, `emisor_predeterminado`/`findOne()` sin orden, controller:48).
- **M4 Logo:** el front dice «JPG, PNG. Máx 2MB» pero acepta `image/*` (incluye SVG, que conserva `.svg` y se sirve público en `/uploads/logos`, `upload.middleware.js:59-60`) y el backend permite 30 MB sin magic bytes. Se guarda **ruta absoluta del servidor** en `logo_url` (controller:118) y `for-sales` la expone a vendedores. El logo anterior no se elimina.
- **M5 Horario:** `PATCH` usa `Boolean(horario_restriccion_activa)` (routes:80) ⇒ si falta el campo se desactiva la restricción; inicio==fin bloquea a todos los vendedores físicos (middleware:62-64, hook:53); sin días/fines de semana/feriados/excepciones; el front evalúa con hora del navegador (`useBusinessHours.ts:44-47`) y el servidor con Lima; rol 5 cae en «Rol no reconocido» (hook:64) aunque el servidor lo deja pasar (middleware:35). Solo aplica a rol 3 físico (afiliado/otros no). Sin auditoría.
- **M6 Estado SUNAT inconsistente:** `integrations.certificate` solo comprueba que haya rutas (routes:44) y `BillingPage` comprueba `existsSync` (facturacion.controller:7-10). Badge dice «listo para pruebas» aunque el modo sea producción.
- **M7 Secretos en reposo:** `sol_pass`/`client_secret` en texto plano en BD (`STRING(50)`, sin cifrado), mientras pasarelas sí usan AES-GCM. Las variables de entorno tienen prioridad (`sunat.service.js:45-47`): lo que se guarda en pantalla puede ser ignorado sin aviso.
- **M8 Estados vacíos = error:** documentos/emisores (`BillingPage.tsx:61-63`), pagos y POS (`PaymentsPage.tsx:30-36`), ficha/estado (`CompanySunatPage.tsx:41`, `setStatus(null)` ⇒ badges «incompleto/faltan claves»). Documentos limitados a 100 sin filtros ni paginación (`facturacion.controller:80`).
- **M9 Tests:** `companies.test.js` solo cubre `for-sales`; `sunat.service.test.js` un caso sandbox. Sin pruebas de permisos, secretos, horario, pasarelas ni ficha RUC.

## 3) Decisiones del usuario (respuesta cerrada)
1. ¿El interruptor «Modo Producción» de la empresa se elimina y el modo SUNAT queda solo en servidor (env), mostrado de solo lectura? **Sí / No**.
2. ¿Pasar a producción (SUNAT o Culqi) exige escribir «PRODUCCIÓN» para confirmar y queda auditado? **Sí / No**.
3. ¿Los secretos (SOL, client_secret) se cifran en BD como las pasarelas y la pantalla solo muestra «configurado» con opción de reemplazar? **Sí / No**.
4. ¿Las acciones de configuración (empresa, series, horario, pasarelas, ficha RUC) se registran en auditoría con secretos redactados? **Sí / No**.
5. ¿Se mantiene la edición de pasarelas solo para la cuenta maestra (el grant `pagos_pos` se retira de la pestaña)? **Sí, solo maestra / Abrir a rol 1**.
6. ¿El grant `empresa_sunat` debe dar acceso real a la pestaña SUNAT (ajustando backend) o se retira? **Dar acceso real / Retirar**.
7. ¿Pasarelas distintas de Culqi se muestran como «en preparación» (sin respaldo automático) hasta que exista el flujo? **Sí / No**.
8. ¿El horario necesita días de la semana y feriados? **Solo hora / Días + feriados**.
9. ¿A quién bloquea el horario? **Solo vendedores físicos (hoy) / También afiliados / Todos excepto roles 1 y 2**.
10. ¿La empresa es única global (no por `id_user`) y el RUC se valida con dígito verificador? **Sí / No**.
11. ¿Cambiar series o RUC se bloquea cuando ya hay comprobantes emitidos? **Sí / Solo avisar**.
12. ¿La ficha RUC es por empresa, con ver/reemplazar/eliminar, solo PDF/JPG/PNG ≤5 MB? **Sí / No**.

## 4) Datos reales (BD local, 2026-10-10)
- `companies`: **1** fila (id 1, «CRISCOM GROUP DEMO E.I.R.L.», RUC 10456789012, tipo_ruc 10, production=0, facturación habilitada y predeterminada, series F001/B001, config_key RUC10, horario 08:50–21:15 con restricción activa, sol_user/sol_pass/cert_path presentes, client_secret vacío, logo NULL).
- El RUC demo **no pasa módulo 11** (dígito esperado 9, real 2).
- `payment_gateways`: **0** filas (todo «Sin configurar»). `documentos_electronicos`: **0**. `adquirentes_pos`: **1** (Izipay, principal, activo, confirmación manual; el texto de la pantalla promete BBVA). `pagos_pos`: 19. `pagos` web: 9.
- Usuarios: 1 rol 1, 1 rol 2, 1 rol 5. `audit_logs`: 124, **0 de tabla `empresas`**. Env: SUNAT_MODE y PAYMENTS_MODE = sandbox; llaves Culqi y SUNAT por env definidas.
- Ficha RUC: el directorio de subidas no existe en el contenedor → pendiente.

## 5) Pantallas de diseño recomendadas
**Recomendación: 3 pantallas + 1 estado compartido** (no 4 ni 1).
1. **Empresa e identidad fiscal** — fusiona «Empresa» + ficha RUC + logo + horario laboral (todo es dato del emisor y lo edita solo el rol 1; el horario es 3 campos y no justifica pestaña propia). Barra de estado superior (SUNAT/Culqi/Ficha) con errores explícitos.
2. **SUNAT y facturación** — emisores, series, certificado/SOL (estado, vigencia), modo (solo lectura + confirmación), documentos recientes con filtros y estado de error. Es la única pantalla con roles 2/5 de solo lectura.
3. **Pagos y POS** — pasarelas (Culqi primero, el resto «en preparación»), prueba de conexión, adquirentes físicos y últimos pagos. Es maestra-only y de riesgo alto; mezclarla con SUNAT confunde permisos.
4. **Estado compartido (componente, no pantalla):** vacío vs cargando vs error vs sin permiso, y modal de confirmación de producción.
Por qué no una por pestaña: el horario queda huérfano y «Usuarios» (solo Crisitus, `VendorsPage`) ya tiene su propio diseño. Por qué no una sola: los tres bloques tienen audiencias y permisos distintos (rol 1 / roles 1,2,5 / maestra).

---
# RESULTADO DEL ARREGLO (writer de logica, 2026-10-10)

**Estado: done** (backend + front minimo). Pendientes que no son de mi superficie estan en «Pedidos a otros archivos».

## Archivos tocados
Backend: `routes/company.routes.js`, `controllers/company.controller.js` (reescritos), `routes/payment-gateway.routes.js`, `controllers/payment-gateway.controller.js`, `services/payment-gateway.service.js`, `routes/facturacion.routes.js`, `controllers/facturacion.controller.js`, `services/sunat.service.js`, `models/company.model.js`, `middlewares/restricciones.middleware.js` (solo bloque de horario), `index.js` (1 linea: etapa de diagnostico), nuevos: `services/business-hours.service.js`, `scripts/ensure-admin-empresa-schema.js`, `__tests__/integration/admin-empresa-logica.test.js`.
Front: `pages/company/{CompanyPage,CompanySunatPage,BusinessHoursPage}.tsx`, `pages/billing/BillingPage.tsx`, `pages/payments/PaymentsPage.tsx`, `services/{companyService,paymentGatewayService}.ts`, `hooks/useBusinessHours.ts`. Respaldos en `odd/backup/administracion/empresa_*`.

## Verificacion
- `jest admin-empresa-logica.test.js` (contenedor, con candado): 30/30 pasan.
- `jest companies, sunat.service, no-console-log, ventas, pedidos, boot, service-order-billing, affiliates-access`: todas pasan (en la 1.a corrida `companies` y `affiliates-access` fallaron por timeout/drop en `setupTestDb`, contencion de la BD de test con otro writer; pasan al repetir solas).
- `tsc -p tsconfig.app.json --noEmit`: 0 errores. `vitest companyService.test.ts`: 3/3.
- Humo en vivo (:3100, solo GET): companies, business-hours, integrations, ruc-sheet, facturacion/emisores, payment-gateways -> 200 con la forma nueva; sin secretos. No se envio nada a SUNAT ni a Culqi (las pruebas de conexion usan mocks; sandbox usa la URL beta).

## Defectos resueltos
C1 (secretos en auditoria): `redactBody` enmascara `sol_user/sol_pass/client_secret` y `credentials` de pasarelas en `req.body` antes de que `registrarAuditoria` lo guarde (cinturon propio; el writer de auditoria amplia ademas la lista compartida). C2: todos los handlers async con `safe()`/try-catch y JSON; multer con errores JSON 422. C3: `await culqi.isConfigured()`; ademas se informa `source` y llaves guardadas en BD. A1: PUT/PATCH conservan secretos vacios; GET devuelve solo `sol_configurado/certificado_configurado/client_secret_configurado`. A2: interruptor eliminado (el body `production` se ignora con aviso); `production` en las respuestas = modo real. A3: `sunatModeInfo()` falla seguro a sandbox + aviso; sandbox usa URL beta (antes enviaba a produccion). A4: `GET /emisores` solo lee; bloqueo RUC 20 = `POST /emisores/bloquear-ruc20`; un solo predeterminado; series con comprobantes piden confirmacion. A5: permisos por rol/area aplicados (ver contrato). A6: `is_default`/`enabled` efectivos solo para pasarelas integradas (Culqi); fallo de red no desactiva; produccion exige confirmacion; llaves `pk_/sk_` validadas contra el entorno; guardar llaves cambiadas apaga `enabled/is_default`. A7: ficha RUC validada (PDF/JPG/PNG <=5 MB, magic bytes), una por empresa, reemplaza borrando la anterior, ver/descargar/eliminar autenticado; certificado PEM validado (cert + clave privada + vigencia); logo JPG/PNG/WebP <=2 MB con magic bytes (SVG rechazado) y se guarda ruta relativa `/uploads/logos/<archivo>`. M1/M2 RUC modulo 11 + `tipo_ruc` derivado; RUC 20 queda sin facturacion. M3 lista global (roles 2/3 reciben forma publica), 409 por RUC/usuario duplicado, `fetchCompany` ya no traga errores. M5 horario (ver abajo). M6 estado SUNAT por existencia real de archivos. M8 front distingue 403/500 de vacio. M9 30 tests nuevos.

## Contrato final
Errores: JSON `{message, error (alias legado), errores?:{campo:msg}}`; nunca 500 sin cuerpo. 403 = `{message}`. Los secretos nunca viajan al navegador.

**Empresa** (`/api/companies`)
- `GET /` roles 1,2,3. Rol 1: empresas completas (todas, orden predeterminada primero) con `sol_configurado, certificado_configurado, client_secret_configurado, ruc_valido, modo_sunat, production(=modo real), tipo_ruc, client_id, redes, horario_*`. Roles 2/3: `{id_company,razon_social,ruc,tipo_ruc,direccion,logo_url}`.
- `GET /for-sales` (1,2,3) `{status?,data:{id_company,razon_social,ruc,tipo_ruc,direccion,logo_url,production}|null}`. `GET /:ruc` -> `{message,data}`.
- `POST /` (rol 1, multipart `logo`,`cert`): obligatorios razon_social, ruc, direccion, sol_user, sol_pass, cert. 201 `{company,avisos[],certificado:{vence_en}}`; 422 `errores`; 409 RUC/usuario duplicado.
- `PUT|PATCH /:id` (rol 1): secretos `sol_user,sol_pass,client_secret` vacios = conservar; `limpiar_client_secret=true` borra; `ruc_demo=true` permite RUC sin digito verificador (si el RUC no cambia se permite con aviso); `production` ignorado con aviso. 200 `{company,avisos,certificado}`; 404; 409 (RUC ya usado o con comprobantes); 422.
- `DELETE /:ruc` (rol 1): 409 si es emisor activo o tiene comprobantes/ventas.
- `GET|POST|DELETE /settings/ruc-sheet`, `GET /settings/ruc-sheet/download` (solo rol 1): `{uploaded,original_name,updated_at,size,mime}`; POST campo `ficha_ruc` PDF/JPG/PNG <=5 MB, 422 si no.

**Horario** (`/settings/business-hours`)
- `GET` roles 1,2,3,5 -> `{horario_inicio,horario_fin,horario_restriccion_activa,horario_valido,configurada,zona_horaria:'America/Lima',ahora_lima,dentro_de_horario,bloquea_a}`.
- `PATCH` rol 1: `horario_inicio/fin` HH:mm; `horario_restriccion_activa` booleano; **ausente = false explicito + aviso**; inicio==fin -> 422 `errores.horario_fin`; 404 si no hay empresa. Devuelve el mismo objeto + `avisos[]`. Auditado (`horario_laboral`).

**SUNAT** (`/api/companies/settings/integrations`, `/api/facturacion`)
- `GET settings/integrations` roles 1,2 o area `empresa_sunat` -> `{sunat:{mode,mode_valid,warning,credentials,certificate,credentials_source,certificate_source,connected}, culqi:null | {mode,source,public_key,secret_key,connected}}` (culqi solo rol 1 / area `pagos_pos`).
- `GET /facturacion/emisores` roles 1,2,5 o area `empresa_sunat` -> `{emisores[],permisos:{puede_editar,motivo},sunat:{mode,mode_valid,warning},ruc20_habilitados_pendientes}`; solo lectura.
- `GET /facturacion/documentos?limit<=200&offset&estado` (mismos roles) -> array + cabecera `X-Total-Count`.
- `PATCH /emisores/:id` (rol 1 + cuenta maestra, 403 con motivo): `{razon_social,direccion,serie_factura,serie_boleta,confirmar_cambio_series?}`; 409 `requiere_confirmacion` si hay comprobantes; 422 `errores`. `PATCH /emisores/:id/predeterminado`; `POST /emisores/bloquear-ruc20` -> `{success,afectados}` (rol 1 + maestra). Todos auditados (`emisores_fiscales`).
- `POST /facturacion/emitir/:ventaId`: sin cambios de contrato (roles 1,2,3).

**Pagos** (`/api/payment-gateways`; rol 1 o area `pagos_pos`; antes solo cuenta maestra)
- `GET /catalog` `{providers:[{provider,name,fields,supportsApiTest,integrated}]}` (solo Culqi `integrated:true`; las demas «en preparacion»). `GET /` `{gateways[],advertencias[]}` con `{provider,name,mode,enabled,is_default,integrated,en_uso,connection_status,connection_message,last_checked_at,configured_fields(mascara),credentials_error,webhook_url}`.
- `PUT /:provider` `{mode,credentials:{campo:valor},confirmar_produccion?}`: vacio conserva; produccion nueva exige «PRODUCCION» (409 `requiere_confirmacion`); llaves `pk_/sk_` deben coincidir con el entorno (422); cambiar llaves/entorno => `enabled=false,is_default=false,status=saved`.
- `POST /:provider/test`: 200 `gateway`; 422 si la pasarela rechaza (401/403/400) y entonces `error`+desactiva; **502 `transitorio:true` en fallo de red/5xx sin modificar nada**; 409 si las credenciales no se descifran.
- `POST /:provider/default` (solo integradas y conectadas; 422 si «en preparacion») = activar para cobros web; `DELETE /:provider/default` = desactivar. Todo auditado (`pasarelas_pago`, credenciales redactadas).

## Que ve cada rol
- **Rol 1 (gerente)**: pestañas Empresa, Horario, SUNAT, Pagos y POS (+Usuarios solo cuenta maestra). Edita empresa/horario/ficha/pasarelas; en SUNAT edita emisores solo si es cuenta maestra (si no, boton deshabilitado con motivo).
- **Rol 2 (admin)**: solo SUNAT (lectura: emisores, documentos, estado SUNAT). Sin Culqi, sin ficha, sin pagos.
- **Rol 5 (auditor)**: lectura SUNAT y horario por API; sin pestañas hoy.
- **Rol 3 + area `empresa_sunat`**: pestaña SUNAT lectura. **+ `pagos_pos`**: pestaña Pagos y POS (y badge Culqi). Sin grant: 403 «No tienes permisos...».
- Rol 3 fisico: bloqueado fuera de horario (hora Lima); resto de roles nunca.

## Decisiones aplicadas por defecto / pendientes del usuario
1. Modo produccion de empresa: **eliminado** (SUNAT_MODE solo en servidor, solo lectura). No hay interruptor SUNAT en runtime; produccion de Culqi exige escribir PRODUCCION y queda auditado. (Dec. 1, 2)
2. Secretos SOL/client_secret: **siguen en texto plano en BD** (no se cifran; ensancharia columnas y migraria datos). Nunca se devuelven. **Pendiente usuario** (Dec. 3). Las variables de entorno siguen teniendo prioridad; el estado informa `credentials_source`.
3. Auditoria de todos los cambios de configuracion: aplicada (Dec. 4).
4. Pasarelas: por instruccion del lead se abrio a rol 1 + area `pagos_pos` (el conservador era «solo maestra»; revertir = 1 linea en `payment-gateway.routes.js`). Emisores/series siguen solo maestra. (Dec. 5, 6: `empresa_sunat` da acceso real de lectura.)
5. Pasarelas distintas de Culqi: «en preparacion», no se pueden activar (Dec. 7). `is_default` solo es efectivo para Culqi (unica integrada); el cobro real (`pedido.controller`) no se toco.
6. Horario: solo hora (sin dias/feriados) y solo vendedores fisicos (Dec. 8, 9 como hoy).
7. Empresa global (no por `id_user`) y RUC con modulo 11; el RUC demo se permite sin cambios (aviso) o con `ruc_demo` explicito (Dec. 10). Bloqueo de cambio de RUC con comprobantes: 409; series: confirmacion (Dec. 11 «avisar+confirmar»).
8. Ficha RUC: una por empresa, ver/reemplazar/eliminar, PDF/JPG/PNG <=5 MB (Dec. 12).
9. Sandbox SUNAT ahora apunta a la URL **beta** (antes, con SOL definido, iba a la URL de produccion).

## Pedidos a otros archivos (fuera de mi superficie)
- `app.js:85` `app.use('/uploads', express.static('src/uploads'))` sirve **sin token** `/uploads/private/*` (ficha RUC, certificados, comprobantes) por el catch-all legado: excluir `private`/quitar el montaje.
- `middlewares/audit.middleware.js`: ampliar `SENSITIVE_KEYS` (`sol_pass, sol_user, client_secret, *_key, credentials`) — hoy cubierto en mis rutas por `redactBody`.
- `middlewares/upload.middleware.js`: `ficha_ruc` acepta cualquier `image/*` 30 MB y `cert` rechaza `.cer/.crt` por MIME (`application/octet-stream`): mis rutas validan despues pero el filtro de multer deberia alinearse.
- `culqi.service.js` ignora `mode` de la pasarela y `PAYMENT_CREDENTIALS_KEY` cae a `JWT_SECRET` (se avisa en `advertencias`).
- `config/validateEnv.js`: validar `SUNAT_MODE in {sandbox,production}` al arrancar en produccion.

## Datos para el brief de diseño
- **Pantallas**: (1) Empresa e identidad fiscal = Empresa + Ficha RUC + Logo + Horario (solo rol 1); (2) SUNAT y facturación (roles 1/2 + grant `empresa_sunat`; edición solo maestra); (3) Pagos y POS (rol 1 + grant `pagos_pos`); + componente de estado compartido (cargando / vacío / error / sin permiso 403 / confirmación «PRODUCCIÓN»).
- **Empresa**: campos razon_social (<=100), ruc (11 dígitos, 10/20; badge «RUC demo» si `ruc_valido=false` + casilla «RUC de demostración»), direccion (<=255), logo (JPG/PNG/WebP <=2 MB), cert (.pem/.txt/.crt/.cer/.cert PEM con cert+clave, <=256 KB, vigencia visible `certificado.vence_en`), sol_user/sol_pass/client_secret (**placeholders «Configurado — déjalo vacío para conservarlo»**, nunca valor), client_id. Modo SUNAT = etiqueta de solo lectura. Avisos devueltos (`avisos[]`) se muestran como toasts.
- **Estados globales**: SUNAT `mode` (pruebas/producción) + `mode_valid=false` => banner ámbar con `warning`; `connected`; origen de credenciales (`empresa`/`servidor`/`ninguna`). Culqi `connected` booleano, `source`. Ficha RUC: pendiente/subida con nombre, descargar, eliminar, reemplazar.
- **Horario**: switch + 2 horas + `errores.horario_*`; texto «A quién bloquea» (`bloquea_a`), hora actual Lima y `dentro_de_horario`.
- **SUNAT**: tarjetas de emisor (RUC 10 editable por maestra; RUC 20 bloqueado), certificado/SOL configurados, series, modo; confirmación al cambiar series con comprobantes; documentos recientes (estado aceptado/rechazado/pendiente, código SUNAT) con error vs vacío; `X-Total-Count`.
- **Pagos**: lista de pasarelas con badges «En uso», «En preparación», estado (not_configured/saved/connected/error/contract_required), campos enmascarados (nunca completos), entorno test/production (prod pide escribir PRODUCCIÓN), botones Guardar / Probar (distinguir «rechazó» 422 de «no se pudo contactar» 502) / Usar en cobros / Dejar de usar; `advertencias[]`; webhook Culqi `/api/pedidos/webhooks/culqi`; adquirentes POS y pagos recientes con error vs vacío.

## Key Learnings
1. `culqi.isConfigured()` es async: sin `await` se serializa `{}` (truthy) y el badge decía «conectado» siempre.
2. Con `SUNAT_MODE` ≠ `sandbox`, `sendBill` iba a la URL de producción aunque la UI dijera «Pruebas»; ahora un único `sunatMode()` (solo el literal `production` es producción) y sandbox → URL beta.
3. `registrarAuditoria` guarda `req.body` tal cual: para no auditar secretos hay que sustituir `req.body` por una copia redactada después de leerlos (no antes).
4. `toJSON` del modelo `Company` es el punto único de serialización: sirve también al `estadoOriginal` de la auditoría; ahí se calculan los flags `*_configurado`.
5. Un fallo de red al probar una pasarela no es un rechazo de credenciales: solo 400/401/403 desactivan; el resto responde 502 `transitorio` sin tocar la BD.

## Run OD — Pagos y POS
- Proyecto: `criscom-adm-pagos` («Administración - Pagos y POS»). runId `0968f065-347d-44bb-af21-e924027805e2`, conversación `b0f4254c-5cc8-4bfe-9f0c-9a1547130ad5`. Lanzado 2026-10-10 (hora de Lima, noche).
- Brief: `odd/opendesign/criscom-adm-pagos/DESIGN.md` + `pagos-data.json` (generados por `odd/tools/brief_adm_pagos.py`); prompt `odd/tmp/prompt-adm-pagos.txt`; capturas en `referencias/`; medidas en `odd/tmp/adm_pagos_medidas.json`.
- Decisiones aplicadas por defecto en el brief (revisables): (1) las 4 pasarelas «En preparación» no ofrecen formulario de llaves aunque el PUT las acepte; (2) auditoría leída con el endpoint existente `GET /api/audit-logs?tabla=pasarelas_pago|pos_adquirentes` (exige rol 1/5 o área `auditoria`; con solo `pagos_pos` el panel sale deshabilitado con motivo); (3) textos POS «respaldo activo/manual» eliminados (el backend solo acepta el principal); (4) segundo adquirente «Niubiz POS» marcado como ejemplo ilustrativo; (5) BD sin pasarelas: estados de pasarela dibujados con la forma exacta del contrato, llaves ficticias enmascaradas. Seeds creados: ninguno.

## Run OD — SUNAT y facturación (2026-10-10)
- Proyecto: `criscom-adm-sunat` («Administración - SUNAT y facturación»), carpeta `odd/opendesign/criscom-adm-sunat/` (DESIGN.md, sunat-data.json, referencias/ ×24).
- runId: `201d560f-97e6-4bd7-947c-d7bb0bd01186` (agente claude, claude-sonnet-5-5). Estado al lanzar: queued/running.
- Generador: `odd/tools/brief_adm_sunat.py`; prompt: `odd/tmp/prompt-adm-sunat.txt`; capturas: `odd/tmp/adm_sunat_cap.mjs`, medidas `odd/tmp/adm_sunat_medidas.json`.

## Run OD
- Proyecto: `criscom-adm-empresa` («Administración - Empresa y horario»), modelo claude-sonnet-5-5.
- **runId válido: `3ad97e08-dc68-423c-b642-6c4f793efb86`** (lanzado 10/10/2026 ~20:50 Lima; comprobado una vez: `running`; conversationId `8f9fb39c-0a7b-4e22-8d16-72d647980d41`). Entregable esperado: `odd/opendesign/criscom-adm-empresa/index.html`.
- Runs descartados (no-op): `e4678923-…` y `0ee0a4ce-…` se lanzaron mientras el daemon aún no creaba el proyecto (503 `DAEMON_UNAVAILABLE`, luego `PROJECT_NOT_FOUND`); terminaron «succeeded» sin trabajo y sin conversación.
- Brief: `odd/tools/brief_adm_empresa.py` → `DESIGN.md` + `empresa-data.json`; prompt `odd/tmp/prompt-adm-empresa.txt`; medidas `odd/tmp/adm_empresa_medidas.json` y `adm_empresa_extra.json`; capturas en `referencias/` (24, 1440/1280/390 claro).
- Nota de contrato: el usuario pidió «inicio < fin», pero el backend admite inicio > fin como turno nocturno válido e inicio = fin es el único error (422 `horario_fin`); el brief sigue el backend.

## Port a codigo — SUNAT y facturacion (2026-10-10)
- Entrada fina `Frontend/src/pages/billing/BillingPage.tsx` (57 lineas, un solo h1, sin cabecera ni pestanas propias; se monta en `CompanySunatPage` pestana `sunat`) + carpeta `pages/billing/sunat/*` (prefijo Sun, 14 archivos < 110 lineas) + `styles/sunat.css` (`.pg-sunat`, generado con od2css/fixcq) + `services/facturacionService.ts` (emisores, documentos con `X-Total-Count`, PATCH series/predeterminado, POST bloquear-ruc20). Respaldo del original: `odd/backup/administracion/empresa_Frontend_src_pages_billing_BillingPage.tsx`.
- Diseno portado: tarjeta de conexion de 4 celdas (Modo / SOL / Certificado / Conexion; vigencia siempre «no disponible aqui» porque no esta en el contrato de lectura), emisores en tarjetas con edicion inline y errores 422 por campo, dialogo 409 (reemplaza `window.confirm`: serie anterior -> nueva, comprobantes emitidos, primer numero nuevo), «Hacer predeterminado» con confirmacion en la tarjeta y error 400 escrito, fila RUC 20 con dialogo de consecuencia exacta (boton rojo solo dentro) y aviso con `afectados`, documentos con chips de estado, tabla -> tarjetas en movil, fila desplegable con codigo/mensaje SUNAT y paginacion (8 por pagina, total de `X-Total-Count`). Cada bloque (conexion, emisores, documentos) falla por separado (403/500/red con Reintentar de 44 px), distinto de cargando y de vacio.
- Permisos: lo manda `permisos.puede_editar/motivo` del backend; sin permiso los controles quedan `aria-disabled` con el motivo visible (`aria-describedby`). Enlace «Cargar certificado o claves SOL en RUC y empresa» solo rol 1 (los demas ven el texto).
- Diferencias diseno/backend: (1) el chip de modo del encabezado se omitio (el modo ya esta en la celda «Modo»), como en el diseno; (2) chips de estado sin contador (el contrato solo da el total del filtro activo); (3) el 403 de un bloque usa el texto del diseno, no el mensaje del backend; (4) en movil el pie de edicion es fijo mediante portal (`container-type` rompe `sticky/fixed`).
- Colision de CSS evitada: `CompanySunatPage` ahora envuelve la pestana en `.pg-empresa`, cuyas reglas globales (`.tb`, `.sub`, `.hd`, `.lnk`, `.tag`, `.why`) filtraban a esta pagina; se renombraron en `.pg-sunat` y en el JSX a `sutb/susub/suhd/sulnk/sutag/suwhy`.
- Seeds/datos: ninguno creado. En la prueba real se guardo una vez el emisor id 1 con los mismos valores (solo cambia `actualizado_en`); el resto de flujos (409, predeterminado, bloquear RUC 20, documentos) se probaron con respuestas interceptadas; nada se envio a SUNAT.

## Port a código — Pagos y POS (2026-10-10)
**Estado: done.** Diseño aprobado `criscom-adm-pagos` portado como pestaña de `CompanySunatPage` (`/erp/company?tab=payments`).
- Archivos: `Frontend/src/pages/payments/PaymentsPage.tsx` (entrada fina), `pages/payments/pagos/*` (23 archivos, todos < 100 líneas: PagPage, PagHeader, PagBand, PagGatewayList, PagFicha/PagFichaKeys/PagFichaActions/PagResult/PagProdDialog/PagSheet, PagPos, PagPayments, PagAudit, PagStates + hooks usePag* + pagCommon/pagData/pagWhy), `styles/pagos.css` (clases internas con prefijo `pa-`), `services/paymentGatewayService.ts` (`savePaymentGateway` devuelve `{gateway, sinCambios}`; nuevo `listWebPayments`). Respaldos: `odd/backup/administracion/pagos_PaymentsPage.pre-port.tsx` y `pagos_paymentGatewayService.pre-port.ts` (el original previo a la lógica sigue en `empresa_*`).
- Un solo `h1` «Pagos y POS» (x = 24; 12 en móvil) con la línea de contexto; el contenedor nuevo renderiza `<p>` en esta pestaña, así que el h1 lo pone esta página. Sin cabecera héroe ni pestañas propias.
- Pasar a producción: `PagProdDialog` (ErpDialog) con PRODUCCIÓN escrito; se abre cuando el servidor responde 409 `requiere_confirmacion`; botón deshabilitado hasta coincidir (acepta PRODUCCION). Sin `window.prompt`/`confirm` ni toasts en la pantalla.
- Probar conexión: bloque persistente. 200 «Conexión correcta» + hora; 422 «Error de conexión» + «Culqi se desactivó»; 502 «No se pudo contactar…» + «No se desactivó nada» + «Reintentar prueba» (estado anterior intacto); 409 «No se pueden descifrar las llaves».
- Las 4 pasarelas «En preparación» sin formulario; llaves jamás visibles: solo «Configurada» (flag) y origen (banda + ficha); no se muestra ni la máscara `••••1234`.
- Auditoría: `GET /audit-logs?tabla=pasarelas_pago|pos_adquirentes&limit=10` + `GET /audit-logs/:id` (acordeón, `credentials.*` aplanado, `[REDACTADO]` → «••• no se guarda»). Deshabilitada con el motivo si no hay rol 1/5, superusuario temporal ni área `auditoria` (no llama a la API); un 403 real da el mismo estado.
- Móvil: ficha a pantalla completa con pie fijo = `ErpDrawer` (el pie fijo no funciona con `container-type`).

### Verificación observada
- `tsc -p tsconfig.app.json --noEmit` filtrado por `pages/payments|paymentGatewayService`: 0 errores (hay 1 ajeno en `pages/vendors/usuarios/usrCommon.ts`, otro writer). `eslint src/pages/payments src/services/paymentGatewayService.ts`: 0 errores, 0 warnings.
- Playwright (1440×900, 1280×720, 390×844; claro y oscuro; API real :3100 + `page.route`): 0 gradientes, 0 backdrop-filter, 0 sombras dentro de `.pg-pagos`, 0 objetivos < 44 px (también en drawer y diálogo), sin overflow horizontal, h1 = 1 con x = 24 / 12. **La prueba de conexión se interceptó siempre** (`**/api/payment-gateways/*/test`); ningún request llegó a Culqi.
- Flujo real (backend): prefijo `pk_live_` en Pruebas → error por campo; guardar `pk_test_/sk_test_` ficticios → «Guardado, falta probar» sin llaves en el DOM; 502 interceptado → BD intacta; Producción con llaves de pruebas → 422 por campo del servidor; llaves live → 409 → diálogo (deshabilitado hasta escribir) → cancelar no guarda → confirmar guarda `mode=production, enabled=0`; volver a Pruebas sin confirmación; auditoría real con detalle redactado.
- Estados simulados con `page.route` (máquina de estados): guardada, prueba OK, en uso, dejar de usar (confirmación inline), 422, 502 en uso, 409, hacer principal (2.º adquirente), 500 por bloque, 403 de página, auditoría sin permiso (rol 3 + `pagos_pos`: 0 llamadas a `/audit-logs`), móvil lista → ficha → diálogo.

### Diferencias diseño vs backend/instrucciones
1. Máscara `••••9f2c` del diseño: **no se muestra** (instrucción «llaves jamás visibles»); solo «Configurada».
2. Origen real = `integrations.culqi.source`: con llaves guardadas pero sin uso el backend dice `ninguna`; se muestra «Sin llaves en uso / hay llaves guardadas aquí pero la tienda web todavía no las usa» (el diseño dibujaba «Base de datos» ya al guardar).
3. Importes con `money()` del ERP (`S/ 4,102.86`, §1 del brief) y no `S/ 4 102,86` de la maqueta; texto «Guardado»/hora con la hora del cliente en Lima.
4. Sin etiqueta «Ejemplo ilustrativo» ni «Niubiz POS»: el POS real lee `GET /pos/adquirentes?todos=1`.
5. «Cobros físicos: Izipay» va en la línea de contexto del h1, no en la banda.
6. Con el contenedor nuevo (título+pestañas ≈ 190 px) la ficha de Culqi termina en y = 905 (a 1440×900 asoma 5 px de la ficha); el contenido propio arranca en y = 190.

### Pendientes / archivos ajenos
- `CompanySunatPage` debe seguir pasando `title="p"` en esta pestaña (si vuelve a poner h1 habría dos). La insignia «Culqi · Sin llaves/Conectado» del contenedor lee `integrations`; no se refresca al guardar desde esta pestaña (usa su propio botón de estado).
- El permiso de auditoría se decide en cliente con la misma regla de la ruta (`audit_log.routes.js`: rol 1/5, superusuario temporal o área `auditoria`); si el servidor cambia la regla, el 403 cae al mismo estado deshabilitado.
- Seeds: ninguno persistente. Se creó y **borró** 1 fila `payment_gateways` (culqi, llaves ficticias) y 6 filas `audit_logs` (tabla `pasarelas_pago`, ids 196-198 y 220-222); BD vuelve a 0 pasarelas / 0 auditoría de pasarelas.

### Key Learnings
1. Las clases genéricas del diseño (`.hd .btn .card .st .nt .ch`…) colisionan con las del contenedor `.pg-empresa` (mismo patrón od2css): las reglas `.pg-empresa .x` se filtran en las pestañas hijas (p. ej. `.nt` con fondo de píldora, h1 centrado en móvil). Solución: prefijo `pa-` en TODAS las clases internas (incl. modificadores compuestos como `.pa-st.pa-ok`; el regex debe cubrir `.a.b`).
2. Si el contenedor pone `<p>` en la pestaña, el h1 único lo debe poner la página hija.
3. Con el 409 `requiere_confirmacion` del servidor llegando DESPUÉS de la validación de llaves (422), conviene dejar que el servidor decida y abrir el diálogo solo en el 409; no abrir el diálogo antes (evita pedir PRODUCCIÓN para luego mostrar un 422).
4. `PaymentGateway.last_checked_at` llega como ISO con zona; los pagos/POS llegan `YYYY-MM-DD HH:mm:ss` ya en Lima: `fdate()` distingue ambos casos.
5. Portales (ErpDialog/ErpDrawer) con `container-type: normal`: las reglas `@container` móviles no aplican, repetirlas en `@media (max-width:639px)` para `.pg-pagos.dlgw`.

## Port a codigo (Empresa y horario)
- **Estado: done** (pestanas Empresa y Horario + contenedor). Diseno: `odd/opendesign/criscom-adm-empresa/index.html`; CSS `Frontend/src/styles/empresa.css` (`.pg-empresa`, generado con od2css/fixcq y adaptado: host `.fx` de altura fija, zona `.zn` con scroll y guardado `.sv` al pie).
- **Archivos**: `pages/company/CompanySunatPage.tsx` (contenedor: cabecera con estado real SUNAT/Culqi/Ficha RUC, 4 pestanas siempre visibles con candado + motivo, aviso al cambiar con cambios sin guardar, lazy de Billing/Payments/Vendors; la pestana `users` solo para la cuenta que ya la veia), `CompanyPage.tsx` y `BusinessHoursPage.tsx` (entradas finas) y `pages/company/empresa/*` (Emp*: EmpHeader, EmpEmpresaTab, EmpIdent, EmpLogo, EmpFicha, EmpSecrets, EmpCert, EmpRail, EmpSaveBar, EmpStates, EmpHorarioTab, EmpPreview, useEmpEmpresa, useEmpHorario, useEmpEstado, empForm, empFormat, empParts, empTabs). `services/companyService.ts`: `uploadRucSheet` ahora fuerza `multipart/form-data` (con el Content-Type JSON por defecto de axios el FormData viajaba como JSON y el servidor respondia «Selecciona una ficha RUC»).
- **Diferencias diseno vs backend/app**: (1) la cabecera y la barra de pestanas se repiten encima de SUNAT/Pagos/Usuarios; el `h1` «Empresa y horario» solo es `h1` en Empresa/Horario (en las otras pestanas pasa a texto y manda el `h1` de cada pagina: SUNAT ya trae «SUNAT y facturacion», Pagos aun trae «Centro de pagos»). (2) `updated_at` de la ficha llega en ISO UTC justo tras subir y en `YYYY-MM-DD HH:mm:ss` al recargar: `fmtStamp` acepta ambos y muestra hora de Lima. (3) `GET business-hours` con `configurada=false` se trata como «sin empresa» (estado 404 del diseno). (4) No se dibuja «quitar logo» ni limpiar client secret (sin diseno). (5) A 1280 «Tipo de RUC» baja a una segunda fila (igual que el diseno: spans 7+5+3). (6) El guardado sticky sangra al borde del `main` con `--p` (24 px desde 1024 px, 12 px menos).
- **Pendientes ajenos a mi superficie**: la ruta `/company` solo admite roles 1 y 2 (`App.tsx`: `RoleProtectedRoute allowedRoles={[1,2]}`), asi que el rol 3 con `pagos_pos`/`empresa_sunat` es redirigido a `/` aunque la pestana lo permita; el titulo del navbar dice «Empresa, SUNAT y pagos» (shell). Pagos aun trae su propio `h1`.
- **Seeds/datos tocados**: empresa 1 (CRISCOM GROUP DEMO): `direccion` cambiada a «... seed-adm» y restaurada a «Av. Demo 123, Arequipa, Perú»; horario cambiado a 08:50–18:00 y restaurado a 08:50–21:15 activo; ficha RUC subida (PDF `seed-adm-ficha.pdf` y PNG) y eliminada (queda «Pendiente»). `actualizado_en` y la auditoria (`actualizar/empresas`, `horario_laboral`, ficha) registran esos cambios. Sin logo ni certificado reales cambiados (solo rechazos 422 de prueba).
- **Verificacion**: ver informe de entrega (tsc 0 errores en company; eslint 0 errores; vitest companyService 3/3; Playwright 1440/1280/390 claro y oscuro: 0 degradados, 0 backdrop-filter, 0 sombras, 0 objetivos < 44 px, sin overflow horizontal, `h1` a x=24/12, primer campo en y=221 con navbar).
