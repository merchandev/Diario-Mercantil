# Script de Validación del Build de Docker
# Este script verifica que el Dockerfile.prod esté correctamente configurado

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Validando Configuración de Docker" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker esté instalado
Write-Host "1. Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✓ Docker instalado: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "   ✗ Docker no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar que Docker esté ejecutándose
Write-Host ""
Write-Host "2. Verificando Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✓ Docker daemon está ejecutándose" -ForegroundColor Green
}
catch {
    Write-Host "   ✗ Docker daemon no está ejecutándose" -ForegroundColor Red
    Write-Host "   → Inicia Docker Desktop e intenta nuevamente" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos necesarios
Write-Host ""
Write-Host "3. Verificando archivos de configuración..." -ForegroundColor Yellow

$requiredFiles = @(
    "docker-compose.yml",
    "backend\Dockerfile.prod",
    "frontend\Dockerfile.prod",
    ".dockerignore",
    "backend\.dockerignore"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file" -ForegroundColor Green
    }
    else {
        Write-Host "   ✗ $file NO ENCONTRADO" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "Algunos archivos requeridos no existen" -ForegroundColor Red
    exit 1
}

# Construir imagen de backend
Write-Host ""
Write-Host "4. Construyendo imagen de backend..." -ForegroundColor Yellow
Write-Host "   (Esto puede tardar varios minutos)" -ForegroundColor Gray

try {
    docker build -t diario-backend-test -f backend/Dockerfile.prod backend 2>&1 | Out-Null
    Write-Host "   ✓ Backend construido exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "   ✗ Error al construir backend" -ForegroundColor Red
    Write-Host "   Ejecuta manualmente: docker build -t diario-backend-test -f backend/Dockerfile.prod backend" -ForegroundColor Yellow
    exit 1
}

# Verificar wkhtmltopdf en el contenedor
Write-Host ""
Write-Host "5. Verificando wkhtmltopdf..." -ForegroundColor Yellow
try {
    $wkVersion = docker run --rm diario-backend-test wkhtmltopdf --version 2>&1
    Write-Host "   ✓ wkhtmltopdf instalado correctamente" -ForegroundColor Green
    Write-Host "   Versión: $($wkVersion -split "`n" | Select-Object -First 1)" -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Error al verificar wkhtmltopdf" -ForegroundColor Red
    exit 1
}

# Construir imagen de frontend
Write-Host ""
Write-Host "6. Construyendo imagen de frontend..." -ForegroundColor Yellow
Write-Host "   (Esto puede tardar varios minutos)" -ForegroundColor Gray

try {
    docker build -t diario-frontend-test -f frontend/Dockerfile.prod frontend 2>&1 | Out-Null
    Write-Host "   ✓ Frontend construido exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "   ✗ Error al construir frontend" -ForegroundColor Red
    Write-Host "   Ejecuta manualmente: docker build -t diario-frontend-test -f frontend/Dockerfile.prod frontend" -ForegroundColor Yellow
    exit 1
}

# Limpiar imágenes de prueba
Write-Host ""
Write-Host "7. Limpiando imágenes de prueba..." -ForegroundColor Yellow
docker rmi diario-backend-test diario-frontend-test 2>&1 | Out-Null
Write-Host "   ✓ Imágenes de prueba eliminadas" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "✓ VALIDACIÓN EXITOSA" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "La aplicación está lista para desplegar en Hostinger VPS" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. git add ." -ForegroundColor White
Write-Host "2. git commit -m 'fix: instalar wkhtmltopdf desde repositorios apt'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
Write-Host "4. Desplegar en Hostinger VPS" -ForegroundColor White
Write-Host ""
