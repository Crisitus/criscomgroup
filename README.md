# Criscom Group — Plataforma integral

Monorepo con el ERP interno, la tienda pública y el API backend de **Criscom Group** ([criscomgroup.com.pe](https://criscomgroup.com.pe)).

```
┌─────────────────────────────────────────────────────────────────┐
│                         criscomgroup.com.pe                      │
│                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐               │
│  │   Ecommerce        │    │   ERP Frontend     │               │
│  │ (Next.js 15)       │    │ (React 19 + Vite)  │               │
│  │ criscomgroup.com.pe│    │ app.criscomgroup…  │               │
│  └─────────┬──────────┘    └─────────┬──────────┘               │
│            │                         │                           │
│            └────────────┬────────────┘                           │
│                         ▼                                         │
│              ┌────────────────────┐                              │
│              │   Backend API      │                              │
│              │ (Express + Sequelize)                             │
│              │ api.criscomgroup…  │                              │
│              └─────────┬──────────┘                              │
│                        ▼                                          │
│                  ┌──────────┐                                    │
│                  │  MySQL 8 │                                    │
│                  └──────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Stack

| Paquete       | Tecnología                                           | Dominio                       |
| ------------- | ---------------------------------------------------- | ----------------------------- |
| `Backend/`    | Node 20 · Express · Sequelize · MySQL 8 · JWT        | `api.criscomgroup.com.pe`     |
| `Frontend/`   | React 19 · Vite · TypeScript · Tailwind · shadcn/ui  | `app.criscomgroup.com.pe`     |
| `Ecommerce/`  | Next.js 15 · React 18 · TypeScript · Tailwind        | `criscomgroup.com.pe`         |
| Infra         | Docker Compose · Traefik · Let's Encrypt (auto TLS)  | Todo                          |

## Estructura

```
.
├── Backend/                  # API REST (Express + MySQL)
│   ├── src/                  # Código fuente
│   ├── __tests__/            # Tests de integración (Jest + Supertest)
│   ├── Dockerfile            # Imagen productiva (multi-stage, non-root)
│   └── Dockerfile.dev        # Imagen de desarrollo
│
├── Frontend/                 # ERP — dashboard admin interno
│   ├── src/                  # Componentes, páginas, hooks, servicios
│   ├── Dockerfile            # Build Vite + nginx:alpine
│   ├── Dockerfile.dev        # Vite dev server con hot reload
│   └── nginx.conf            # Config de nginx productivo
│
├── Ecommerce/                # Tienda pública
│   ├── app/                  # Next.js App Router
│   ├── components/           # UI components
│   ├── Dockerfile            # Multi-stage Next.js standalone
│   └── next.config.js        # output: 'standalone'
│
├── docker-compose.yml        # PRODUCCIÓN (Traefik + Let's Encrypt)
├── docker-compose.dev.yml    # DESARROLLO (hot reload, puertos expuestos)
├── .env.example              # Plantilla de variables para producción
└── .github/workflows/ci.yml  # Lint + Build + Tests en cada PR
```

---

## 🚀 Desarrollo local

Pre-requisitos: **Docker Desktop** + **Git**.

```bash
# Clonar
git clone https://github.com/<tu-org>/criscomgroup.git
cd criscomgroup

# Levantar todo (db, backend, frontend, ecommerce con hot reload)
docker compose -f docker-compose.dev.yml up --build
```

Servicios disponibles:

| URL                       | Servicio                                  |
| ------------------------- | ----------------------------------------- |
| http://localhost:3100     | Backend API                               |
| http://localhost:5173     | ERP Frontend (dashboard)                  |
| http://localhost:3030     | Ecommerce (tienda pública)                |
| localhost:3306            | MySQL (credenciales en `Backend/.env`)    |
| localhost:3307            | MySQL de tests                            |

Para ejecutar tests:

```bash
# Backend (integración contra MySQL)
cd Backend && npm test

# Frontend (Vitest)
cd Frontend && npm test
```

---

## 🌍 Deploy a producción (VPS)

### 1. Pre-requisitos en el VPS

- Ubuntu 22.04 LTS o similar
- Docker Engine + Docker Compose v2
- Puertos 80 y 443 abiertos al público
- Un dominio apuntando al VPS

```bash
# Instalar Docker (si no está)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. DNS (Cloudflare u otro proveedor)

Crear registros **A** apuntando a la IP del VPS. **IMPORTANTE**: mientras Let's Encrypt genera los certificados, usa **DNS only** (proxy gris en Cloudflare). Tras verificar que todo funciona, puedes activar el proxy (naranja) si quieres el CDN de Cloudflare.

```
criscomgroup.com.pe         A     <IP_VPS>
www.criscomgroup.com.pe     A     <IP_VPS>
app.criscomgroup.com.pe     A     <IP_VPS>
api.criscomgroup.com.pe     A     <IP_VPS>
```

### 3. Clonar y configurar

```bash
# En el VPS
git clone https://github.com/<tu-org>/criscomgroup.git
cd criscomgroup

# Copiar la plantilla y llenar secretos reales
cp .env.example .env
nano .env
```

Generar secretos fuertes:

```bash
# JWT_SECRET
openssl rand -base64 48

# MYSQL_ROOT_PASSWORD y MYSQL_PASSWORD
openssl rand -base64 32
```

### 4. Build y levantar

```bash
docker compose build
docker compose up -d

# Ver logs (útil para verificar que Let's Encrypt emitió los certs)
docker compose logs -f traefik
```

Después de 30-60 segundos deberías ver algo como:

```
traefik  | Trying to challenge certificate for domain [criscomgroup.com.pe]
traefik  | Certificates obtained for domains [criscomgroup.com.pe]
```

### 5. Verificar

```bash
curl -I https://criscomgroup.com.pe       # → 200
curl -I https://app.criscomgroup.com.pe   # → 200
curl -I https://api.criscomgroup.com.pe   # → 200

# HTTP debe redirigir a HTTPS
curl -I http://criscomgroup.com.pe        # → 301 a https://
```

### 6. Updates posteriores

```bash
cd /path/to/criscomgroup
git pull
docker compose build
docker compose up -d
```

---

## 🔐 Seguridad

- ✅ Secretos en `.env` (gitignored), nunca hardcodeados
- ✅ MySQL aislado en red Docker interna (no expuesto al internet)
- ✅ TLS automático con Let's Encrypt
- ✅ HTTP → HTTPS redirect permanente (301)
- ✅ Headers de seguridad (X-Frame-Options, Referrer-Policy, etc.)
- ✅ Usuario non-root en containers Backend + Ecommerce
- ✅ CORS whitelist en backend (`FRONTEND_ORIGIN`)
- ✅ Healthchecks + `restart: always`

---

## 🧪 CI / CD

Cada push a `main` o `develop`, y cada PR, dispara `.github/workflows/ci.yml`:

| Job         | Qué corre                                                              |
| ----------- | ---------------------------------------------------------------------- |
| `backend`   | `npm ci` + tests de integración contra MySQL 8                         |
| `frontend`  | `npm ci` + `npm run lint` + `npm run build` + `npm test`               |
| `ecommerce` | `npm ci` + `npm run lint` + `npm run type-check` + `npm run build`     |

Los tres jobs deben pasar para poder mergear.

---

## 📚 Documentación adicional

- [`Backend/__tests__/README.md`](Backend/__tests__/README.md) — Tests de integración
- [`Ecommerce/README.md`](Ecommerce/README.md) — Detalle del Ecommerce Next.js
- [`MANUAL_OPERACION.md`](MANUAL_OPERACION.md) — Uso diario de tienda, ERP, ventas y facturación
- [`MANUAL_LANZAMIENTO.md`](MANUAL_LANZAMIENTO.md) — Lista de verificación y pase a producción
- [`docs/INTEGRACIONES_SUNAT_CULQI.md`](docs/INTEGRACIONES_SUNAT_CULQI.md) — Flujo seguro de pagos y comprobantes
- [`docs/ARQUITECTURA_GOOGLE_CLOUD.md`](docs/ARQUITECTURA_GOOGLE_CLOUD.md) — Diseño previsto para Google Cloud

## Licencia

Propietario — Criscom Group © 2026. Todos los derechos reservados.
