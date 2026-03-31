# Script de validacion del build de Docker
# Este script verifica que la configuracion de produccion exista y pueda construir.

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Validando configuracion de Docker" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   OK Docker instalado: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR Docker no esta instalado o no esta en el PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Verificando Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   OK Docker daemon esta ejecutandose" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR Docker daemon no esta ejecutandose" -ForegroundColor Red
    Write-Host "   Inicia Docker Desktop e intenta nuevamente" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "3. Verificando archivos de configuracion..." -ForegroundColor Yellow

$requiredFiles = @(
    "docker-compose.yml",
    "backend\Dockerfile.prod",
    "frontend\Dockerfile.prod",
    ".dockerignore"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   OK $file" -ForegroundColor Green
    }
    else {
        Write-Host "   ERROR $file no encontrado" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "Faltan archivos requeridos para validar el despliegue" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "4. Construyendo imagen de backend..." -ForegroundColor Yellow
Write-Host "   Esto puede tardar varios minutos" -ForegroundColor Gray

try {
    docker build -t diario-backend-test -f backend/Dockerfile.prod backend 2>&1 | Out-Null
    Write-Host "   OK Backend construido exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR al construir backend" -ForegroundColor Red
    Write-Host "   Ejecuta manualmente: docker build -t diario-backend-test -f backend/Dockerfile.prod backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "5. Verificando wkhtmltopdf..." -ForegroundColor Yellow
try {
    $wkVersion = docker run --rm diario-backend-test wkhtmltopdf --version 2>&1
    Write-Host "   OK wkhtmltopdf instalado correctamente" -ForegroundColor Green
    Write-Host "   Version: $($wkVersion -split "`n" | Select-Object -First 1)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR al verificar wkhtmltopdf" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "6. Construyendo imagen de frontend..." -ForegroundColor Yellow
Write-Host "   Esto puede tardar varios minutos" -ForegroundColor Gray

try {
    docker build -t diario-frontend-test -f frontend/Dockerfile.prod frontend 2>&1 | Out-Null
    Write-Host "   OK Frontend construido exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR al construir frontend" -ForegroundColor Red
    Write-Host "   Ejecuta manualmente: docker build -t diario-frontend-test -f frontend/Dockerfile.prod frontend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "7. Limpiando imagenes de prueba..." -ForegroundColor Yellow
docker rmi diario-backend-test diario-frontend-test 2>&1 | Out-Null
Write-Host "   OK Imagenes de prueba eliminadas" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "VALIDACION EXITOSA" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion esta lista para validar despliegue en Hostinger VPS" -ForegroundColor Cyan
