#!/usr/bin/env bash

set -euo pipefail

echo "========================================"
echo "Docker / Domain accessibility check"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-diario-mercantil}"
DOMAIN="${DOMAIN:-diariomercantil.com}"

if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    echo "Docker Compose is not installed."
    exit 1
fi

cd "$PROJECT_DIR"

echo "1. Compose services"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" ps || true
echo ""

echo "2. Published ports"
echo "nginx-proxy :80  -> $(COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" port nginx-proxy 80 2>/dev/null || echo 'not published')"
echo "nginx-proxy :443 -> $(COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" port nginx-proxy 443 2>/dev/null || echo 'not published')"
echo "phpMyAdmin :80   -> $(COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" port phpmyadmin 80 2>/dev/null || echo 'not published')"
echo ""

echo "3. Local HTTP check through nginx-proxy"
local_http="$(curl -I -s http://localhost/health | head -n1 || true)"
if [ -n "$local_http" ]; then
    echo "  $local_http"
else
    echo "  No response from http://localhost/health"
fi
echo ""

echo "4. API check through frontend gateway"
api_status="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/settings || true)"
if [ -n "$api_status" ]; then
    echo "  HTTP $api_status on http://localhost/api/settings"
else
    echo "  API did not answer on localhost"
fi
echo ""

echo "5. Listening ports on host"
if command -v ss >/dev/null 2>&1; then
    ss -tuln | grep -E ':80 |:443 |:8080 ' || echo "  No listeners detected on 80/443/8080"
else
    echo "  ss is not installed"
fi
echo ""

echo "6. Public DNS check"
nslookup "$DOMAIN" 1.1.1.1 || true
nslookup "www.${DOMAIN#www.}" 1.1.1.1 || true
echo ""

echo "Summary"
echo "  If localhost works but DNS fails, fix the DNS zone or DNSSEC at the domain provider."
echo "  If DNS works but localhost fails, inspect docker logs and free ports 80/443."
echo "  If both fail, remove old orphans and recreate the stack:"
echo "    COMPOSE_PROJECT_NAME=$PROJECT_NAME ${COMPOSE[*]} down --remove-orphans"
echo "    COMPOSE_PROJECT_NAME=$PROJECT_NAME ${COMPOSE[*]} up -d --build --remove-orphans"
