#!/usr/bin/env bash

set -euo pipefail

echo "========================================"
echo "Docker / Domain accessibility check"
echo "========================================"
echo ""

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

echo "1. Compose services"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" ps || true
echo ""

echo "2. Shared Traefik network"
docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1 && echo "  $TRAEFIK_NETWORK exists" || echo "  $TRAEFIK_NETWORK does not exist"
echo ""

echo "3. Published ports in this project"
echo "phpMyAdmin :80 -> $(COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" port phpmyadmin 80 2>/dev/null || echo 'not published')"
echo "frontend     -> no host ports expected"
echo ""

echo "4. Local HTTP check through Hostinger Traefik"
local_http="$(curl -I -s -H "Host: ${DOMAIN}" http://127.0.0.1/health | head -n1 || true)"
if [ -n "$local_http" ]; then
    echo "  $local_http"
else
    echo "  No response from routed http://127.0.0.1/health"
fi
echo ""

echo "5. API check through routed frontend"
api_status="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" http://127.0.0.1/api/settings || true)"
if [ -n "$api_status" ]; then
    echo "  HTTP $api_status on routed /api/settings"
else
    echo "  API did not answer through Traefik"
fi
echo ""

echo "6. Listening ports on host"
if command -v ss >/dev/null 2>&1; then
    ss -tuln | grep -E ':80 |:443 |:8080 ' || echo "  No listeners detected on 80/443/8080"
else
    echo "  ss is not installed"
fi
echo ""

echo "7. Public DNS check"
nslookup "$DOMAIN" 1.1.1.1 || true
nslookup "www.${DOMAIN#www.}" 1.1.1.1 || true
echo ""

echo "Summary"
echo "  If routed localhost works but public DNS fails, fix the DNS zone or DNSSEC at the domain provider."
echo "  If routed localhost fails, inspect Traefik labels, the external network, and frontend logs."
echo "  This project must not publish 80/443 directly on Hostinger Docker Manager."
