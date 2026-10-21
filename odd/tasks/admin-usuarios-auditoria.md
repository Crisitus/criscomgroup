# Auditoría de lógica: Administración › Usuarios y afiliados + Cuenta maestra

Alcance: solo lectura de código. Repo `criscom-web-main`. Stack revisado: Backend Express 4 + Sequelize/MySQL; Frontend React. BD dev consultada solo con conteos.

## 1. Contrato API actual

Todas bajo `/api`. `auth` = JWT válido + usuario releído de BD (`auth.middleware.js:19`). `master` = rol 1 con email == `MASTER_ADMIN_EMAIL` **o** rol 2 con `superusuario_temporal` vigente (`master.middleware.js:10-11`). `crisitus` = email exacto (`crisitusOnly.middleware.js:15`).

| Método y ruta | Guardia | Qué hace |
|---|---|---|
| GET/PATCH `/users/master-account` | auth+crisitus (+audit en PATCH) | Lee/edita nombre y contraseña propios (`user.controller.js:7-32`) |
| GET `/users` | auth+master | Lista TODOS los usuarios sin `password`, sin paginar (`:51-63`) |
| GET `/users/vendors/stats` | auth+master | Roles 3 y 5 con ventas/stock (`:70-112`); no incluye rol 6 |
| GET `/users/:id`, `/:id/basic` | auth+roles 1,2,3 (5 como admin) | Ficha completa / solo nombre |
| POST `/users` | master+audit | Crea usuario, roles 2,3,4 (`:233`) |
| PUT / PATCH `/users/:id` | master+audit | Edición completa / parcial **sin lista blanca** (`:269`, `:302`) |
| PATCH `/users/:id/role` | master+audit | Rol 2-6 (`:118`) |
| PATCH `/users/:id/access-profile` | master+audit | Rol 3/5/6 + tipo vendedor, caducidad, comisión, teléfono, crea AffiliateBusiness (`:137-177`) |
| PATCH `/users/:id/temporary-superuser` | master + email exacto | Superusuario temporal a un rol 2 (`:179-190`) |
| PATCH `/users/:id/inventory` | master+audit | Reasigna `propietario_id` de productos (`:192`) |
| DELETE `/users/:id` | master+audit | `user.destroy()` sin guardas (`:331-344`) |
| GET `/access/my`, POST `/access/request` | solo `auth` | Cualquier cuenta autenticada solicita un área (`access.controller.js:4-5`) |
| GET `/access/requests`, PATCH `/access/requests/:id`, DELETE `/access/grants/:id` | master (resolver/revocar exigen `isExactMaster`) | Aprobar/rechazar/revocar `area_grants` |
| GET `/affiliates`, POST `/affiliates/:id/settlements`, PATCH `/affiliates/payments/:id/validate` | master | Listado, liquidación, validar pago |
| GET `/affiliates/me`, PUT `/me/identity`, POST `/settlements/:id/payments`, `/pay-card` | auth (dueño o rol 1) | Cuenta del afiliado |
| POST `/auth/register` | `requireAdminAccess` (JWT rol 1 o 2) | Alta de usuario con `id_role` libre 1-4 |
| POST `/auth/login` | `authLimiter` + audit login | JWT 8 h (`auth.controller.js:21-25`) |

Áreas válidas (`access.controller.js:3`): ventas, inventario, compras, cotizaciones, servicio_tecnico, marketing, auditoria, empresa_sunat, pagos_pos.

## 2. Defectos priorizados

### CRÍTICOS

**C1. Un Administrador (rol 2) puede crear una cuenta Gerente (rol 1).** `auth.routes.js:9-18` deja `/auth/register` a `requireAdminAccess`, que acepta rol 1 **o 2** leyendo el rol del JWT (`admin.middleware.js:22`). El controlador admite `id_role` 1-4 sin más control (`auth.controller.js:74-76`). El test actual lo da por bueno (`auth.test.js:74-82`). Un rol 1 que no sea el email maestro no pasa `master`, pero sí los `RoleProtectedRoute [1]`/`checkRole([1])` que no lo comprueban (p. ej. `affiliate.controller.js:9,91`). Arreglo: eliminar `/auth/register` (duplica `POST /users`) o limitarlo a `master`, y fijar `id_role ∈ {2,3,4}`.

**C2. Superusuario temporal toma la cuenta maestra y se autoprorroga.** `PUT/PATCH/DELETE /users/:id` solo usan `master`, que admite al rol 2 elevado (`master.middleware.js:11`). `updateUser` cambia email, contraseña y rol de cualquiera (`user.controller.js:279-285`); `patchUser` hace `user.update({...req.body})` (`:309-316`) → mass assignment de `id_role`, `superusuario_temporal`, `superusuario_expira_en`, `acceso_expira_en`, `affiliate_business_id`. `deleteUser` borra incluso la maestra (`:338`). Resultado: un admin temporal pone `superusuario_expira_en` a 2099 en sí mismo (anulando el candado de `:182`), cambia la clave de Crisitus o lo borra. La UI promete lo contrario (`VendorsPage.tsx:272`: «No permite modificar a Crisitus ni ampliar el propio plazo»). Arreglo: lista blanca (`name`, `email`, `password`) en PUT/PATCH, rechazar `target.id_role===1`/email maestro y `target.id===req.user.id` salvo `isExactMaster`; mover `/:id` PUT/PATCH/DELETE, `/role` y `/access-profile` a `isExactMaster` o a una matriz explícita.

**C3. Contraseñas en claro y hashes en la auditoría.** `SENSITIVE_KEYS` solo cubre `password|token|authorization` (`audit.middleware.js:5`). `PATCH /users/master-account` envía `current_password` y `new_password` y se guardan tal cual en `datos_nuevos` (`users.routes.js:13`, `audit.middleware.js:110-113`). Además `capturarEstadoOriginal(User)` serializa el usuario completo, **incluido el hash**, en `datos_anteriores` (`audit.middleware.js:43`; rutas PUT/PATCH/DELETE en `users.routes.js:26-52`). Esos logs los leen auditores (rol 5), superusuarios temporales y quien tenga el área `auditoria` (`audit_log.routes.js:7-12`; `getAll` sin paginar). Arreglo: redactar por regex `/pass(word)?|token|secret|hash/i`, excluir `password` del snapshot, y limpiar logs existentes (hoy en dev: 0 filas de `usuarios`).

