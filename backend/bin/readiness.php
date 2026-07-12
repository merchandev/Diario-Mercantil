<?php

require_once dirname(__DIR__) . '/src/Database.php';

$ready = true;

try {
    Database::pdo()->query('SELECT 1');
} catch (Throwable $exception) {
    error_log('[readiness.database] ' . $exception->getMessage());
    $ready = false;
}

$storage = getenv('UPLOAD_DIR') ?: dirname(__DIR__) . '/storage/uploads';

if (!is_dir($storage) || !is_writable($storage)) {
    error_log('[readiness.storage] Directory not found or not writable');
    $ready = false;
}

$minimumBytes = (int) (getenv('HEALTH_MIN_DISK_BYTES') ?: 500 * 1024 * 1024);
$freeBytes = @disk_free_space($storage);

if ($freeBytes === false || $freeBytes < $minimumBytes) {
    error_log('[readiness.disk] Low disk space');
    $ready = false;
}

exit($ready ? 0 : 1);
