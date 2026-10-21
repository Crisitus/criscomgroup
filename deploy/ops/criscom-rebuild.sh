#!/usr/bin/env bash
set -Eeuo pipefail

RECOVERY_DIR=/root/criscom-recovery
BUNDLE="$RECOVERY_DIR/last-known-good.tar.gz"
CHECKSUM="$RECOVERY_DIR/last-known-good.sha256"
TARGET="/root/criscom-releases/recovered-$(date +%Y%m%d-%H%M%S)"

log() { printf '%s %s\n' "$(date --iso-8601=seconds)" "$*"; }

[[ -s "$BUNDLE" && -s "$CHECKSUM" ]] || {
  log 'No existe un paquete de recuperación confiable'; exit 1;
}

cd "$RECOVERY_DIR"
sha256sum --check "$(basename "$CHECKSUM")"

mkdir -p "$TARGET"
tar -xzf "$BUNDLE" -C "$TARGET"
chmod 600 "$TARGET/.env"

log "Reconstruyendo imágenes desde $TARGET"
docker compose -p criscom --env-file "$TARGET/.env" -f "$TARGET/docker-compose.vps.yml" build backend frontend ecommerce
docker compose -p criscom --env-file "$TARGET/.env" -f "$TARGET/docker-compose.vps.yml" up -d db backend frontend ecommerce
docker compose -p criscom-rescue -f "$TARGET/deploy/docker-compose.rescue.yml" up -d

ln -sfn "$TARGET" /root/criscom-current
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:8181/healthz >/dev/null
log "Reconstrucción completada en $TARGET"
