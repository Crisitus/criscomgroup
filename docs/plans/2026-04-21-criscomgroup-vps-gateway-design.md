# Criscom Group VPS Gateway Design

**Objetivo:** desplegar `criscomgroup.com.pe`, `www.criscomgroup.com.pe`, `app.criscomgroup.com.pe` y `api.criscomgroup.com.pe` en la VPS actual sin interrumpir los sitios que ya usan `80/443`.

## Contexto

La VPS ya tiene un reverse proxy compartido (`toroloco-gateway`) escuchando en `80/443`, además de un contenedor `certbot` con certificados y renovación automática. El `docker-compose.yml` original de Criscom usa Traefik y también necesita `80/443`, por lo que no puede levantarse tal cual en esta máquina.

## Decisión

Se mantiene el gateway actual y se despliega Criscom detrás de la red Docker externa `shared-gateway`.

- `criscomgroup.com.pe` y `www.criscomgroup.com.pe` servirán el ecommerce Next.js.
- `app.criscomgroup.com.pe` servirá el ERP frontend.
- `api.criscomgroup.com.pe` servirá el backend Express.
- MySQL seguirá aislado en una red interna sin puertos publicados al host.

## Cambios técnicos

1. Crear un compose específico para esta VPS, sin Traefik.
2. Conectar `backend`, `frontend` y `ecommerce` a `shared-gateway` con aliases estables.
3. Mantener `db` solo en la red `internal`.
4. Generar un certificado SAN para los 4 hostnames con el `certbot` existente.
5. Añadir bloques Nginx para Criscom en el gateway compartido.

## Restricciones

- No tocar ni reemplazar el proxy actual del servidor.
- No publicar puertos adicionales para Criscom.
- Mantener uso de memoria contenido; la VPS tiene `3.7 GiB` RAM y `4 GiB` swap ya configurados.
- El backend debe mantenerse en `https://api.criscomgroup.com.pe` porque frontend y ecommerce ya están cableados a ese host.

## Validación

- `docker compose -f docker-compose.vps.yml config`
- `docker compose -f docker-compose.vps.yml up -d --build`
- `docker exec toroloco-gateway nginx -t`
- `curl -I` o `wget -S -O-` para los cuatro hostnames
- verificación de logs de `backend`, `frontend`, `ecommerce` y `toroloco-gateway`
