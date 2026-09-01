<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($database === '') {
        throw new RuntimeException('No hay una base de datos seleccionada.');
    }

    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema=? AND table_name=? AND column_name=?'
        );
        $stmt->execute([$database, $table, $column]);
        return (int)$stmt->fetchColumn() > 0;
    };
    $indexColumns = static function (string $table, string $index) use ($pdo, $database): array {
        $stmt = $pdo->prepare(
            'SELECT column_name,non_unique FROM information_schema.statistics '
            . 'WHERE table_schema=? AND table_name=? AND index_name=? ORDER BY seq_in_index'
        );
        $stmt->execute([$database, $table, $index]);
        return $stmt->fetchAll(PDO::FETCH_NUM);
    };
    $assertIndex = static function (
        string $table,
        string $index,
        array $expectedColumns,
        bool $unique
    ) use ($indexColumns): void {
        $rows = $indexColumns($table, $index);
        $columns = array_column($rows, 0);
        $isUnique = $rows !== [] && (int)$rows[0][1] === 0;
        if ($columns !== $expectedColumns || $isUnique !== $unique) {
            throw new RuntimeException("El índice {$table}.{$index} no coincide con el contrato esperado.");
        }
    };

    if (!$columnExists('payment_methods', 'qr_file_id')) {
        $pdo->exec('ALTER TABLE payment_methods ADD COLUMN qr_file_id INT NULL');
    }
    if (!$columnExists('payment_methods', 'qr_updated_at')) {
        $pdo->exec('ALTER TABLE payment_methods ADD COLUMN qr_updated_at DATETIME NULL');
    }

    if ($indexColumns('payment_methods', 'idx_payment_methods_qr_file') === []) {
        $pdo->exec('ALTER TABLE payment_methods ADD INDEX idx_payment_methods_qr_file (qr_file_id)');
    }
    $assertIndex('payment_methods', 'idx_payment_methods_qr_file', ['qr_file_id'], false);

    $foreignKey = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.key_column_usage '
        . 'WHERE table_schema=? AND table_name=? '
        . 'AND column_name=? AND referenced_table_name=? AND referenced_column_name=?'
    );
    $foreignKey->execute([
        $database,
        'payment_methods',
        'qr_file_id',
        'files',
        'id',
    ]);
    if ((int)$foreignKey->fetchColumn() === 0) {
        $pdo->exec(
            'ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_qr_file '
            . 'FOREIGN KEY (qr_file_id) REFERENCES files(id) ON DELETE SET NULL'
        );
    }

    if ($indexColumns('edition_orders', 'idx_edition_orders_request') === []) {
        $pdo->exec('ALTER TABLE edition_orders ADD INDEX idx_edition_orders_request (legal_request_id)');
    }
    $assertIndex('edition_orders', 'idx_edition_orders_request', ['legal_request_id'], false);

    if ($indexColumns('edition_orders', 'uq_edition_orders_request') !== []) {
        $pdo->exec('ALTER TABLE edition_orders DROP INDEX uq_edition_orders_request');
    }
    if ($indexColumns('edition_orders', 'uq_edition_orders_request') !== []) {
        throw new RuntimeException('No se pudo retirar la unicidad histórica de edition_orders.legal_request_id.');
    }

    if ($indexColumns('editions', 'uq_edition_year_number') === []) {
        $duplicates = (int)$pdo->query(
            'SELECT COUNT(*) FROM ('
            . 'SELECT publication_year,edition_no FROM editions '
            . 'GROUP BY publication_year,edition_no HAVING COUNT(*)>1'
            . ') duplicate_editions'
        )->fetchColumn();
        if ($duplicates > 0) {
            throw new RuntimeException('Existen correlativos anuales duplicados en editions.');
        }
        $pdo->exec('ALTER TABLE editions ADD UNIQUE KEY uq_edition_year_number (publication_year,edition_no)');
    }
    $assertIndex('editions', 'uq_edition_year_number', ['publication_year', 'edition_no'], true);

    if ($indexColumns('editions', 'uq_editions_code') === []) {
        $duplicates = (int)$pdo->query(
            'SELECT COUNT(*) FROM (SELECT code FROM editions GROUP BY code HAVING COUNT(*)>1) duplicate_codes'
        )->fetchColumn();
        if ($duplicates > 0) {
            throw new RuntimeException('Existen códigos CVE duplicados en editions.');
        }
        $pdo->exec('ALTER TABLE editions ADD UNIQUE KEY uq_editions_code (code)');
    }
    $assertIndex('editions', 'uq_editions_code', ['code'], true);
};
