<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.columns " .
        "WHERE table_schema=? AND table_name='editions' AND column_name='deleted_at'"
    );
    $stmt->execute([$database]);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE editions ADD COLUMN deleted_at DATETIME NULL');
        $pdo->exec('CREATE INDEX idx_editions_deleted_at ON editions(deleted_at)');
    }
};
