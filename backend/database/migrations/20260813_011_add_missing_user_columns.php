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

    $columns = [
        ['person_type', "VARCHAR(50) DEFAULT 'natural'"],
        ['state', "VARCHAR(100) NULL"],
        ['municipality', "VARCHAR(100) NULL"],
        ['address', "TEXT NULL"]
    ];

    foreach ($columns as [$col, $def]) {
        if (!$columnExists('users', $col)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN {$col} {$def}");
            echo "[migration] Columna {$col} añadida a users.\n";
        }
    }
};
