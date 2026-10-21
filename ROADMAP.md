# ROADMAP — Criscom Group (Ecommerce + ERP + Backend)

> Documento vivo. Objetivo: dejar el proyecto **prolijo, entendible por cualquiera y seguro**,
> multi-servicio en el VPS/nube, y con la web indexada al máximo en Google.
> Estado: 🔴 no existe · 🟡 existe parcial · ✅ ya existe

## Arquitectura actual (real)

| App | Ruta | Stack | Dominio prod |
|---|---|---|---|
| **Ecommerce** | `/Ecommerce` | Next.js + MUI + Redux | `criscomgroup.com.pe` |
| **ERP (Frontend)** | `/Frontend` | Vite + React + Radix/Tailwind + TanStack Query | `app.criscomgroup.com.pe` |
| **Backend** | `/Backend` | Express + Sequelize + MySQL + JWT | `api.criscomgroup.com.pe` |
| Infra | `docker-compose.yml` | Traefik + Let's Encrypt + MySQL aislada | VPS |

Módulos backend existentes: banner, social_links, categorias, productos, ventas, pedidos,
importación, adquisición de usados, libro de reclamaciones, cierre de caja, facturación SUNAT
(documento_electronico), roles, audit_log, RENIEC/RUC.

---

## FASE 0 — Preparación (base para todo)
- [ ] Copiar proyecto a working dir estable (fuera de `Downloads`) y trabajar por ramas Git.
- [ ] `.gitignore` correcto: nunca commitear `.env`, `.env.local`, uploads, `node_modules`.
- [ ] Documentar arranque en un `README` raíz (dev y prod) para que cualquiera lo levante.

## FASE 1 — Quick wins en repo (sin bloqueos externos)
- [ ] **#1 Menú "Ajustes del sitio"** en ERP: horario entrada/salida (🔴 nuevo), banner (✅), redes (✅). Unificar en una sola pantalla. Pendiente: centralizar `SALES_WHATSAPP` (hoy TODO en `Ecommerce/app/(public)/page.tsx`).
- [~] **#2 Sección "taza"** (Ecommerce): ✅ limpiados restos del template (banners fallback "regalería" → tech, icono `FaCar`→`FaMicrochip`). Pendiente: generar imagen de computadoras real y revisar textos de otras páginas.
- [~] **#7 Home**: ✅ agregada sección "¿Qué necesitas hoy?" con 4 botones **funcionales** (Comprar→/catalogo, Armado→WhatsApp, Servicio técnico→/servicios, Importación→/solicitud-importacion) + CTA "Ver todos los servicios". Typecheck OK. Pendiente: hacer clickeables las tarjetas de la página `/servicios` (hoy no enlazan).
- [ ] **#5 Superusuario "contador"**: extender roles existentes. Rol `contador` con permisos acotados, gestionado por el admin maestro (Crisitus).

## FASE 2 — Módulos nuevos (algunos con bloqueo externo)
- [ ] **#3 Entrada de equipos + Órdenes de Servicio Técnico** (🔴): modelo, estados (recibido→diagnóstico→reparación→listo→entregado), ticket, historial. **[Aclarar]** qué es "el perfil de Facebook que tiene el sistema" — no hay integración FB en el código.
- [ ] **#8 Correo empresarial** (🔴) **[BLOQUEO: Google Workspace]**: menú ERP para agregar/eliminar/gestionar correos `@criscomgroup.com.pe`; cada correo obtiene acceso web + rol asignable desde admin. Cambiar correo de contacto del sitio al empresarial (crear `cristophercalioro@criscomgroup.com.pe`). Requiere Admin SDK + service account con domain-wide delegation.
- [ ] **#6 Bot de WhatsApp** (🔴) **[Aclarar alcance]**: ¿pedidos/atención/cotizaciones? OpenClaw ya opera WhatsApp — evaluar reuso.

## FASE 3 — Calidad y seguridad
- [ ] **#4 + #9 Depurar y auditar** front, backend y **seguridad** (authz por rol, JWT, subida de archivos, CORS, inyección, secretos). Refactor **conservando funciones y estética**.
- [ ] **#11 QA visual**: recorrer la web, listar errores visuales → **informe en documento**.

## FASE 4 — Lanzamiento y SEO
- [ ] **#10 SEO máximo** (Ecommerce): metadata, Open Graph, `sitemap.xml`, `robots.txt`, **JSON-LD LocalBusiness/Store**, contenido long-tail ("dónde comprar computadora en Arequipa", "dónde reparar mi PC", "armar CPU para Dota", usuarios empresariales/estado, etc.), Google Search Console.
- [ ] **#12 Deploy**: subir a **Google Cloud**, configurar dominio **.PE**, verificar indexación. **[Decisión: GCP VM reusando Traefik vs GCP nativo Cloud Run]**.

---

## Bloqueos / decisiones pendientes de Crisitus
1. **Modo de trabajo/Git**: ¿copio a working dir + ramas, o trabajo sobre Downloads?
2. **Target de deploy**: GCP VM (reusar docker-compose+Traefik) vs Cloud Run nativo vs seguir en VPS actual.
3. **Google Workspace**: ¿dominio `criscomgroup.com.pe` verificado + acceso admin + querer creación programática de buzones?
4. **Facebook (#3)**: ¿qué integración existe hoy exactamente?
5. **WhatsApp bot (#6)**: alcance y si se reusa OpenClaw.
