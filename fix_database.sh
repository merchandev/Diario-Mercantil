#!/bin/bash
# Script para corregir la base de datos en el servidor

echo "================================================"
echo "🔧 Corrección de Base de Datos"
echo "================================================"

# 1. Verificar estado actual
echo ""
echo "1️⃣ Verificando usuarios actuales..."
docker exec -i diario-mercantil-db-1 mysql -u root -proot_password diario_mercantil << 'EOF'
SELECT id, document, name, role FROM users ORDER BY id;
EOF

echo ""
echo "2️⃣ Verificando settings actuales..."
docker exec -i diario-mercantil-db-1 mysql -u root -proot_password diario_mercantil << 'EOF'
SELECT * FROM settings;
EOF

# 2. Corregir settings
echo ""
echo "3️⃣ Corrigiendo precio por folio..."
docker exec -i diario-mercantil-db-1 mysql -u root -proot_password diario_mercantil << 'EOF'
INSERT INTO settings (id, price_per_folio_usd, convocatoria_usd, bcv_rate, iva_percent) 
VALUES (1, 1.50, 50.00, 36.50, 16.00)
ON DUPLICATE KEY UPDATE 
  price_per_folio_usd = COALESCE(NULLIF(price_per_folio_usd, 0), 1.50),
  bcv_rate = COALESCE(NULLIF(bcv_rate, 0), 36.50),
  iva_percent = COALESCE(NULLIF(iva_percent, 0), 16.00);

SELECT price_per_folio_usd, convocatoria_usd, bcv_rate, iva_percent FROM settings WHERE id = 1;
EOF

# 3. Corregir nombre de merchandev si es necesario
echo ""
echo "4️⃣ Corrigiendo nombre de merchandev..."
docker exec -i diario-mercantil-db-1 mysql -u root -proot_password diario_mercantil << 'EOF'
UPDATE users 
SET name = 'Arturo Merchandev'
WHERE (document LIKE '%29604828%' OR document = 'merchandev') 
  AND (name = 'merchandev' OR name = document);

SELECT id, document, name, role FROM users WHERE document LIKE '%29604828%' OR document = 'merchandev';
EOF

echo ""
echo "================================================"
echo "✅ Corrección completada"
echo "================================================"
echo ""
echo "Ahora refresca el navegador y verifica:"
echo "  - El topbar debe mostrar 'Hola, Arturo Merchandev'"
echo "  - El precio debe mostrar '54.75 Bs. / 1.50 USD'"
echo ""
