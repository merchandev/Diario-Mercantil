#!/usr/bin/env bash
# ============================================================
# Deploy script: Actualizar contenedor y configuración de Docker
# Uso: ./deploy-flipbook.sh <RUTA_PROYECTO_EN_VPS>
# Ejemplo: ./deploy-flipbook.sh /docker/diario-mercantil
# ============================================================

SERVER="root@72.61.77.167"
REMOTE_PATH="${1:-/docker/diario-mercantil}"

echo "📤 Subiendo archivos de React al servidor..."
scp "frontend/src/components/FlipbookViewer.tsx" "$SERVER:$REMOTE_PATH/frontend/src/components/FlipbookViewer.tsx"
scp "frontend/src/components/MagazineViewer.tsx" "$SERVER:$REMOTE_PATH/frontend/src/components/MagazineViewer.tsx"
scp "frontend/src/pages/EditionPublic.tsx"       "$SERVER:$REMOTE_PATH/frontend/src/pages/EditionPublic.tsx"
scp "frontend/src/pages/VisorEspressivoPDF.tsx"  "$SERVER:$REMOTE_PATH/frontend/src/pages/VisorEspressivoPDF.tsx"

echo "📤 Subiendo Docker Compose..."
scp "docker-compose.yml" "$SERVER:$REMOTE_PATH/docker-compose.yml"

echo ""
echo "🐳 Reconstruyendo contenedores y reiniciando stack..."
ssh "$SERVER" "cd $REMOTE_PATH && docker compose build frontend && docker compose up -d"

echo ""
echo "✅ Despliegue listo."
echo "🌍 El certificado SSL debería generarse en 1 o 2 minutos si el dominio apunta a esta IP."
echo "▶ Verifica en: https://diariomercantil.com/"
