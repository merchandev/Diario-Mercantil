<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();

    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?'
        );
        $stmt->execute([$database, $table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    if (!$columnExists('files', 'deleted_at')) {
        $pdo->exec('ALTER TABLE files ADD COLUMN deleted_at DATETIME NULL');
        echo "[migration] Columna deleted_at añadida a files.\n";
    } else {
        echo "[migration] La columna deleted_at ya existe en files.\n";
    }
};