### ALTOS

**A1. «Nueva cuenta» con Auditor o Técnico siempre falla.** La UI llama `createUser({id_role: 5|6})` (`VendorsPage.tsx:169`) pero el backend solo acepta [2,3,4] (`user.controller.js:233`) → 400 «Rol no permitido». Y es no atómico: con rol 3 afiliado, si `configureAccess` falla queda un rol 3 huérfano y reintentar da 409 (`:236`). Arreglo: endpoint único transaccional `POST /users` con `id_role` 2-6 y perfil de acceso.

**A2. Sin guardas al borrar/degradar.** `deleteUser` (`:331-344`) no impide borrarse a sí mismo, a la maestra ni al único rol 1. FKs de `users`: `companies` **CASCADE** (se borra la empresa emisora), `carrito_items`, `area_grants`, `access_requests` CASCADE; `affiliate_businesses`, `cierres_caja`, `productos`, `libro_reclamaciones` NO ACTION → 500 genérico «Error al eliminar usuario» sin explicación; `ventas.id_cajero` sin FK → ventas huérfanas. No existe baja lógica (columna `activo` inexistente). Arreglo: columna `estado` (activo/suspendido) o `deleted_at`, bloquear delete con dependencias y devolver 409 explicativo.

**A3. Cambiar de rol deja residuos de privilegio.** `changeUserRole` solo escribe `id_role` (`:127`): conserva `tipo_vendedor='afiliado'`/`affiliate_business_id` (el middleware sigue tratándolo como afiliado, `auth.middleware.js:25`), `superusuario_temporal=true` (se reactiva si vuelve a rol 2) y `acceso_expira_en`. También admite rol 5 sin caducidad (queda bloqueado para siempre, `auth.middleware.js:21`) y rol 6 sin teléfono (`:118` vs `:148-150`). Arreglo: limpiar los campos del perfil anterior y aceptar solo 2 y 4 aquí; 3/5/6 solo por `access-profile`.

**A4. Elevación temporal concedible por vías no auditadas ni exactas.** `configureTemporarySuperuser` exige email maestro (`:182`), pero `master` basta para: `/audit-logs` DELETE (`audit_log.routes.js:20`, el comentario dice «solo la cuenta maestra»), `affiliates/payments/:id/validate` y `settlements` (UI: «Solo Crisitus valida pagos», `AffiliateAdminPanel.tsx:42`) y crear/borrar usuarios. Un admin temporal puede validar su propio pago o borrar la evidencia. Arreglo: `isExactMaster` en validate, generar liquidación y DELETE logs.

**A5. Rechazar tras aprobar no revoca el permiso.** `resolve` no comprueba `item.status==='pending'` y al rechazar no desactiva el grant (`access.controller.js:7`). Cualquier valor distinto de `'approved'` cuenta como rechazo. Aprobar sin fecha crea permiso **permanente** (`expires_at: null`), y la UI reutiliza un único `expires` para todas las solicitudes (`AccessCenterPage.tsx:3`). No hay botón para revocar (`DELETE /access/grants/:id` sin UI) ni vista de grants ajenos.

**A6. Cambio de contraseña no invalida sesiones.** El JWT es `{id,id_role,tipo_vendedor}` sin versión (`auth.controller.js:21-25`); tras `updateMasterAccount` (`:25-26`) el token robado sigue vivo 8 h. La UI no cierra sesión (`MasterAccountPage.tsx:15`). Tampoco hay revocación al desactivar/cambiar de rol (parcialmente mitigado porque `auth.middleware` relee BD; pero `requireAdminAccess` no, ver C1). Arreglo: columna `password_changed_at` y comparar con `iat`; cerrar sesión en el cliente.

**A7. Auditoría incompleta y engañosa.** `registrarAuditoria` registra aunque la respuesta sea 4xx/5xx (hook en `res.send`, `audit.middleware.js:64-119`): un intento fallido consta como «crear usuario». No registra: alta por `/auth/register`, `access` (resolver/revocar), `affiliates` (generar, validar, pagos), fallos de login, ni cambios de `master-account` con `registro_id` (no hay `capturarEstadoOriginal`; `registro_id` queda null). Arreglo: registrar solo `res.statusCode<400`, añadir los middlewares faltantes y guardar un diff `{campo: [antes, después]}`.

### MEDIOS

**M1. Sin validación de entrada en alta/edición.** `createUser` no valida formato de email ni longitud de clave (`:229-246`; el front exige 8+mayús+número+símbolo, `VendorsPage.tsx:48`, el back nada; `/auth/register` pide 6, master 12). `updateUser` no normaliza ni comprueba unicidad (500 por UNIQUE) y pone `name/email/id_role = undefined` si faltan (`:279-285`; `id_role` admite NULL). Falta tope de longitud (bcrypt corta a 72 bytes). Arreglo: validador compartido (express-validator) con una sola política (≥12 o 10+complejidad).

**M2. Comisión y caducidad.** `Number(req.body.comision_servicio_porcentaje ?? 8)` acepta `NaN` (`:159-160`, `NaN<0` es falso) y se guarda; la UI fija 8 y el back lo recalcula sin `Number.isFinite`. `new Date(req.body.acceso_expira_en)` sin zona se interpreta en la del servidor (`:156`); la UI manda ISO y está bien, pero al **editar** una cuenta existente se rellena con `toISOString().slice(0,16)` (UTC) en un `datetime-local` (hora local): se desplaza 5 h en Lima (`VendorsPage.tsx:160,162`). Reconfigurar un afiliado reescribe su comisión sin versionar (`:167`).

