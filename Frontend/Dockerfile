# ---------------------------------------------------------------------------
# Criscom Group — ERP Frontend (React 19 + Vite + TS)
# Dockerfile productivo, multi-stage, servido con nginx:alpine.
#
# Stage 1 (builder): node 20 → npm ci → vite build → /app/dist
# Stage 2 (runner): nginx:alpine que sirve /usr/share/nginx/html con SPA
#   fallback y cache agresivo de assets hashed.
# ---------------------------------------------------------------------------

# --- Stage 1: build del bundle Vite ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Las variables VITE_* se inlinean en el bundle DURANTE el build.
# Se pasan como build-args desde docker-compose (ARG + ENV).
ARG VITE_API_URL
ARG VITE_FACTURADOR_API_URL
ARG VITE_FEATURE_ECOMMERCE=false
ARG VITE_FEATURE_MARKETING=false
ARG VITE_FEATURE_LIBRO_RECLAMACIONES=false
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FACTURADOR_API_URL=$VITE_FACTURADOR_API_URL \
    VITE_FEATURE_ECOMMERCE=$VITE_FEATURE_ECOMMERCE \
    VITE_FEATURE_MARKETING=$VITE_FEATURE_MARKETING \
    VITE_FEATURE_LIBRO_RECLAMACIONES=$VITE_FEATURE_LIBRO_RECLAMACIONES

RUN npm run build


# --- Stage 2: servidor estático con nginx ---
FROM nginx:1.27-alpine AS runner

# Limpia default config e instala la nuestra.
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Nginx ya corre como root solo para bindear el puerto 80 y luego hace fork
# a usuario 'nginx'. Es el modelo estándar. No hay valor en forzar non-root
# aquí a menos que quites el puerto 80 privilegiado (lo hace Traefik afuera).

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
