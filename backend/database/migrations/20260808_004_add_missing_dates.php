<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    
    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema=? AND table_name=? AND column_name=?'
        );
        $stmt->execute([$database, $table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    if (!$columnExists('legal_requests', 'submitted_at')) {
        $pdo->exec('ALTER TABLE legal_requests ADD COLUMN submitted_at DATETIME NULL');
    }

    if (!$columnExists('legal_requests', 'verification_date')) {
        $pdo->exec('ALTER TABLE legal_requests ADD COLUMN verification_date DATETIME NULL');
    }
};