**M3. Rate limit de login.** 10 intentos/15 min **por IP** y cuentan los exitosos (`config/security.js` auth; `security.middleware.js:6-16` sin `skipSuccessfulRequests`); el límite cubre también `/auth/google` y `register-customer`. Varias personas tras una misma IP del taller se bloquean entre sí; no hay límite por cuenta; contador en memoria (se reinicia al redeploy). `PATCH /users/master-account` verifica la clave actual con bcrypt solo bajo el límite global 300/min (`app.js:89`). Arreglo: `skipSuccessfulRequests:true`, clave `ip+email`, límite estricto en master-account.

**M4. Email maestro hardcodeado en tres sitios con comportamientos distintos.** Front: `VendorsPage.tsx:117`, `MasterAccountPage.tsx:11`, `AccessCenterPage.tsx:3`, `DashboardLayout.tsx:143`, `CompanySunatPage.tsx:25`. Back: `crisitusOnly.middleware.js:4` cae a `cristophercalioro@gmail.com` si falta la variable, mientras `master.middleware.js:6` y `user.controller.js:123,181` deniegan todo si falta. Resultado: sin `MASTER_ADMIN_EMAIL` la ficha de cuenta maestra funciona pero nada más. Además `PUT/PATCH /users/:maestra` puede cambiar su email y bloquearla (la UI dice «correo fijo», solo es `readOnly`). Arreglo: exponer `is_master` en el login (calculado en servidor) y quitar los literales del front.

**M5. `GET /users` sin paginación ni búsqueda y con PII.** Devuelve todas las columnas menos `password` (teléfono, caducidades, `affiliate_business_id`, `acceso_otorgado_por`) de todos los usuarios, incluidos los clientes del ecommerce (rol 4) y cuentas de Google (`auth.controller.js:152,285`). La UI los mete en el `Select` y la tabla (`VendorsPage.tsx:255,299`) con scroll pero sin búsqueda; escalará mal. Arreglo: `GET /users?search=&rol=&estado=&page=&limit=` con `attributes` explícitos; separar clientes ecommerce de personal ERP.

**M6. Errores mostrados como vacío.** Si `fetchUsers` falla, `accounts=[]` y la tabla muestra «No hay cuentas registradas.» (`VendorsPage.tsx:299`; el error solo aparece dentro del paso 1, `:255`). `AffiliateAdminPanel` ignora `isError` (`:16`) y `submit`/`validate` no tienen `onError` (`:27-34`): un 4xx/5xx falla en silencio. `AccessCenterPage` solo notifica con toast y deja la lista vacía (`:3`). Los estados de solicitud se muestran en inglés crudo (`pending/approved`).

**M7. Desajuste menú vs. rutas.** El menú oculta «Usuarios y afiliados» si no es Crisitus (`DashboardLayout.tsx:237-238`) pero la ruta `/vendors` admite también al rol 2 elevado (`App.tsx:216`) y el backend lo deja operar (C2). `/access-center` excluye rol 4 en la UI pero `POST /access/request` solo exige `auth` (`access.routes.js`): un cliente ecommerce puede crear solicitudes y, si se aprueban, obtener un grant. Arreglo: `rolesPermitidos` también en `/access/request`.

**M8. Afiliados: liquidaciones.** (a) `vence_en` = último día del **periodo** a las 23:59:59 Lima (`affiliate.controller.js:82`); generar un mes ya cerrado nace vencida y el próximo request del afiliado lo suspende (`restricciones.middleware.js:43-48`). (b) La UI genera el mes en curso con `new Date().toISOString().slice(0,7)` (UTC: tras las 19:00 del último día ya es el mes siguiente, `AffiliateAdminPanel.tsx:11`) y el monto es parcial hasta regenerar; no hay cron. (c) `submitPayment` acepta `metodo` libre, `comprobante_url` arbitraria y pagos duplicados pendientes (`:95-96`); `validatePayment` no revalida contra `monto_comision` actual (puede haber subido tras regenerar) y reactiva al negocio aunque haya otras liquidaciones vencidas (`:108-109`). (d) El estado `cerrado` del negocio no se asigna en ningún flujo; quitar el rol afiliado no suspende ni cierra el negocio (A3). (e) Sin auditoría (A7).

**M9. `assignInventory`.** Sin `try/catch` (en Express 4 una excepción deja la petición colgada), no valida que los productos existan ni que no pertenezcan a otro vendedor/negocio, y vacía la propiedad previa del vendedor en bloque (`user.controller.js:192-201`). Lo mismo para `getMasterAccount` (`:7-10`), todo `access.controller.js` y buena parte de `affiliate.controller.js` (sin captura de errores).

**M10. Cobertura de tests.** No existen pruebas de `/users` (alta, rol, borrado, escalada), `master-account`, `access` (aprobar/revocar/expirar) ni de vencimiento de superusuario temporal; `affiliates-access.test.js` solo cubre el caso feliz y el auditor vencido (`:47`). El test de register fija como correcto el comportamiento de C1.

## 3. Decisiones del usuario (preguntas cerradas)

1. ¿El superusuario temporal (rol 2 elevado) podrá modificar o borrar usuarios? **A)** Solo crear y configurar accesos de roles 3-6, nunca tocar roles 1-2 ni a sí mismo (recomendado). **B)** Todo menos la cuenta maestra. **C)** Se mantiene como hoy.
2. ¿Se mantiene `/auth/register` como alta de personal? **A)** Eliminarlo y usar solo `POST /users` (recomendado). **B)** Mantenerlo solo para la cuenta maestra.
3. ¿Qué pasa con una cuenta que se «elimina»? **A)** Baja lógica (estado Suspendida, conserva ventas y auditoría) y borrado físico solo sin movimientos (recomendado). **B)** Borrado físico siempre.
4. ¿Política de contraseña única? **A)** 12+ caracteres (como la cuenta maestra). **B)** 8+ con mayúscula, número y símbolo (como el formulario). **C)** Otra.
5. ¿Cambiar contraseña o rol debe cerrar las sesiones abiertas? **A)** Sí, siempre (recomendado). **B)** Solo en cambios de contraseña de la cuenta maestra.
6. ¿Duración por defecto de un permiso de área aprobado? **A)** Obligatoria, con tope de 30 días (recomendado). **B)** Opcional como hoy (puede ser permanente).
7. ¿Quién valida pagos de afiliados y elimina logs? **A)** Solo Crisitus (coincide con la UI, recomendado). **B)** También el superusuario temporal.
8. ¿Los clientes ecommerce (rol 4) aparecen en «Usuarios»? **A)** No, solo personal ERP, con pestaña aparte para clientes (recomendado). **B)** Sí, mezclados con filtro.
9. ¿Liquidación de afiliados? **A)** Solo meses cerrados, con vencimiento a 10 días tras el cierre (recomendado). **B)** Mes en curso como hoy.
10. ¿El correo de la cuenta maestra se define solo en servidor y el front lo recibe como `is_master`? **A)** Sí (recomendado). **B)** Se deja literal.

