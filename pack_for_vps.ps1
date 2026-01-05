$ErrorActionPreference = "Stop"
$zipName = "deploy_package.zip"

Write-Host "📦 Empaquetando proyecto para despliegue en VPS..." -ForegroundColor Cyan

# Remove old zip if exists
if (Test-Path $zipName) {
    Remove-Item $zipName
}

# Create a temporary directory for staging
$tempDir = "temp_deploy_staging"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy Backend
Write-Host "  - Copiando Backend..."
Copy-Item -Path "backend" -Destination $tempDir -Recurse
# Remove storage contents from staging if desired, but keeping structure is safer. 
# Maybe remove local sqlite if it's huge? But user might want it seeded.

# Copy Frontend (Excluding node_modules)
Write-Host "  - Copiando Frontend (sin node_modules)..."
New-Item -ItemType Directory -Path "$tempDir\frontend" | Out-Null
Get-ChildItem -Path "frontend" -Exclude "node_modules","dist",".git" | Copy-Item -Destination "$tempDir\frontend" -Recurse

# Copy Docker Compose Production
Write-Host "  - Copiando configuración Docker..."
Copy-Item -Path "docker-compose.prod.yml" -Destination "$tempDir\docker-compose.prod.yml"

# Zip it
Write-Host "💾 Comprimiendo archivos..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ ¡Listo! Sube el archivo '$zipName' a tu VPS." -ForegroundColor Green
Write-Host "   Ubiación: $(Resolve-Path $zipName)" -ForegroundColor Gray
