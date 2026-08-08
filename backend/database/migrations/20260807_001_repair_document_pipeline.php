<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($database === '') {
        throw new RuntimeException('No hay una base de datos seleccionada.');
    }

    $tableExists = static function (string $table) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_name=?'
        );
        $stmt->execute([$database, $table]);
        return (int) $stmt->fetchColumn() > 0;
    };

    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema=? AND table_name=? AND column_name=?'
        );
        $stmt->execute([$database, $table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    $indexExists = static function (string $table, string $index) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.statistics '
            . 'WHERE table_schema=? AND table_name=? AND index_name=?'
        );
        $stmt->execute([$database, $table, $index]);
        return (int) $stmt->fetchColumn() > 0;
    };

    foreach (['users', 'files', 'legal_requests', 'settings'] as $coreTable) {
        if (!$tableExists($coreTable)) {
            throw new RuntimeException(
                "Falta la tabla base {$coreTable}. Esta migración repara producción existente; "
                . 'no sustituye el bootstrap de una base completamente vacía.'
            );
        }
    }

    // Columnas que el código actual usa y que pueden faltar en instalaciones antiguas.
    $columns = [
        ['files', 'checksum', 'ALTER TABLE files ADD COLUMN checksum VARCHAR(64) NULL AFTER type'],
        ['files', 'version', 'ALTER TABLE files ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER checksum'],
        ['files', 'owner', 'ALTER TABLE files ADD COLUMN owner VARCHAR(255) NULL AFTER status'],
        ['files', 'deleted_at', 'ALTER TABLE files ADD COLUMN deleted_at DATETIME NULL AFTER owner'],
        ['legal_requests', 'precio_unitario_usd', 'ALTER TABLE legal_requests ADD COLUMN precio_unitario_usd DECIMAL(15,4) NULL'],
        ['legal_requests', 'subtotal_usd', 'ALTER TABLE legal_requests ADD COLUMN subtotal_usd DECIMAL(15,4) NULL'],
        ['legal_requests', 'porcentaje_iva', 'ALTER TABLE legal_requests ADD COLUMN porcentaje_iva DECIMAL(5,2) NULL'],
        ['legal_requests', 'iva_usd', 'ALTER TABLE legal_requests ADD COLUMN iva_usd DECIMAL(15,4) NULL'],
        ['legal_requests', 'tasa_bcv', 'ALTER TABLE legal_requests ADD COLUMN tasa_bcv DECIMAL(15,4) NULL'],
        ['legal_requests', 'fecha_tasa', 'ALTER TABLE legal_requests ADD COLUMN fecha_tasa DATETIME NULL'],
        ['legal_requests', 'total_bs', 'ALTER TABLE legal_requests ADD COLUMN total_bs DECIMAL(15,2) NULL'],
        ['legal_requests', 'deleted_at', 'ALTER TABLE legal_requests ADD COLUMN deleted_at DATETIME NULL'],
        ['legal_requests', 'updated_at', 'ALTER TABLE legal_requests ADD COLUMN updated_at DATETIME NULL'],
    ];

    foreach ($columns as [$table, $column, $sql]) {
        if (!$columnExists($table, $column)) {
            $pdo->exec($sql);
        }
    }

    // Backfill para poder usar updated_at de forma consistente.
    $pdo->exec(
        'UPDATE legal_requests SET updated_at=COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL'
    );

    if (!$tableExists('file_events')) {
        $pdo->exec(
            'CREATE TABLE file_events ('
            . 'id INT AUTO_INCREMENT PRIMARY KEY,'
            . 'file_id INT NOT NULL,'
            . 'ts DATETIME NOT NULL,'
            . 'type VARCHAR(50) NOT NULL,'
            . 'message TEXT NULL,'
            . 'INDEX idx_file_events_file_id (file_id),'
            . 'CONSTRAINT fk_file_events_file FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if (!$tableExists('legal_files')) {
        $pdo->exec(
            'CREATE TABLE legal_files ('
            . 'id INT AUTO_INCREMENT PRIMARY KEY,'
            . 'legal_request_id INT NOT NULL,'
            . 'kind VARCHAR(50) NOT NULL,'
            . 'file_id INT NOT NULL,'
            . 'created_at DATETIME NOT NULL,'
            . 'INDEX idx_legal_files_file_id (file_id),'
            . 'INDEX idx_legal_files_request_id (legal_request_id),'
            . 'CONSTRAINT fk_legal_files_request FOREIGN KEY(legal_request_id) '
            . 'REFERENCES legal_requests(id) ON DELETE CASCADE,'
            . 'CONSTRAINT fk_legal_files_file FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    // El código trata cada kind como un slot único. Conserva el registro más reciente.
    $pdo->exec(
        'DELETE older FROM legal_files older '
        . 'JOIN legal_files newer ON newer.legal_request_id=older.legal_request_id '
        . 'AND newer.kind=older.kind AND newer.id>older.id'
    );

    if (!$indexExists('legal_files', 'uq_legal_files_request_kind')) {
        $pdo->exec(
            'ALTER TABLE legal_files ADD UNIQUE KEY uq_legal_files_request_kind (legal_request_id, kind)'
        );
    }
    if (!$indexExists('legal_files', 'idx_legal_files_file_id')) {
        $pdo->exec('ALTER TABLE legal_files ADD INDEX idx_legal_files_file_id (file_id)');
    }

    if (!$tableExists('directory_profiles')) {
        $pdo->exec(
            'CREATE TABLE directory_profiles ('
            . 'id INT AUTO_INCREMENT PRIMARY KEY,'
            . 'user_id INT NOT NULL,'
            . 'full_name VARCHAR(255) NOT NULL,'
            . 'email VARCHAR(255) NULL,'
            . 'phones VARCHAR(255) NULL,'
            . 'state VARCHAR(100) NULL,'
            . 'areas TEXT NULL,'
            . 'colegio VARCHAR(100) NULL,'
            . 'socials TEXT NULL,'
            . 'inpre_photo_file_id INT NULL,'
            . 'profile_photo_file_id INT NULL,'
            . "status VARCHAR(50) NOT NULL DEFAULT 'pendiente',"
            . 'created_at DATETIME NOT NULL,'
            . 'updated_at DATETIME NOT NULL,'
            . 'INDEX idx_directory_profiles_user_id (user_id),'
            . 'CONSTRAINT fk_directory_profiles_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    // Asegurar valores por defecto si no existen, para no bloquear el despliegue.
    $insertSetting = $pdo->prepare('INSERT IGNORE INTO settings (`key`, value, updated_at) VALUES (?, ?, NOW())');
    $insertSetting->execute(['price_per_folio_usd', '30.00']);
    $insertSetting->execute(['iva_percent', '16.00']);

    $settings = $pdo->prepare(
        "SELECT `key`, value FROM settings WHERE `key` IN ('price_per_folio_usd','iva_percent')"
    );
    $settings->execute();
    $values = [];
    foreach ($settings->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $values[$row['key']] = $row['value'];
    }
    if (!isset($values['price_per_folio_usd']) || !is_numeric($values['price_per_folio_usd']) || (float) $values['price_per_folio_usd'] <= 0) {
        throw new RuntimeException('settings.price_per_folio_usd falta o no es válido. Verifica la base de datos manualmente.');
    }
    if (!isset($values['iva_percent']) || !is_numeric($values['iva_percent']) || (float) $values['iva_percent'] < 0) {
        throw new RuntimeException('settings.iva_percent falta o no es válido. Verifica la base de datos manualmente.');
    }
};