## 4. Datos reales para el brief de diseño

**Roles** (tabla `roles`; el nombre mostrado en UI difiere del de BD): 1 Gerente (UI «Cuenta maestra»), 2 Administrador, 3 Vendedor, 4 «No Autorizado» (UI «Cliente»), 5 Auditor temporal, 6 Técnico. Discrepancia de etiquetas a resolver en diseño.

**Conteos en la BD dev actual** (3 usuarios; datos de semilla): rol 1 = 1, rol 2 = 1, rol 5 = 1 (con caducidad futura, 0 vencidos). Rol 3, 4 y 6 = 0. `superusuario_temporal` = 0, `tipo_vendedor` nulo en todos, `area_grants` = 0, `access_requests` = 0, `affiliate_businesses` / `settlements` / `payments` = 0. `audit_logs` tiene 124 filas, ninguna de la tabla `usuarios` (solo 9 `login`); es decir, la gestión de usuarios aún no ha dejado rastro. Diseñar pensando en listas largas (decenas de personal, cientos de clientes), no en 3 filas.

**Campos de usuario** (`user.model.js`): nombre, correo (único), rol, tipo de vendedor (`fisico`/`virtual`/`afiliado`), teléfono (obligatorio para técnico, 9 dígitos que empiezan en 9), comisión %, acceso vence en, otorgado por, superusuario temporal + vence en, negocio afiliado, creado/actualizado. **No existe** estado activo/suspendido, último acceso ni foto.

**Estados a representar:** Activo · Auditor vigente / vencido (hoy se entera por 403 al operar) · Superusuario temporal vigente / vencido · Afiliado en prueba (2 meses) / activo / suspendido / cerrado · Liquidación pendiente / vencida / pagada · Pago pendiente / validado / rechazado · Solicitud pendiente / aprobada / rechazada · Permiso activo / vencido / revocado.

**Catálogos:** 9 áreas delegables (ver sección 1); métodos de pago manual: transferencia, efectivo, otro; tarjeta vía Culqi; comisión fija 8 % (UI) con rango válido 0-100 (back).

**Acciones que la UI aún no tiene:** editar nombre/correo/contraseña de un usuario, suspender/reactivar, borrar con dependencias, ver y revocar permisos de área vigentes, historial de cambios por usuario, buscar/filtrar, cerrar sesiones, ver quién concedió qué.

## 5. Pantallas de diseño recomendadas: **5**

1. **Usuarios** (lista con búsqueda, filtros por rol/estado/vigencia, chips de estado, acciones por fila; pestañas Personal / Clientes).
2. **Detalle de usuario** (panel lateral o página: datos, rol y perfil de acceso, permisos de área, historial de auditoría, suspender/eliminar con aviso de dependencias).
3. **Asistente crear / cambiar acceso** (reemplaza el wizard de 4 pasos; incluye caducidad con zona horaria Lima visible y superusuario temporal).
4. **Afiliados** (negocios, estado, prueba, liquidaciones y validación de pagos; solo Crisitus valida).
5. **Cuenta maestra + Permisos de área** (cambio de contraseña con política visible y cierre de sesiones; bandeja de solicitudes con aprobar/rechazar/revocar y vigencia por solicitud).

Cada pantalla necesita sus estados vacío, cargando y **error** (hoy el error se presenta como vacío, M6).

## 6. Orden de arreglo sugerido

C1, C2, C3 primero (escalada y fuga de credenciales); luego A1, A2, A3, A5, A6 junto con el rediseño; M1-M10 durante la implementación. Todo cambio de C1/C2 necesita pruebas nuevas en `__tests__/integration` (rol 2 no crea rol 1; admin temporal no altera ni borra a la maestra ni se autoprorroga; logs sin contraseñas).

---
# RESULTADO DEL ARREGLO (writer «Usuarios y afiliados» + «Cuenta maestra»)

**Estado: done** (backend y front mínimo). Todo C1-C3, A1-A6 y los M razonables, salvo lo listado en «Pendientes».

## Archivos tocados
Backend: `controllers/{user,auth,access,affiliate}.controller.js`, `routes/{users,auth,access,affiliate}.routes.js`, `middlewares/{master,admin,crisitusOnly,auth,security}.middleware.js`, `models/user.model.js`, `scripts/ensure-admin-users-schema.js` (nuevo), `index.js` (2 líneas: require + etapa «esquema usuarios»), `__tests__/integration/admin-usuarios-logica.test.js` (nuevo, 27 tests).
Front: `services/{userService,affiliateService}.ts`, `contexts/AuthContext.tsx`, `pages/vendors/{VendorsPage,AffiliateAdminPanel}.tsx`, `pages/access/{AccessCenterPage,MasterAccountPage}.tsx`. Respaldos en `odd/backup/administracion/usuarios-*`.

## Comandos y resultado observado
- `jest --runInBand --forceExit --testTimeout=90000 admin-usuarios-logica auth affiliates-access no-console-log boot cors companies ventas postventa-logica content-admin`: 10 suites / 60 tests PASS. (Con el timeout por defecto de 15 s `setupTestDb` (sync force ≈ 13 s en esta máquina) falla en `beforeAll`; es de entorno, no del código: usar `--testTimeout=90000`.)
- `tsc -p tsconfig.app.json --noEmit` (contenedor frontend): 0 errores.
- BD dev: columnas `activo`, `token_version`, `password_changed_at` creadas al arrancar. Smoke real con el token del usuario 1: `/api/auth/me` → `es_maestra:true`; `/api/users?grupo=personal&limit=2` → `{data,total,page,limit,pages,conteos}`; `/api/access/grants` → 200.

