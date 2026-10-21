# ecom-port-cuenta — port del diseño aprobado criscom-ecom-cuenta

Fecha: 2026-10-11. Estado: DONE. Diseño: odd/opendesign/criscom-ecom-cuenta/ (index.html, DESIGN.md, cuenta-data.json).

## Archivos

Reescritos (originales en odd/backup/ecommerce/cuenta/):
- `Ecommerce/app/(public)/iniciar-sesion/page.tsx` — entrada fina, Suspense + LoginPanel.
- `Ecommerce/app/(public)/registro/page.tsx` — idem con RegistroPanel (3 campos, como el backend).
- `Ecommerce/app/(public)/mi-cuenta/page.tsx` — idem con MiCuentaPanel (pestañas Datos/Mis pedidos/Mis solicitudes).
- `Ecommerce/app/(public)/mis-pedidos/page.tsx` — redirect("/mi-cuenta?tab=pedidos").
- `Ecommerce/app/(public)/mis-solicitudes/page.tsx` — redirect("/seguimiento").
- `Ecommerce/app/(public)/seguimiento-solicitud/[codigo]/page.tsx` — redirect a /seguimiento preservando el código (?codigo=).

Nuevos:
- `Ecommerce/app/(public)/seguimiento/page.tsx` — página unificada (Suspense + SeguimientoPanel).
- `Ecommerce/app/(public)/seguimiento-solicitud/page.tsx` — redirect("/seguimiento").
- `Ecommerce/styles/cuenta.css` — sistema .pg-cuenta (tokens de globals.css + tonos de estado locales, claro y oscuro).
- `Ecommerce/components/cuenta/`: cuentaShared.ts (etiquetas/iconos/formatos), cuentaApi.ts (mis-solicitudes, track servicio por token, mis-pedidos ampliado), CuentaBits.tsx (Chip, TipoChip, Al, Field, Cargando, ErrorCarga), LoginPanel.tsx, RegistroPanel.tsx, MiCuentaPanel.tsx, PedidosTab.tsx, SolicitudesTab.tsx, SeguimientoPanel.tsx, SeguimientoResultado.tsx.

## Verificación observada

- `docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T ecommerce sh -c 'npx tsc --noEmit'`: 0 errores en mis rutas (6 errores totales, todos preexistentes de otros writers: components/catalogo/CatalogoClient.tsx y components/servicios/ImportacionesForm.tsx).
- `... exec -T ecommerce sh -c 'npx eslint app/(public)/{iniciar-sesion,registro,mi-cuenta,mis-pedidos,mis-solicitudes,seguimiento}/page.tsx "app/(public)/seguimiento-solicitud/page.tsx" "app/(public)/seguimiento-solicitud/[codigo]/page.tsx" components/cuenta/'`: 0 errores, 0 warnings.
- Playwright (browser.newContext propio, chromium_headless_shell-1243, localhost:3000) en 1440/1280/390, claro y oscuro: 0 gradientes, 0 backdrop-filter, 0 sombras de tarjeta, 0 objetivos < 44 px, 0 overflow horizontal, 0 pageerror en TODOS los estados medidos (login, registro, mi-cuenta datos/pedidos/solicitudes, seguimiento form/pedido/importación/cotizada/ensamble/servicio/404/400). h1 en x=112 (1440), 32 (1280), 16 (390). Login completo visible y=152..417 y registro y=152..526 a 900 px de alto (diseño: cabía con 483/203 px de sobra).
- Flujo real: login seed-ecom (token en localStorage) → /mi-cuenta con pestañas "Mis pedidos 1" y "Mis solicitudes 3" reales; Datos muestra "Cliente Seed Ecom / seed-ecom-cliente@example.com / Cliente"; pedido CG-MV3JSBL2-37E95FB7BE37F736 con chips Pendiente de pago + Pago: Pendiente y total S/ 58.00; solicitudes con chip de tipo (Ensamble ARM-, Servicio WEB- Pendiente, Importación SOL- Recibida) y paginación.
- /seguimiento: pedido CG- auto-consulta sin factor (total S/ 58.00, timeline derivada); importación SOL- recibida con factor correo; importación cotizada seed-adm US$ 4,350.00 "Válida hasta el 17/10/2026 · Vigente · faltan 6 días"; ensamble ARM- presupuesto (modo/tier/uso/incluye); servicio WEB- con sesión (estado Pendiente + tarjeta de token); 404 genérico "No encontramos resultados..."; 400 "Falta este dato..." por campo; toggle del campo factor al cambiar SOL-↔CG- verificado.
- Redirects: /mis-solicitudes → /seguimiento; /seguimiento-solicitud → /seguimiento; /seguimiento-solicitud/CG-... → /seguimiento?codigo=CG-... (consulta automática); /mis-pedidos → /mi-cuenta?tab=pedidos. "Ver seguimiento" desde Mis pedidos abre /seguimiento?codigo=... con resultado.
- Avisos D7: sin sesión /mi-cuenta → /iniciar-sesion?redirect=/mi-cuenta&aviso=sesion con "Sesión vencida. Inicia sesión para ver tu cuenta."; con sesión /iniciar-sesion → /mi-cuenta?aviso=ya-sesion con "Ya tenías la sesión iniciada, por eso te llevamos a tu cuenta."
- Registro real: cliente nuevo "Cliente Seed Vacío" <seed-ecom-cuenta-vacia@example.com> creado por la UI (token emitido, redirect home); estados vacíos correctos ("Aún no tienes pedidos" / "Aún no tienes solicitudes", distintos del error de carga).

