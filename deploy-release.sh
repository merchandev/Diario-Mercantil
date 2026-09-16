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
echo "Release ${GIT_SHA} started. Verify the public API and frontend build-info.json."