## Qué cambió (por defecto)
- **C1** `/auth/register` y `POST /users` usan la MISMA función `createStaffUser`: rol 1 nunca se crea (422); rol 2 solo lo crea un rol 1 (un rol 2 elevado recibe 403); un Administrador sin elevación ya no entra a `/auth/register` (403). El rol se relee de la BD (ya no del JWT). `register` ya no devuelve token de la cuenta creada.
- **C2** niveles separados en `master.middleware.js`: `master` (maestra real O rol 2 elevado), `exactMaster` (solo rol 1 + MASTER_ADMIN_EMAIL), `manager` (rol 1 o elevado, releído). Rutas exactMaster: master-account, temporary-superuser, status, DELETE, resolver/revocar accesos, generar liquidación, validar pago. PUT/PATCH con lista blanca `name,email,password` (+`id_role` solo por compat y pasando por las reglas de `/role`). Cuentas protegidas (rol 1 o correo maestro): nadie las edita por `/users/:id` (se usa `/users/master-account`). El elevado nunca toca roles 1-2 ni a sí mismo.
- **C3** el middleware de auditoría ya lo corrigió el otro writer: verificado con test (ni contraseñas en claro ni hashes en `audit_logs`, también `current_password/new_password`). `master-account` ahora fija `registro_id`.
- **A1** `POST /users` acepta roles 2-6 con perfil (tipo_vendedor / acceso_expira_en / telefono / nombre_comercial) en una transacción; el front crea con una sola llamada.
- **A2** DELETE solo exactMaster, con guardas (no maestra, no a sí mismo, no último admin, 409 `USER_HAS_HISTORY` con `dependencias` si hay ventas/caja/pedidos/compras/negocio afiliado/empresa/auditoría≠login…). Baja lógica nueva: `PATCH /users/:id/status {activo}`.
- **A3** `/role` solo 2 y 4; limpia tipo_vendedor, negocio (queda `suspendido`, reversible), caducidades, elevación; sube `token_version`.
- **A5** resolver: solo pendientes se aprueban, vigencia OBLIGATORIA futura y ≤ 30 días, estado validado; rechazar una aprobada revoca el grant. Nuevo `GET /access/grants`. Rol 4 no solicita áreas.
- **A6** `token_version` en el JWT (`tv`) y comprobación en `authMiddleware`/`requireAdminAccess`; sube con cambio de clave, de rol y desactivación. Tokens previos → 401 `SESSION_REVOKED`.
- **M1** validación fuerte (correo, nombre 3-120, clave 8-72 con mayúscula+número+símbolo, 12 para la maestra, rol válido, unicidad 409 en PUT). **M2** comisión `NaN` rechazada; fechas sin zona = hora de Lima. **M3** login: solo cuentan fallos; tope por IP (3×) y por IP+correo; `masterAccountLimiter` 5 fallos/15 min. **M4** `es_maestra` en login, `/auth/me` y `/users/master-account`; `crisitusOnly` ya no tiene correo por defecto (todo deniega igual si falta `MASTER_ADMIN_EMAIL`). **M5** `GET /users` paginado/filtrado, sin `password` ni `token_version`. **M6** errores visibles en las 4 pantallas. **M7** `/access/request` excluye rol 4. **M8** vencimiento = día 10 del mes siguiente 23:59:59 Lima (si se genera tarde, 10 días desde hoy; nunca nace vencida); mes futuro/`2025-13` → 422; pago manual valida método/referencia/comprobante y rechaza duplicado pendiente; validar revalida monto y reactiva solo si no quedan otras vencidas. **M9** assignInventory con try/catch, existencia y 409 si el producto es de otro vendedor.
- Bug extra: caducidades (`acceso_expira_en`, `superusuario_expira_en`) se comparaban 5 h antes (texto Lima leído como UTC): `limaInstant/isFuture` en `master.middleware.js`, usados en auth, master y login.

## Contrato final
Errores: `{message, error (alias legacy), errores?: {campo: msg}}`; 500 siempre con cuerpo. Fechas de respuesta de usuarios/accesos/liquidación generada: ISO `-05:00`.

