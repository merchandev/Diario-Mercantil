$ErrorActionPreference = "Stop"
$zipName = "deploy_package.zip"

Write-Host "Empaquetando proyecto para despliegue en VPS..." -ForegroundColor Cyan

if (Test-Path $zipName) {
    Remove-Item $zipName
}

$tempDir = "temp_deploy_staging"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "  - Copiando backend..."
Copy-Item -Path "backend" -Destination $tempDir -Recurse

Write-Host "  - Copiando frontend sin node_modules..."
New-Item -ItemType Directory -Path "$tempDir\frontend" | Out-Null
Get-ChildItem -Path "frontend" -Exclude "node_modules", "dist", ".git" | Copy-Item -Destination "$tempDir\frontend" -Recurse

Write-Host "  - Copiando docker-compose y scripts..."
Copy-Item -Path "docker-compose.yml" -Destination "$tempDir\docker-compose.yml"
if (Test-Path "docker-compose.backend.prod.yml") {
    Copy-Item -Path "docker-compose.backend.prod.yml" -Destination "$tempDir\docker-compose.backend.prod.yml"
}
if (Test-Path ".env.example") {
    Copy-Item -Path ".env.example" -Destination "$tempDir\.env.example"
}

foreach ($file in @("deploy.sh", "update.sh", "healthcheck.sh", "verificar_acceso.sh", "README.md")) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination "$tempDir\$file"
    }
}

Write-Host "Comprimiendo archivos..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName

Remove-Item $tempDir -Recurse -Force

Write-Host "Listo. Sube el archivo '$zipName' a tu VPS." -ForegroundColor Green
Write-Host "Ubicacion: $(Resolve-Path $zipName)" -ForegroundColor Gray