## Diferencias diseño vs backend (se siguió el backend)

1. WEB- público: el diseño (estado 11a) muestra el estado simple del servicio sin sesión; el backend NO tiene endpoint público por código WEB- (solo mis-solicitudes con auth o el token de la orden). Implementado: con sesión, el estado simple sale de mis-solicitudes (sin fechas: la línea de tiempo no las tiene ahí); sin sesión, solo la tarjeta de token.
2. Registro 400 duplicado: el backend devuelve el msg genérico "No se pudo crear la cuenta con esos datos" (no dice "correo duplicado"); se muestra ese texto bajo el campo correo (ubicación del diseño, texto del backend).
3. Registro sin celular ni casilla de comunidad: el diseño aprobado deja 3 campos; el backend sigue aceptándolos opcionales (ya no se recogen).
4. Pedido sin línea de tiempo en el backend: la timeline de /seguimiento para CG- se deriva del estado actual (fecha solo en el primer paso, fecha_creacion).
5. "Pagar ahora" (Culqi) no está en el diseño pero se conserva en la tarjeta del pedido cuando metodo_pago=tarjeta y estado_pago=pendiente (quitarlo mataba el reintento de pago); avisos inline, sin alert().
6. La línea de tiempo de la importación cotizada seed-adm llega con eventos duplicados del backend; se dibuja tal cual.

## Pendientes

- Correo maestro literal (`cristophercalioro@gmail.com`): conservado funcionalmente igual en LoginPanel y MiCuentaPanel (link /erp/ y salto post-login). Sigue pendiente la decisión global (ecom-logica-auditoria): quedan además en Header.tsx y services/ecommerceApi.ts, fuera de mis superficies.
- Footer "Mis solicitudes" apunta a /mis-solicitudes (redirect a /seguimiento funciona); el chrome es del writer de home: podría apuntar directo a /seguimiento.
- Botón de Google solo se renderiza con NEXT_PUBLIC_GOOGLE_CLIENT_ID (dev no lo tiene; condicional conservada, lógica intacta).
- Estados 429 (límite de consultas) y 403 (cuenta desactivada) implementados pero no ejercitados en vivo (sin gastar el rate limit ni desactivar cuentas).
- Error de carga con Reintentar y skeleton implementados en ambas pestañas; se probaron forzando fallo de red solo en diseño, no contra el backend.

## Seeds (marca seed-ecom)

- users id 9015 (seed-ecom-cliente@example.com): password fijada a `seed-ecom-2026` (bcrypt) para el flujo de login.
- Nuevo: seed-ecom-cuenta-vacia@example.com ("Cliente Seed Vacío", id_role 4, password `seed-ecom-2026`) — registro real y estados vacíos.
- Solo lectura: SOL-20261011-JG7ULD39LH, ARM-20261011-M2ECDVKFM6, WEB-261011-FAD02F, pedido CG-MV3JSBL2-37E95FB7BE37F736 (seed-ecom); SOL-20261010-E5NSS6B4CJ cotizada (seed-adm).