| Ruta | Guardia | Parámetros → respuesta |
|---|---|---|
| `POST /auth/login` | límite fallos IP e IP+correo | `{success,token,user:{id,id_user,name,email,id_role,tipo_vendedor,acceso_expira_en,superusuario_temporal,superusuario_expira_en,area_grants,affiliate_business_id,es_maestra}}`; 403 `ACCOUNT_DISABLED`/`TEMPORARY_ACCESS_EXPIRED` |
| `GET /auth/me` | auth | `{success,user:{…igual…}}` |
| `POST /auth/register` | auth + manager (rol 1 o elevado) | `{name,email,password,id_role?}` → 200 `{success,msg,user}`; 403/409/422 |
| `GET /users` | master | `?search&rol=3,5&estado=activo\|inactivo\|vigente\|vencido\|elevado&grupo=personal\|clientes\|todos&page&limit(≤100)` → `{data,total,page,limit,pages,conteos:{personal,clientes}}`; cada fila añade `es_maestra,superusuario_vigente,acceso_vencido` |
| `POST /users` | master | `{name,email,password,id_role 2-6, tipo_vendedor?, nombre_comercial?, comision_servicio_porcentaje?, acceso_expira_en? (rol 5), telefono? (rol 6)}` → 201 usuario; 403 (rol 2 por no-gerente) / 409 / 422 `errores` |
| `PUT/PATCH /users/:id` | master + reglas de actor | `name,email,password` → usuario; 403 protegida/propia/rol 2; 409 correo; 422 |
| `PATCH /users/:id/role` | master | `{id_role: 2\|4}` |
| `PATCH /users/:id/access-profile` | master | `{id_role 3\|5\|6, …perfil}` |
| `PATCH /users/:id/status` | exactMaster | `{activo:boolean}` |
| `PATCH /users/:id/temporary-superuser` | exactMaster | `{enabled,expires_at}` |
| `DELETE /users/:id` | exactMaster | 200 `{message}` o 409 `{code:'USER_HAS_HISTORY',dependencias:{etiqueta:n},puede_desactivar:true}` |
| `GET/PATCH /users/master-account` | exactMaster | PATCH `{name,current_password,new_password?}` → `{…,es_maestra,sesiones_cerradas}` (el cliente debe volver a iniciar sesión) |
| `GET /access/my` · `POST /access/request` | auth (rol 4 → 403) | `{area,reason 5-500}` → 201/200 |
| `GET /access/requests` | master | `?status&page&limit` → arreglo + cabecera `X-Total-Count`; aprobadas traen `permiso:{id_grant,estado:activo\|vencido\|revocado,expires_at}` |
| `GET /access/grants` | master | `?estado=activo\|vencido\|revocado\|todos` → permisos con `user` |
| `PATCH /access/requests/:id` | exactMaster | `{status:'approved'\|'rejected', expires_at (obligatoria al aprobar, ≤30 días), review_note?}`; 409 si ya resuelta |
| `DELETE /access/grants/:id` | exactMaster | `{success:true}` |
| `GET /affiliates` | master | negocios + liquidaciones + resumen |
| `POST /affiliates/:id/settlements` | exactMaster | `{periodo:'AAAA-MM'}` → liquidación + `periodo_cerrado` (false = monto parcial) |
| `POST /affiliates/settlements/:id/payments` | auth dueño o rol 1 | `{monto,metodo:transferencia\|efectivo\|otro,referencia≥3,comprobante_url? (/uploads/ o https)}`; 409 si hay pendiente |
| `PATCH /affiliates/payments/:id/validate` | exactMaster | `{aprobado,observaciones?}` |

## Decisiones aplicadas por defecto / pendientes del usuario
1. Elevado: crea y configura roles 3-6 y edita nombre/correo/clave de 3-6; NO toca roles 1-2, ni a sí mismo, ni borra, ni desactiva, ni concede accesos/elevaciones (1A conservador, con edición de datos de 3-6).
2. `/auth/register` se MANTIENE (compatibilidad) pero delegando en `createStaffUser`; eliminarlo (2A) queda a decisión.
3. Baja lógica (3A): implementada con `activo`; borrado físico solo sin movimientos.
4. Clave única de personal 8-72 con mayúscula/número/símbolo (4B, igual que el formulario); la maestra 12 (4A solo para ella). El registro público de clientes no cambia (≥6).
5. Cambiar clave/rol/desactivar cierra sesiones (5A). Cambiar el correo no.
6. Permiso de área obligatorio y ≤30 días (6A).
7. Validar pagos y generar liquidaciones: solo la maestra real (7A). DELETE `/audit-logs` queda en `audit_log.routes.js` (otro writer): sigue siendo `master`, debería ser `exactMaster` — PENDIENTE de ese writer.
8. Clientes (rol 4) no aparecen en la pestaña Personal (`grupo=personal`); el listado por defecto (`todos`) sigue incluyéndolos por compatibilidad con `UsersPage`. Pestaña «Clientes» en el diseño: usar `grupo=clientes`.
9. Liquidación: se permite el mes en curso (el test existente lo exige) marcándolo `periodo_cerrado:false`; exigir «solo meses cerrados» (9A) queda pendiente de decisión.
10. `es_maestra` en servidor (10A) hecho; quedan 6 literales del correo maestro en el front fuera de mi alcance (no se rompen: el backend manda): `layouts/DashboardLayout.tsx:143`, `pages/audit-logs/AuditLogsPage.tsx:539`, `pages/manuals/ManualsPage.tsx:25`, `pages/users/UsersPage.tsx:107,271`, `pages/services/ServiceAreaPage.tsx:110`, `pages/company/CompanySunatPage.tsx:25` → reemplazar por `user?.es_maestra`.
Otros pendientes: `UsersPage` envía `id_role` en el PUT (funciona, pero solo 2/4); `requireAdminAccess` ya relee BD pero `community.controller`/`pedido.controller` verifican el JWT sin consultar `token_version`; el rate limit sigue en memoria; sin cron que pase liquidaciones a `vencido` (lo hace `restricciones.middleware` al operar); `DELETE /audit-logs` ver punto 7.

## Datos para el brief de diseño
- Roles reales (`id_role`): 1 Gerente/«Cuenta maestra», 2 Administrador, 3 Vendedor, 4 «No Autorizado»=Cliente, 5 Auditor temporal, 6 Técnico. Roles asignables desde el asistente: 2-6 (1 nunca).
- Estados: usuario `activo|desactivada`; auditor `vigente|vencido` (`acceso_vencido`); administrador `elevado vigente` (`superusuario_vigente`); afiliado negocio `activo|suspendido|cerrado` + prueba 2 meses; liquidación `pendiente|vencido|pagado|anulado` (+ `periodo_cerrado`); pago `pendiente|validado|rechazado`; solicitud `pending|approved|rejected` (mostrar en español); permiso `activo|vencido|revocado`.
- Campos de usuario en lista: id_user, name, email, id_role, tipo_vendedor, telefono, comision_servicio_porcentaje, acceso_expira_en, acceso_otorgado_por, superusuario_temporal/expira, affiliate_business_id, activo, createdAt/updatedAt, es_maestra, superusuario_vigente, acceso_vencido. Nunca viajan password/token_version.
- Conteos BD dev (al cerrar): 1 usuario (id 1, rol 1, maestro); `area_grants`/`access_requests`/`affiliate_*` = 0. Las listas del diseño deben pensar en decenas de personal y cientos de clientes (paginación de 25).
- Errores devueltos con `errores:{campo}` para pintar bajo cada input. Acciones nuevas para el diseño: desactivar/reactivar, borrar con aviso de dependencias, revocar permiso, búsqueda y filtro por rol/estado, cierre de sesión tras cambiar la clave.
- Datos de prueba: ninguno persistente en BD dev (los tests usan la BD de test).

