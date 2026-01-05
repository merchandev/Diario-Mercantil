#!/bin/bash

echo "========================================"
echo "  Verificación de Accesibilidad Docker"
echo "========================================"
echo ""

# 1. Verificar contenedores
echo "1. ✓ Verificando contenedores..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep dashboard
echo ""

# 2. Verificar puertos expuestos
echo "2. ✓ Verificando puertos expuestos..."
echo "Frontend:"
docker port dashboard-frontend 2>/dev/null || echo "  Contenedor no encontrado"
echo ""

# 3. Probar acceso local
echo "3. ✓ Probando acceso local (curl localhost:80)..."
RESPONSE=$(docker exec dashboard-frontend curl -I -s http://localhost 2>/dev/null | head -n1)
if [ -z "$RESPONSE" ]; then
    echo "  ❌ No responde"
else
    echo "  ✓ $RESPONSE"
fi
echo ""

# 4. Verificar conexión al backend
echo "4. ✓ Probando conexión frontend → backend..."
BACKEND_RESPONSE=$(docker exec dashboard-frontend curl -I -s http://backend:9000 2>/dev/null | head -n1)
if [ -z "$BACKEND_RESPONSE" ]; then
    echo "  ❌ Backend no responde"
else
    echo "  ✓ $BACKEND_RESPONSE"
fi
echo ""

# 5. Verificar firewall (si ufw está instalado)
echo "5. ✓ Verificando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw status | grep -E "80|Status"
else
    echo "  ufw no instalado, verificar en panel de Hostinger"
fi
echo ""

# 6. Verificar nginx escuchando
echo "6. ✓ Verificando que nginx escucha en 0.0.0.0:80..."
if docker exec dashboard-frontend command -v netstat &> /dev/null; then
    docker exec dashboard-frontend netstat -tuln 2>/dev/null | grep :80
else
    echo "  netstat no disponible, pero nginx debería escuchar por defecto"
fi
echo ""

# 7. Resumen
echo "========================================"
echo "  RESUMEN"
echo "========================================"
echo ""
echo "Si todo lo anterior muestra ✓:"
echo "  → La aplicación está configurada correctamente"
echo "  → El problema puede ser:"
echo "    1. Firewall del VPS (configurar en Hostinger)"
echo "    2. DNS no configurado o no propagado"
echo "    3. Acceso por URL incorrecta"
echo ""
echo "Intenta acceder:"
echo "  - http://72.61.77.167 (IP directa)"
echo "  - http://merchan.cloud (si DNS está configurado)"
echo ""
echo "========================================"
