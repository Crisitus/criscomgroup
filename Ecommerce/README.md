# Criscom Group — Ecommerce (Next.js 15)

Tienda pública de Criscom Group. Consume el API del Backend ERP (`/api/ecommerce/*`).

## Stack

- Next.js 15 (App Router, `output: 'standalone'` para Docker mínimo)
- React 18, TypeScript
- Tailwind CSS 4, styled-components
- Framer Motion, React Toastify

## Desarrollo local

```bash
cp .env.example .env.local   # Ajusta NEXT_PUBLIC_API_URL si hace falta
npm install --legacy-peer-deps
npm run dev
```

App en [http://localhost:3000](http://localhost:3000).

## Scripts

| Script               | Descripción                                   |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Dev server con hot reload                     |
| `npm run build`      | Build productivo (genera `.next/standalone`)  |
| `npm run start`      | Sirve el build productivo                     |
| `npm run lint`       | ESLint (next lint)                            |
| `npm run type-check` | Chequeo TypeScript (sin emitir)               |

## Variables de entorno

Ver `.env.example`. Las variables `NEXT_PUBLIC_*` se inyectan al bundle del cliente.

| Variable               | Propósito                                       |
| ---------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Base URL del Backend ERP (sin trailing slash)   |
| `NEXT_PUBLIC_SITE_URL` | URL pública canónica (OG / SEO / metadataBase)  |

## Producción (Docker)

El `Dockerfile` usa multi-stage (`deps` → `builder` → `runner`) y corre como usuario no-root. El `docker-compose.yml` de la raíz orquesta Backend + Frontend + Ecommerce + Traefik.

```bash
docker compose build ecommerce
docker compose up -d ecommerce
```

## Estructura

```
app/
├── (public)/        # Tienda pública (/, /catalogo, /producto/[id], ...)
├── admin/           # Panel admin del ecommerce
├── layout.tsx       # Root layout + metadata SEO
└── globals.css      # Tailwind + utilidades de marca
components/          # UI reutilizable
config/constants.ts  # URL del API (parametrizada vía env)
services/            # Cliente HTTP (axios) + servicios por recurso
```

## Notas

- El build está configurado con `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true` en `next.config.js` porque este paquete arrastra TypeScript legacy de un copy-paste anterior. Al tocar código nuevo, respetar los tipos.
- Las llamadas al Backend se hacen desde el **browser**, por eso todas las variables son `NEXT_PUBLIC_*`. Si algún día se añade server-side fetch, usar una variable separada `INTERNAL_API_URL=http://backend:3000` distinguiendo client vs server.
