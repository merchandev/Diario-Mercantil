#!/usr/bin/env bash
# Automated deployment script for Ubuntu/Hostinger.
# Current production topology:
# Hostinger Traefik -> frontend nginx -> backend php-fpm.

set -euo pipefail

echo "==================================="
echo "Diario Mercantil - Deployment Script"
echo "==================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}[OK] $1${NC}"; }
print_error() { echo -e "${RED}[ERR] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[WARN] $1${NC}"; }
print_info() { echo -e "$1"; }

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    print_error "Run this script as root or with sudo."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-diario-mercantil}"
DOMAIN="${APP_HOST:-${DOMAIN:-diariomercantil.com}}"
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-proxy}"

if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed."
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installed."
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    print_error "Docker Compose is not installed."
    print_info "Installing standalone docker-compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    COMPOSE=(docker-compose)
    print_success "Docker Compose installed."
fi

print_info "\nStep 1: Preparing application"

if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
print_success "Using project directory: $PROJECT_DIR"

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
    DOMAIN="${APP_HOST:-${DOMAIN}}"
    TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-proxy}"
    print_success ".env loaded."
else
    print_warning ".env was not found. Compose defaults or exported env vars will be used."
fi

if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    print_error "The external Traefik network '$TRAEFIK_NETWORK' does not exist."
    print_info "Deploy the Hostinger Traefik template first, or create the shared network before running this stack."
    exit 1
fi
print_success "Traefik network '$TRAEFIK_NETWORK' is available."

mkdir -p backend/storage/uploads backend/storage/results backend/storage/database backend/storage/cache
chmod -R 775 backend/storage
print_success "Storage directories prepared."

print_info "\nStep 2: Validating Compose configuration"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" config >/dev/null
print_success "Compose file is valid."

print_info "\nStep 3: Stopping previous stack"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" down --remove-orphans || true
print_success "Previous stack stopped."

print_info "\nStep 4: Building images"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" build --no-cache
print_success "Images built successfully."

print_info "\nStep 5: Starting services"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" up -d --remove-orphans

print_info "\nStep 6: Waiting for services"
sleep 10

for service in backend frontend db phpmyadmin; do
    if COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" ps --status running --services | grep -qx "$service"; then
        print_success "$service is running."
    else
        print_error "$service failed to start."
        COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" logs "$service" || true
        exit 1
    fi
done

print_info "\nStep 7: Waiting for database readiness"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root_secure_password_2025}"
max_wait=90
waited=0
until COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" exec -T db \
    mysqladmin ping -h localhost -u root "-p${MYSQL_ROOT_PASSWORD}" --silent >/dev/null 2>&1; do
    if [ "$waited" -ge "$max_wait" ]; then
        print_error "Database did not become ready in time."
        COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" logs db || true
        exit 1
    fi
    printf "."
    sleep 3
    waited=$((waited + 3))
done
printf "\n"
print_success "Database is ready."

print_info "\nStep 8: Verifying HTTP endpoints via Traefik host routing"
if curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/health >/dev/null; then
    print_success "Frontend health endpoint is responding through Hostinger Traefik."
else
    print_error "Frontend health endpoint is not responding through Traefik for host ${DOMAIN}."
    COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" logs frontend || true
    exit 1
fi

if curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/api/settings >/dev/null; then
    print_success "Backend API is responding through the frontend gateway."
else
    print_warning "Backend API check failed on http://127.0.0.1/api/settings for host ${DOMAIN}."
fi

print_info "\nStep 9: Current stack"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" ps

print_info "\nStep 10: Recent logs"
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "${COMPOSE[@]}" logs --tail=20

print_info "\n${GREEN}===================================${NC}"
print_info "${GREEN}Deployment complete${NC}"
print_info "${GREEN}===================================${NC}"
print_info ""
print_info "Access:"
print_info "  Site: https://${DOMAIN}"
print_info "  Local routed health: curl -H 'Host: ${DOMAIN}' http://127.0.0.1/health"
print_info "  API: https://${DOMAIN}/api/settings"
print_info "  phpMyAdmin: http://<VPS_IP>:8080"
print_info ""
print_info "If the site still does not open after deployment:"
print_info "  1. Confirm DNS for ${DOMAIN} points to the VPS."
print_info "  2. Confirm the Hostinger Traefik project is healthy."
print_info "  3. Re-run: COMPOSE_PROJECT_NAME=${PROJECT_NAME} ${COMPOSE[*]} down --remove-orphans"
print_info "  4. Re-run: COMPOSE_PROJECT_NAME=${PROJECT_NAME} ${COMPOSE[*]} up -d --build --remove-orphans"
