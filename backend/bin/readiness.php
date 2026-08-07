<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Database.php';

function check(): bool {
    try {
        if (!Database::healthCheck()) {
            echo "Database error.\n";
            return false;
        }

        $pdo = Database::pdo();
        
        $tables = ['schema_migrations', 'users', 'files', 'legal_requests', 'legal_files', 'file_events', 'settings'];
        foreach ($tables as $table) {
            $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
            $stmt->execute([$table]);
            if ((int)$stmt->fetchColumn() === 0) {
                echo "Missing table: {$table}\n";
                return false;
            }
        }

        $stmt = $pdo->query("SELECT `key`, value FROM settings WHERE `key` IN ('price_per_folio_usd','iva_percent')");
        $settings = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $settings[$row['key']] = $row['value'];
        }
        if (!isset($settings['price_per_folio_usd']) || !is_numeric($settings['price_per_folio_usd']) || (float)$settings['price_per_folio_usd'] <= 0) {
            echo "Missing or invalid price_per_folio_usd.\n";
            return false;
        }
        if (!isset($settings['iva_percent']) || !is_numeric($settings['iva_percent']) || (float)$settings['iva_percent'] < 0) {
            echo "Missing or invalid iva_percent.\n";
            return false;
        }

        $uploadDir = rtrim((string)(getenv('UPLOAD_DIR') ?: dirname(__DIR__) . '/storage/uploads'), '/');
        if (!is_dir($uploadDir) || !is_writable($uploadDir)) {
            echo "Upload dir not writable: {$uploadDir}\n";
            return false;
        }

        $minBytes = (int)(getenv('HEALTH_MIN_DISK_BYTES') ?: 524288000);
        $freeSpace = @disk_free_space($uploadDir);
        if ($freeSpace !== false && $freeSpace < $minBytes) {
            echo "Insufficient disk space in: {$uploadDir}\n";
            return false;
        }

        exec('which pdfinfo', $output, $returnVar);
        if ($returnVar !== 0) {
            echo "pdfinfo binary not found.\n";
            return false;
        }

        echo "OK\n";
        return true;
    } catch (Throwable $e) {
        echo "Exception: " . $e->getMessage() . "\n";
        return false;
    }
}

exit(check() ? 0 : 1);
