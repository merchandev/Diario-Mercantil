<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    // Check if published_at exists
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'editions'
          AND column_name = 'published_at'
    ");
    $stmt->execute();

    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("
            ALTER TABLE editions
            ADD COLUMN published_at DATETIME NULL AFTER created_at,
            ADD COLUMN published_by INT NULL AFTER published_at,
            ADD COLUMN published_file_checksum VARCHAR(64) NULL AFTER published_by,
            ADD CONSTRAINT fk_editions_published_by FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL
        ");
    }
};
