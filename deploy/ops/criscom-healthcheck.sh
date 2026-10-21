#!/usr/bin/env bash
set -Eeuo pipefail

exec 9>/run/criscom-healthcheck.lock
flock -n 9 || exit 0

CURRENT=/root/criscom-current
APP_COMPOSE="$CURRENT/docker-compose.vps.yml"
ENV_FILE="$CURRENT/.env"
RESCUE_COMPOSE="$CURRENT/deploy/docker-compose.rescue.yml"
FAILURE_STATE=/run/criscom-healthcheck.failures

log() { printf '%s %s\n' "$(date --iso-8601=seconds)" "$*"; }

on_failure() {
  local failures=0
  [[ -f "$FAILURE_STATE" ]] && read -r failures < "$FAILURE_STATE"
  failures=$((failures + 1))
  printf '%s\n' "$failures" > "$FAILURE_STATE"
  log "Fallo de recuperación normal ($failures/3)"
  if (( failures >= 3 )) && [[ -x /usr/local/sbin/criscom-rebuild ]]; then
    log 'Iniciando reconstrucción desde la última versión buena verificada'
    /usr/local/sbin/criscom-rebuild
    printf '0\n' > "$FAILURE_STATE"
  fi
}
trap on_failure ERR

container_healthy() {
  local name="$1" state health
  state="$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || true)"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || true)"
  [[ "$state" == true && "$health" != unhealthy ]]
}

repair_core() {
  log 'Reparando núcleo privado DB/API/ERP'
  docker compose -p criscom --env-file "$ENV_FILE" -f "$APP_COMPOSE" up -d db backend frontend
}

repair_rescue() {
  log 'Reparando gateway privado ERP'
  docker compose -p criscom-rescue -f "$RESCUE_COMPOSE" up -d
}

for core in criscomgroup-db criscomgroup-backend criscomgroup-frontend; do
  if ! container_healthy "$core"; then repair_core; break; fi
done

if ! container_healthy criscomgroup-erp-rescue; then repair_rescue; fi

curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8181/healthz >/dev/null || {
  repair_rescue
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8181/healthz >/dev/null
}

# El plano público se repara aparte: su caída nunca detiene ni reinicia el ERP.
if ! container_healthy criscomgroup-ecommerce; then
  log 'Reparando Ecommerce sin tocar el núcleo ERP'
  docker compose -p criscom --env-file "$ENV_FILE" -f "$APP_COMPOSE" up -d ecommerce
fi

log 'Núcleo CRISCOM y acceso ERP privado saludables'
printf '0\n' > "$FAILURE_STATE"
