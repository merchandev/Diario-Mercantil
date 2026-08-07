#!/bin/bash
set -euo pipefail

echo "==> Verificando despliegue de Diario Mercantil..."

if ! docker-compose ps | grep "Up" > /dev/null; then
  echo "ERROR: Los contenedores no parecen estar corriendo."
  exit 1
fi

echo "==> Verificando healthcheck del Backend..."
docker-compose exec -T backend php /var/www/html/bin/readiness.php

echo "==> Verificando sintaxis PHP..."
docker-compose exec -T backend find /var/www/html -name "*.php" -print0 | xargs -0 -n1 -P4 php -l | grep -v "No syntax errors detected" || echo "Sintaxis PHP correcta."

echo "==> Validando permisos del storage..."
docker-compose exec -T backend ls -ld /var/www/html/storage/uploads
docker-compose exec -T backend touch /var/www/html/storage/uploads/test.tmp
docker-compose exec -T backend rm /var/www/html/storage/uploads/test.tmp

echo "==> Todo parece estar en orden. El despliegue de la reparación documental se completó con éxito."
exit 0
