#!/usr/bin/env bash
# Deploy selected frontend files and recreate the production stack.
# Usage: ./deploy-flipbook.sh <REMOTE_PATH>

set -euo pipefail

SERVER="${SERVER:-root@72.61.77.167}"
REMOTE_PATH="${1:-/docker/diario-mercantil}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-diario-mercantil}"

echo "Uploading React files..."
scp "frontend/src/components/FlipbookViewer.tsx" "$SERVER:$REMOTE_PATH/frontend/src/components/FlipbookViewer.tsx"
scp "frontend/src/components/MagazineViewer.tsx" "$SERVER:$REMOTE_PATH/frontend/src/components/MagazineViewer.tsx"
scp "frontend/src/pages/EditionPublic.tsx" "$SERVER:$REMOTE_PATH/frontend/src/pages/EditionPublic.tsx"
scp "frontend/src/pages/VisorEspressivoPDF.tsx" "$SERVER:$REMOTE_PATH/frontend/src/pages/VisorEspressivoPDF.tsx"

echo "Uploading docker-compose.yml..."
scp "docker-compose.yml" "$SERVER:$REMOTE_PATH/docker-compose.yml"

echo ""
echo "Recreating production stack..."
ssh "$SERVER" "set -e; cd '$REMOTE_PATH'; COMPOSE_PROJECT_NAME='$PROJECT_NAME' docker compose down --remove-orphans || true; COMPOSE_PROJECT_NAME='$PROJECT_NAME' docker compose up -d --build --remove-orphans"

echo ""
echo "Deploy finished."
echo "Verify:"
echo "  https://diariomercantil.com/"
echo "  http://localhost/health on the VPS"