## Key Learnings
1. En MySQL las fechas llegan como texto de pared de Lima; `new Date(texto)` en un contenedor UTC las adelanta 5 h. Comparar caducidades con `isFuture/limaInstant` y serializar con `iso()` (`-05:00`).
2. El JWT se complementa con `tv` (= `users.token_version`): subirlo invalida sesiones sin lista negra; todo sitio que firme un JWT debe incluir `tv` (login, google; el registro nuevo es 0).
3. `master.middleware` admite al rol 2 elevado; para dinero/accesos/borrado se encadena `exactMaster`. `crisitusOnly` ahora es alias de `exactMaster` y no tiene correo por defecto.
4. `User.create` en `createStaffUser` va SIN opciones cuando no hay perfil (auth.test espía exactamente un argumento) y con transacción cuando sí lo hay.
5. `setupTestDb` tarda ~13 s: ejecutar jest con `--testTimeout=90000` y respetar el candado `/tmp/jest.lock` con `until mkdir` (un bucle acotado deja correr sin candado).

## Run OD — Cuenta maestra
- Proyecto: `criscom-adm-maestra` («Administración - Cuenta maestra»), carpeta `odd/opendesign/criscom-adm-maestra/`
- runId: `c7912d61-adb4-4d6a-8071-b4303b2baa40` (agente claude, modelo claude-sonnet-5-5), lanzado 10/10/2026 ~21:00 (hora de Lima); estado al lanzar: ver verificación única (queued/running).
- Brief: `odd/tools/brief_adm_maestra.py`; prompt: `odd/tmp/prompt-adm-maestra.txt`; medidas: `odd/tmp/adm_maestra_medidas.json`; capturas: `odd/tmp/adm_maestra_cap.js`.
- Seeds (marca `seed-adm`, para limpiar): usuarios 9010 Patricia Ñahui (rol 3), 9011 Víctor Condori (rol 5), 9012 Sofía Cáceres (rol 6); access_requests 5-8 (aprobadas); area_grants 3-6. Script: `odd/tmp/adm_maestra_seed.sh`.

## Run OD
- Proyecto: `criscom-adm-usuarios` («Administración - Usuarios y afiliados»), carpeta `odd/opendesign/criscom-adm-usuarios/` (DESIGN.md 27 KB + usuarios-data.json + 24 capturas en `referencias/`).
- runId: `43420c88-a86f-4a19-930a-2edc00877bfc` (conversationId `84360c24-2167-4558-af30-06406d47a286`), lanzado 10/10/2026 ~21:07 (Lima). Comprobado una vez: ver estado en la entrega; no se espera ni se cancela.
- Generadores: `odd/tools/brief_adm_usuarios.py`, `odd/tmp/prompt-adm-usuarios.txt`, capturas `odd/tmp/adm_usuarios_cap*.js`.
- Seeds creados (marca seed-adm, para limpiar): usuarios 9003-9009 y 9013 (Rosa, Luis, Marco, Carla [elevada], Jorge [desactivado], Diego, Ana, Mónica); negocios afiliados 1-3; solicitudes 1-4 y 9 (+ permisos 1-2 y el de la 9); no tocados: 1, 9001, 9002 y los de otros writers (9010-9012, solicitudes 5-8).

## Port a codigo - Cuenta maestra
- Estado: done. Entradas finas `pages/access/MasterAccountPage.tsx` y `AccessCenterPage.tsx`; carpeta `pages/access/maestra/*` (prefijo Mae: MaeScreen, MaeFicha, MaePassword, MaePermisos, MaeRow, MaeRevokeSheet, MaeDialogs, MaeDenied, MaeAccessCenter, useMaeForm, useMaeGrants, useMaeAccess, maeCommon, maeParts); `services/accessService.ts` (nuevo); `styles/maestra.css` (.pg-maestra). Respaldo previo al port de AccessCenter: `odd/backup/administracion/maestra-prePort-Frontend_src_pages_access_AccessCenterPage.tsx` (originales: `usuarios-Frontend_src_pages_access_*`).
- Verificacion: tsc (contenedor frontend) 0 errores en rutas propias (otros writers: SimPage, usrCommon); eslint 0 problemas. Playwright 1440/1280/390 claro y 1440 oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras, 0 objetivos < 44 px, sin overflow horizontal, h1 a x=24 (12 movil), 5 permisos visibles sin scroll a 1440x900 (main 840/840).
- Flujo: PATCH /users/master-account interceptado con page.route (200 solo nombre, 200 con contrasena -> dialogo previo + banner + cierre de sesion a /erp/login, 422 por campo con resumen y foco, 429 con boton deshabilitado y motivo, 401). Ninguna contrasena real cambiada. Revocar real solo sobre grant seed-adm 7 (confirmacion inline en escritorio, dialogo en movil; 404 simulado); grant 7 restaurado a active=1.
- 403: es_maestra=false (cliente, via /auth/me simulado) y 403 del servidor muestran el estado completo sin campos ni lista.
- Diferencias diseno vs implementacion: (1) 1280x720 necesita ~47 px de scroll en el main (los correos seed largos hacen 3 lineas por fila); (2) pie fijo movil omitido (el contenedor rompe sticky): el boton queda al final de la tarjeta; (3) el 401 de lib/api.ts redirige de inmediato a `/login` (sin /erp, fuera de mis archivos): el dialogo 401 casi no llega a verse; (4) AccessCenter (sin diseno aprobado) conserva shadcn: sin cabecera degradada, sin bloque de permisos concedidos (ahora en Cuenta maestra, con enlace).
- Pendientes con archivos ajenos: `lib/api.ts` redirige a `/login` en vez de `/erp/login`; los 6 literales de correo maestro del front listados arriba.
- Seeds modificados: area_grants 7 (revocado y restaurado).

