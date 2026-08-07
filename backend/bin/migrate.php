<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Database.php';

$pdo = Database::pdo();
if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
    fwrite(STDERR, "[migrate] Este migrador de producción requiere MySQL.\n");
    exit(1);
}

$lockName = 'diario_mercantil_schema_migrations';
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 30)');
$lockStmt->execute([$lockName]);
if ((int) $lockStmt->fetchColumn() !== 1) {
    fwrite(STDERR, "[migrate] No se pudo obtener el bloqueo de migraciones.\n");
    exit(1);
}

try {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations ('
        . 'version VARCHAR(190) PRIMARY KEY,'
        . 'checksum CHAR(64) NOT NULL,'
        . 'applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
        . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $dir = dirname(__DIR__) . '/database/migrations';
    $files = glob($dir . '/*.php') ?: [];
    sort($files, SORT_STRING);

    $getApplied = $pdo->prepare('SELECT checksum FROM schema_migrations WHERE version=?');
    $markApplied = $pdo->prepare(
        'INSERT INTO schema_migrations(version,checksum,applied_at) VALUES(?,?,NOW())'
    );

    foreach ($files as $file) {
        $version = basename($file, '.php');
        $checksum = hash_file('sha256', $file);
        if ($checksum === false) {
            throw new RuntimeException("No se pudo calcular checksum de {$version}");
        }

        $getApplied->execute([$version]);
        $existingChecksum = $getApplied->fetchColumn();
        if ($existingChecksum !== false) {
            if (!hash_equals((string) $existingChecksum, $checksum)) {
                throw new RuntimeException(
                    "La migración aplicada {$version} cambió de contenido. "
                    . 'Nunca edites una migración ya aplicada; crea una nueva.'
                );
            }
            echo "[migrate] {$version}: ya aplicada\n";
            continue;
        }

        $migration = require $file;
        if (!is_callable($migration)) {
            throw new RuntimeException("{$version} debe retornar un callable(PDO): void");
        }

        echo "[migrate] {$version}: aplicando...\n";
        $migration($pdo);
        $markApplied->execute([$version, $checksum]);
        echo "[migrate] {$version}: OK\n";
    }

    echo "[migrate] Esquema actualizado.\n";
} catch (Throwable $e) {
    fwrite(STDERR, '[migrate] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
} finally {
    try {
        $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    } catch (Throwable) {
        // El cierre de conexión también libera el advisory lock.
    }
}
