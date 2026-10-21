# ---------------------------------------------------------------------------
# Criscom Group — Backend ERP (Express + Sequelize + MySQL)
# Dockerfile productivo, multi-stage, non-root.
#
# Stage 1 (deps-builder): instala TODAS las deps + toolchain para compilar
#   módulos nativos (bwip-js, bcryptjs algunas veces). Se descarta en el
#   resultado final: solo nos quedamos con node_modules resueltos.
# Stage 2 (runner): imagen mínima alpine + node_modules de producción + src/.
# ---------------------------------------------------------------------------

# --- Stage 1: instalación de dependencias ---
FROM node:20-alpine AS deps
WORKDIR /app

# Toolchain para módulos nativos. Se queda en este stage, no contamina el final.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# npm ci es determinista, respeta package-lock.json. --omit=dev reduce tamaño.
RUN npm ci --omit=dev --no-audit --no-fund


# --- Stage 2: runtime mínimo ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Instala solo runtime deps (tini para manejar señales, wget para healthcheck).
# tini reap zombies, maneja SIGTERM correctamente — crucial en Kubernetes/Docker.
RUN apk add --no-cache tini wget \
 && addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nodejs -G nodejs

# Copia node_modules ya resueltos y el código fuente.
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs src ./src

# Directorio de uploads: debe ser volume persistente en producción.
RUN mkdir -p /app/src/uploads && chown -R nodejs:nodejs /app/src/uploads

USER nodejs
EXPOSE 3000

# Healthcheck contra el endpoint raíz del API (ajusta si tienes /health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