## Port a codigo (Usuarios y afiliados)
- Estado: done. Entradas finas `pages/vendors/VendorsPage.tsx` (prop `embedded`) y `AffiliateAdminPanel.tsx`; carpeta `pages/vendors/usuarios/*` (31 archivos prefijo Usr/usr/useUsr, todos < 110 lineas); CSS `styles/usuarios.css` (`.pg-usuarios`, reglas con doble clase para no chocar con `.pg-empresa` cuando se embebe). Respaldos previos: `odd/backup/administracion/usuarios-port-pre-*` (ademas de `usuarios-Frontend_*`).
- Embebido: `UsrPage` oculta su h1 si `embedded` o si la ruta no termina en `/vendors` (pestana `users` de Empresa); en ese modo "Nueva cuenta" va en la barra de pestanas.
- Reglas de actor (`usrRules.ts`): controles deshabilitados con el motivo escrito (maestra protegida, propia cuenta, administrador sobre rol 2, solo cuenta maestra para estado/eliminar/elevar/resolver/liquidar/validar). 409 USER_HAS_HISTORY con dependencias + "Desactivar en su lugar". Confirmaciones inline, sin window.confirm.
- Verificacion: tsc 0 errores en rutas propias; eslint 0 errores (2 warnings preexistentes `any` en los services). Playwright 1440x900, 1280x720, 390x844 (Usuarios, alta, Solicitudes, Afiliados, embebido en `/erp/company?tab=users`, oscuro): 0 gradientes, 0 backdrop-filter, 0 sombras, 0 objetivos < 44 px, sin overflow horizontal, h1 en x=296 (24 del main) y x=12 en movil. Flujos reales con seed-adm: alta (errores 422/409), tipo de vendedor, cambio y descarte de contrasena, desactivar/reactivar/eliminar, 409 de Diego Rojas, aprobar (422 de 30 dias y exito) y revocar, celular de tecnico, vencimiento de auditor, elevacion; actor Carla Mendoza (elevada) con token firmado: todo deshabilitado con motivo; estados 500/403 (401 lo maneja el interceptor).
- Diferencias diseno vs backend: (1) `X-Total-Count` no llega en dev (CORS no lo expone): los contadores de Solicitudes salen de la pagina (hasta 100). (2) Cambio de perfil entre Vendedor/Auditor/Tecnico y asignar perfil a un Cliente no se ofrece (el diseno solo trae Hacer Administrador / Pasar a Cliente). (3) El backend no devuelve `periodo_cerrado` en GET /affiliates: "Monto parcial" se deriva del mes en curso en Lima. (4) La insignia de Afiliados cuenta liquidaciones por vencer en 3 dias (hoy 0: ninguna liquidacion real).
- Seeds tocados (seed-adm): creado y eliminado `seed-adm-port@example.invalid`; solicitud 2 aprobada y devuelta a `pending` por SQL (grant 8 borrado); por un error de mi selector se revoco el grant 4 (Patricia, otro writer) y lo restaure por SQL (active=1); `token_version` subio en 9004 (1->3) y 9005 (1->2) por guardar perfil; celular de 9004 y vencimientos de 9005/9006 quedaron iguales. No se tocaron contrasenas ni roles de 1, 9001 y 9002.
- Pendientes ajenos: ninguno bloqueante. `CompanySunatPage` ya monta `<VendorsPage />` sin props (funciona por deteccion de ruta).

## Port a codigo - Solicitudes de acceso
- Estado: done. Entrada fina `pages/access/AccessCenterPage.tsx` -> `pages/access/solicitudes/*` (SolScreen, SolPermisos, SolForm, SolSolicitudes, SolBandeja, SolRow, SolConfirm, SolEstados, useSolAccess, solApi, solCommon + tests); `pages/access/maestra/MaeAccessCenter.tsx` queda como re-export de compatibilidad (useMaeAccess.ts intacto, ya sin uso); CSS `styles/sol-acceso.css` (`.pg-solacc`, od2css+fixcq; dialogos del tablero quitados: ErpDialog con `.pg-solacc.dlgw`). /master-account no se toco y sigue funcionando.
- Verificacion: tsc 0 errores (proyecto completo); eslint 0 problemas en pages/access y pages/manuals; vitest 11/11 (solCommon + manualProfile). Playwright 1440/1280/390 claro y oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras fuera de dialogos, 0 objetivos < 44 px, sin overflow horizontal, h1 a x=24 (12 movil). Vista vendedor (es_maestra:false via /auth/me): sin bandeja, vacios distintos por bloque, Enviar deshabilitado con motivo, enlace /erp/master-account.
- Flujo real (seed-adm): POST 201 nueva + POST 200 «Solicitud actualizada» (contador en vivo 46/500); aprobar seed 10 (auditoria, 7 dias) con dialogo de consecuencia exacta (grant 9 creado); rechazar seed 11; aprobar y luego rechazar mi propia seed 12 (dialogo REVOCA, grant 10 creado y desactivado). Chips Pendientes/Aprobadas/Rechazadas con contador desde la pagina (X-Total-Count no llega en dev, como en Usuarios).
- Diferencias diseno vs backend: (1) GET /access/my devuelve fechas SIN zona (hora de pared de Lima): fmtAccess las imprime tal cual y accessDate las lee como hora local; queda como pendiente conocido que el backend las mande con -05:00. (2) 401 lo redirige el interceptor (dialogo de sesion casi no se ve). (3) El 403 de rol 4 en la ruta lo resuelve RoleProtectedRoute con redireccion (archivo ajeno); la pagina muestra el 403 del diseno si un rol 4 llegara al componente.
- Manuals en el mismo port: `pages/manuals/*` (ManualsPage fina, ManualScreen, ManualGuide, ManualDenied, manualData.ts generado desde manuals-data.json = textos literales, manualProfile.ts + test) y `styles/manuals.css` (`.pg-manuals`). Correccion aplicada: perfil con user.es_maestra (era literal de correo, pendiente 10 de la lista). Respaldos: odd/backup/administracion/manuals-prePort-* y solacc-prePort-*.
- Seeds modificados (marca seed-adm, para limpiar): solicitud 10 aprobada (grant 9 activo), 11 rechazada, 12 creada y rechazada (grant 10 inactivo, usuario 1).
