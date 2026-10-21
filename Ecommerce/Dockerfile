# ---------------------------------------------------------------------------
# Dockerfile para Ecommerce (Next.js 15) — ecommerce-integration hot-patch
#
# Reemplaza el Dockerfile anterior que era un copy-paste de un proyecto Vite
# (copiaba /app/dist que Next.js no genera).
#
# Usa output: 'standalone' de Next.js (configurado en next.config.js).
# Multi-stage:
#   1) deps: instala dependencias (aprovecha cache de npm)
#   2) builder: compila la app (.next/standalone + .next/static)
#   3) runner: imagen mínima con node + artefacto standalone
# ---------------------------------------------------------------------------

# Stage 1: dependencias
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Stage 2: build
FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: runtime minimal
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario no-root
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Artefactos del build standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
