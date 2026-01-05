param(
    [string]$ThemePath = 'C:\Users\merch\OneDrive\Escritorio\DIARIO MERCANTIL\themes\diario-mercantil'
)

# Try to find npm in common locations if not in PATH
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $commonPaths = @(
        "$env:ProgramFiles\nodejs\npm.cmd",
        "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd"
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $npmCmd = Get-Command $path -ErrorAction SilentlyContinue
            break
        }
    }
}

if (-not $npmCmd) {
    Write-Error "npm not found. Please install Node.js from https://nodejs.org/ or add npm to PATH."
    exit 1
}

Write-Host "Building frontend with npm (using: $($npmCmd.Source))..."
& $npmCmd run build
if ($LASTEXITCODE -ne 0) { Write-Error "npm run build failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }

$dist = Join-Path -Path (Get-Location) -ChildPath 'dist'
if (-not (Test-Path $dist)) { Write-Error "dist folder not found after build: $dist"; exit 1 }

$target = Join-Path -Path $ThemePath -ChildPath 'assets\build'
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Path $target -Force | Out-Null

Write-Host "Copying build files to theme: $target"
Copy-Item -Path (Join-Path $dist '*') -Destination $target -Recurse -Force

Write-Host "✓ Build copied successfully. Theme should now load assets from assets/build/."
Write-Host "  If deploying to Hostinger, zip the theme folder and upload via WP admin."
