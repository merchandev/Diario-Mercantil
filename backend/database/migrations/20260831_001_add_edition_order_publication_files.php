<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $columnExists = static function (string $column) use ($pdo): bool {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.columns "
            . "WHERE table_schema=DATABASE() AND table_name='edition_orders' AND column_name=?"
        );
        $stmt->execute([$column]);
        return (int) $stmt->fetchColumn() > 0;
    };
    $indexExists = static function (string $index) use ($pdo): bool {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.statistics "
            . "WHERE table_schema=DATABASE() AND table_name='edition_orders' AND index_name=?"
        );
        $stmt->execute([$index]);
        return (int) $stmt->fetchColumn() > 0;
    };
    $foreignKeyExists = static function (string $constraint) use ($pdo): bool {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.table_constraints "
            . "WHERE constraint_schema=DATABASE() AND table_name='edition_orders' "
            . "AND constraint_name=? AND constraint_type='FOREIGN KEY'"
        );
        $stmt->execute([$constraint]);
        return (int) $stmt->fetchColumn() > 0;
    };

    $columns = [
        'publication_file_id' => 'INT NULL',
        'publication_file_name' => 'VARCHAR(255) NULL',
        'publication_checksum' => 'CHAR(64) NULL',
        'publication_source' => 'VARCHAR(20) NULL',
        'publication_prepared_at' => 'DATETIME NULL',
        'publication_updated_at' => 'DATETIME NULL',
    ];
    foreach ($columns as $column => $definition) {
        if (!$columnExists($column)) {
            $pdo->exec("ALTER TABLE edition_orders ADD COLUMN {$column} {$definition}");
        }
    }

    if (!$indexExists('idx_edition_orders_publication_file')) {
        $pdo->exec('ALTER TABLE edition_orders ADD INDEX idx_edition_orders_publication_file (publication_file_id)');
    }
    if (!$foreignKeyExists('fk_edition_orders_publication_file')) {
        $pdo->exec(
            'ALTER TABLE edition_orders ADD CONSTRAINT fk_edition_orders_publication_file '
            . 'FOREIGN KEY (publication_file_id) REFERENCES files(id) ON DELETE SET NULL'
        );
    }
};
