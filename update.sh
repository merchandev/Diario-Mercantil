#!/bin/bash

# Script de Actualización Forzada para Hostinger VPS
# Uso: ./update.sh

echo "🚀 Iniciando actualización del proyecto..."

# 1. Asegurar que estamos en el directorio correcto (ajusta si es necesario)
# Usualmente es la carpeta donde está el docker-compose.yml
# cd /home/usuario/proyecto o donde esté clonado
# Asumimos que se ejecuta desde la raíz del proyecto

# 2. Descargar últimos cambios de GitHub
echo "⬇️  Haciendo Git Pull..."
git pull origin main

# 3. Reconstruir imágenes (Forzando no-cache para asegurar cambios)
echo "🏗️  Reconstruyendo contenedores (esto puede tardar unos minutos)..."
docker compose build --no-cache

# 4. Reiniciar servicios
echo "🔄 Reiniciando servicios..."
docker compose down
docker compose up -d

# 5. Limpieza (Opcional, para ahorrar espacio)
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo "✅ Actualización completada!"
echo "   Frontend: http://localhost:80"
echo "   Backend:  http://localhost:3000"
echo "   phpMyAdmin: http://localhost:8081"
