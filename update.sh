#!/usr/bin/env bash

set -euo pipefail

echo "Updating Diario Mercantil..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-diario-mercantil}"
DOMAIN="${APP_HOST:-${DOMAIN:-diariomercantil.com}}"
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-proxy}"

if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    echo "Docker Compose is not installed."
    exit 1
fi

cd "$PROJECT_DIR"

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
    DOMAIN="${APP_HOST:-${DOMAIN}}"
    TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-proxy}"
fi

if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    echo "The external Traefik network '$TRAEFIK_NETWORK' does not exist."
    exit 1
fi

echo "Pulling latest changes..."
git pull --ff-only origin main

echo "Validating compose file..."
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" config >/dev/null

echo "Recreating stack with current topology..."
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" down --remove-orphans || true
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" up -d --build --remove-orphans

echo "Cleaning unused images..."
docker image prune -f

echo "Update complete."
echo "  Site: https://${DOMAIN}"
echo "  Local routed health: curl -H 'Host: ${DOMAIN}' http://127.0.0.1/health"
echo "  API: https://${DOMAIN}/api/settings"
echo "  phpMyAdmin: http://<VPS_IP>:8080"
