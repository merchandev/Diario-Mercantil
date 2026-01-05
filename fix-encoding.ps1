# Script para corregir encoding UTF-8 corrupto en Documento.tsx
$filePath = "e:\DASHBOARD\frontend\src\pages\solicitante\Documento.tsx"

Write-Host "Leyendo archivo..." -ForegroundColor Cyan
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Write-Host "Aplicando correcciones..." -ForegroundColor Cyan
# Corregir vocales con tilde
$content = $content -replace 'Ã³','ó'
$content = $content -replace 'Ã±','ñ'
$content = $content -replace 'Ã­','í'
$content = $content -replace 'Ã¡','á'
$content = $content -replace 'Ã©','é'
$content = $content -replace 'Ãº','ú'

# Corregir mayúsculas
$content = $content -replace 'Ã','Ó'
$content = $content -replace 'Ã','Ñ'
$content = $content -replace 'Ã','Í'
$content = $content -replace 'Ã','Á'
$content = $content -replace 'Ã','É'

Write-Host "Guardando archivo..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "✓ Corrección completada exitosamente" -ForegroundColor Green
