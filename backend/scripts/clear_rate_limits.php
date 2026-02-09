<?php
/**
 * Clear Rate Limiting Cache
 * Removes all login attempt tracking files
 * Run: php backend/scripts/clear_rate_limits.php
 */

$cacheDir = getenv('UPLOAD_DIR') ? dirname(getenv('UPLOAD_DIR')) . '/cache' : __DIR__ . '/../storage/cache';

echo "=== LIMPIEZA DE RATE LIMITS ===\n\n";
echo "Directorio de cache: {$cacheDir}\n\n";

if (!is_dir($cacheDir)) {
    echo "⚠️  Directorio de cache no existe. No hay nada que limpiar.\n";
    exit(0);
}

$files = glob($cacheDir . '/login_*');
$count = count($files);

if ($count === 0) {
    echo "✓ No hay archivos de rate limit para limpiar\n";
    exit(0);
}

echo "Encontrados {$count} archivos de rate limit:\n";
foreach ($files as $file) {
    $basename = basename($file);
    if (unlink($file)) {
        echo "  ✓ Eliminado: {$basename}\n";
    } else {
        echo "  ✗ Error al eliminar: {$basename}\n";
    }
}

echo "\n✓ Limpieza completada. {$count} archivos procesados.\n";
echo "\n=== USUARIOS DESBLOQUEADOS ===\n";
