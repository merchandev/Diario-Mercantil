#!/usr/bin/env bash
# Deploy a tested checkout without stopping the database or removing volumes.
set -euo pipefail
cd "$(dirname "$0")"
git diff --quiet && git diff --cached --quiet || { echo 'Tracked files must match the release commit.' >&2; exit 1; }
export GIT_SHA="$(git rev-parse HEAD)"
export BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose config --quiet
echo "Building release ${GIT_SHA}"
docker compose build backend worker frontend
for service in backend worker frontend; do
  # Tag the newly built image, not the old container's image.
  project="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"
  docker image tag "${project}-${service}" "${project}-${service}:git-${GIT_SHA}"
done
docker compose up -d --no-deps --wait --wait-timeout 180 backend worker frontend
docker compose exec -T backend php -r '
  $v=json_decode(file_get_contents("build-info.json"),true);
  if (($v["git_sha"] ?? "") !== $argv[1]) exit(1);
  echo json_encode($v),PHP_EOL;
' "$GIT_SHA"

echo "Running smoke tests..."
sleep 2

HTTP_VER=$(docker compose exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/version || echo "000")
if [ "$HTTP_VER" != "200" ]; then echo "Smoke test falló: /api/version devolvió $HTTP_VER"; exit 1; fi

HTTP_ME=$(docker compose exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/auth/me || echo "000")
if [ "$HTTP_ME" != "401" ]; then echo "Smoke test falló: /api/auth/me devolvió $HTTP_ME (se esperaba 401 sin sesión)"; exit 1; fi

HTTP_LOGIN=$(docker compose exec -T frontend curl -s -X POST -H "Content-Type: application/json" -d '{"document":"fake","password":"fake"}' -o /dev/null -w "%{http_code}" http://127.0.0.1/api/auth/login || echo "000")
if [ "$HTTP_LOGIN" != "401" ]; then echo "Smoke test falló: /api/auth/login inválido devolvió $HTTP_LOGIN (se esperaba 401)"; exit 1; fi

HTTP_FORGOT=$(docker compose exec -T frontend curl -s -X POST -H "Content-Type: application/json" -d '{"email":"fake@fake.com"}' -o /dev/null -w "%{http_code}" http://127.0.0.1/api/auth/forgot-password || echo "000")
if [ "$HTTP_FORGOT" != "200" ]; then echo "Smoke test falló: forgot-password devolvió $HTTP_FORGOT (se esperaba 200 neutro)"; exit 1; fi

echo "Todos los smoke tests HTTP pasaron exitosamente."
echo "Release ${GIT_SHA} started. Verify the public API and frontend build-info.json."
