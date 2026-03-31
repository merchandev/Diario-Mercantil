#!/usr/bin/env bash

set -euo pipefail

echo "============================================"
echo "DIARIO MERCANTIL - Health Check"
echo "============================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

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

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_secure_password_2025}"
DB_DATABASE="${DB_DATABASE:-diario_mercantil}"

tests_passed=0
tests_failed=0

pass() {
    echo -e "${GREEN}PASSED${NC}"
    tests_passed=$((tests_passed + 1))
}

fail() {
    echo -e "${RED}FAILED${NC}"
    tests_failed=$((tests_failed + 1))
}

compose_exec() {
    COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" exec -T "$@"
}

echo -n "Test 0: Shared Traefik network exists... "
if docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    pass
else
    fail
fi

echo -n "Test 1: Database connection... "
if compose_exec backend php -r "require '/var/www/html/src/Database.php'; Database::pdo(); echo 'OK';" 2>/dev/null | grep -q "OK"; then
    pass
else
    fail
fi

echo -n "Test 2: Superadmin exists... "
if compose_exec db mysql -u root "-p${MYSQL_ROOT_PASSWORD}" "${DB_DATABASE}" -sN -e \
    "SELECT COUNT(*) FROM superadmins WHERE username='merchandev';" 2>/dev/null | grep -q '^1$'; then
    pass
else
    fail
fi

echo -n "Test 3: Superadmin password valid... "
if compose_exec backend php -r "require '/var/www/html/src/Database.php'; \$pdo = Database::pdo(); \$hash = \$pdo->query(\"SELECT password_hash FROM superadmins WHERE username='merchandev'\")->fetchColumn(); echo password_verify('G0ku*1896', \$hash) ? 'VALID' : 'INVALID';" 2>/dev/null | grep -q 'VALID'; then
    pass
else
    fail
fi

echo -n "Test 4: Users table populated... "
user_count="$(compose_exec db mysql -u root "-p${MYSQL_ROOT_PASSWORD}" "${DB_DATABASE}" -sN -e "SELECT COUNT(*) FROM users;" 2>/dev/null || echo 0)"
if [ "${user_count:-0}" -ge 2 ]; then
    pass
else
    fail
fi

echo -n "Test 5: Frontend accessible through Traefik... "
if curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/health >/dev/null 2>&1; then
    pass
else
    fail
fi

echo -n "Test 6: Backend API accessible through routed frontend... "
if curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/api/settings 2>/dev/null | grep -q '{'; then
    pass
else
    fail
fi

echo ""
echo "============================================"
echo "Results:"
echo -e "${GREEN}Passed: $tests_passed${NC}"
echo -e "${RED}Failed: $tests_failed${NC}"
echo "============================================"

if [ "$tests_failed" -eq 0 ]; then
    echo -e "${GREEN}All tests passed${NC}"
    exit 0
fi

echo -e "${RED}Some tests failed${NC}"
exit 1
