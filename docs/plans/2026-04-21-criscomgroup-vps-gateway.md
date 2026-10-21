# Criscom Group VPS Gateway Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** desplegar Criscom Group en la VPS actual usando el gateway Nginx compartido, sin colisionar con puertos ni afectar otros sitios.

**Architecture:** se reemplaza el uso de Traefik solo en esta VPS por un compose alterno que conecta los servicios web de Criscom a la red Docker externa `shared-gateway`. El TLS y el enrutamiento HTTP/HTTPS se resuelven en el gateway existente, mientras la base de datos queda aislada en una red interna.

**Tech Stack:** Docker Compose v2, Nginx gateway compartido, Certbot webroot, MySQL 8, Express, React/Vite, Next.js

---

### Task 1: Preparar archivos de despliegue

**Files:**
- Create: `docker-compose.vps.yml`
- Create: `deploy/nginx/criscomgroup.gateway.conf`
- Create: `.env`

**Step 1: Escribir el compose alterno**

Crear servicios `db`, `backend`, `frontend`, `ecommerce` con:
- `db` en red `internal`
- servicios web en `shared-gateway`
- aliases de red `criscomgroup-backend`, `criscomgroup-frontend`, `criscomgroup-ecommerce`
- límites de memoria razonables

**Step 2: Escribir el snippet Nginx**

Definir upstreams y server blocks para:
- `criscomgroup.com.pe`
- `www.criscomgroup.com.pe`
- `app.criscomgroup.com.pe`
- `api.criscomgroup.com.pe`

**Step 3: Crear `.env` productivo**

Poblar secretos reales, dominios públicos y feature flags.

**Step 4: Validar compose**

Run: `docker compose -f docker-compose.vps.yml config`
Expected: configuración expandida sin errores

### Task 2: Levantar los contenedores de Criscom

**Files:**
- Modify: ninguna ruta adicional del repo; se opera con `docker compose`

**Step 1: Build secuencial**

Run: `docker compose -f docker-compose.vps.yml build`
Expected: imágenes `backend`, `frontend`, `ecommerce` construidas sin error

**Step 2: Arranque**

Run: `docker compose -f docker-compose.vps.yml up -d`
Expected: contenedores `criscomgroup-*` arriba y `db` saludable

**Step 3: Verificar salud básica**

Run: `docker compose -f docker-compose.vps.yml ps`
Expected: `Up` en servicios y sin restart loop

### Task 3: Integrar Criscom al gateway compartido

**Files:**
- Modify outside repo: `/root/torolococayma/ToroLocoCayma/docker/nginx/fvautoimports.conf`

**Step 1: Emitir certificado SAN**

Run: certbot webroot con `-d criscomgroup.com.pe -d www.criscomgroup.com.pe -d app.criscomgroup.com.pe -d api.criscomgroup.com.pe`
Expected: certificado emitido en `live/criscomgroup.com.pe/`

**Step 2: Inyectar bloques Nginx**

Añadir upstreams y server blocks para Criscom al archivo incluido por el gateway.

**Step 3: Validar y recargar**

Run: `docker exec toroloco-gateway nginx -t`
Expected: `syntax is ok` y `test is successful`

Run: `docker exec toroloco-gateway nginx -s reload`
Expected: reload limpio

### Task 4: Verificación funcional

**Files:**
- Modify: ninguna

**Step 1: Verificar hostnames**

Run:
- `curl -I https://criscomgroup.com.pe`
- `curl -I https://www.criscomgroup.com.pe`
- `curl -I https://app.criscomgroup.com.pe`
- `curl -I https://api.criscomgroup.com.pe`

Expected:
- `criscomgroup.com.pe` responde `200`
- `www` redirige a apex
- `app` responde `200`
- `api` responde `200`

**Step 2: Verificar logs**

Run:
- `docker compose -f docker-compose.vps.yml logs --tail=100 backend frontend ecommerce db`
- `docker logs --tail=100 toroloco-gateway`

Expected: sin errores de DNS, SSL o conexión a DB
