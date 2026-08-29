<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($database === '') {
        throw new RuntimeException('No hay una base de datos seleccionada.');
    }

    $tableExists = static function (string $table) use ($pdo, $database): bool {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_name=?');
        $stmt->execute([$database, $table]);
        return (int)$stmt->fetchColumn() > 0;
    };
    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?');
        $stmt->execute([$database, $table, $column]);
        return (int)$stmt->fetchColumn() > 0;
    };
    $indexExists = static function (string $table, string $index) use ($pdo, $database): bool {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?');
        $stmt->execute([$database, $table, $index]);
        return (int)$stmt->fetchColumn() > 0;
    };

    if (!$tableExists('directory_areas')) {
        $pdo->exec("CREATE TABLE directory_areas (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
    if (!$tableExists('directory_colleges')) {
        $pdo->exec("CREATE TABLE directory_colleges (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    if ($tableExists('directory_profiles') && !$indexExists('directory_profiles', 'uq_directory_profiles_user_id')) {
        $duplicates = (int)$pdo->query('SELECT COUNT(*) FROM (SELECT user_id FROM directory_profiles GROUP BY user_id HAVING COUNT(*) > 1) duplicated_profiles')->fetchColumn();
        if ($duplicates > 0) {
            throw new RuntimeException('Existen perfiles duplicados en directory_profiles; deben consolidarse antes de crear el índice único.');
        }
        $pdo->exec('ALTER TABLE directory_profiles ADD UNIQUE KEY uq_directory_profiles_user_id (user_id)');
    }

    if ($tableExists('pages')) {
        if (!$columnExists('pages', 'header_html')) $pdo->exec('ALTER TABLE pages ADD COLUMN header_html TEXT NULL');
        if (!$columnExists('pages', 'body_json')) $pdo->exec('ALTER TABLE pages ADD COLUMN body_json LONGTEXT NULL');
        if (!$columnExists('pages', 'footer_html')) $pdo->exec('ALTER TABLE pages ADD COLUMN footer_html TEXT NULL');
        if (!$columnExists('pages', 'status')) $pdo->exec("ALTER TABLE pages ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'published'");

        if ($columnExists('pages', 'published')) {
            $pdo->exec("UPDATE pages SET status=IF(published=1, 'published', 'draft')");
        }
        if ($columnExists('pages', 'content')) {
            $pdo->exec("UPDATE pages SET body_json=JSON_ARRAY(JSON_OBJECT('id', CONCAT('legacy-', id), 'type', 'paragraph', 'props', JSON_OBJECT('text', content, 'align', 'left'))) WHERE content IS NOT NULL AND content <> '' AND (body_json IS NULL OR body_json='[]')");
        }
        $pdo->exec("UPDATE pages SET body_json='[]' WHERE body_json IS NULL OR body_json=''");
    }

    if ($tableExists('editions')) {
        if (!$columnExists('editions', 'published_by')) $pdo->exec('ALTER TABLE editions ADD COLUMN published_by INT NULL');
        if (!$columnExists('editions', 'published_file_checksum')) $pdo->exec('ALTER TABLE editions ADD COLUMN published_file_checksum VARCHAR(64) NULL');
        if (!$indexExists('editions', 'idx_editions_published_by')) $pdo->exec('ALTER TABLE editions ADD INDEX idx_editions_published_by (published_by)');
    }
};
