<?php

declare(strict_types=1);

return static function (\PDO $pdo): void {
    $database =
        (string)$pdo
            ->query('SELECT DATABASE()')
            ->fetchColumn();

    $exists = static function (
        string $column
    ) use ($pdo, $database): bool {
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema=?
              AND table_name='users'
              AND column_name=?
        ");

        $stmt->execute([
            $database,
            $column
        ]);

        return (int)$stmt->fetchColumn() > 0;
    };

    if (!$exists('avatar_url')) {
        $pdo->exec("
            ALTER TABLE users
            ADD avatar_url VARCHAR(255) NULL
        ");
    }

    if (!$exists('avatar_updated_at')) {
        $pdo->exec("
            ALTER TABLE users
            ADD avatar_updated_at DATETIME NULL
        ");
    }
};
