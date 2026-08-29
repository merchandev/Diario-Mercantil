<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($database === '') {
        throw new RuntimeException('No hay una base de datos seleccionada.');
    }

    $tableStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_name='legal_payments'"
    );
    $tableStmt->execute([$database]);
    if ((int)$tableStmt->fetchColumn() === 0) {
        return;
    }

    $indexStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.statistics "
        . "WHERE table_schema=? AND table_name='legal_payments' AND index_name='idx_legal_payments_request'"
    );
    $indexStmt->execute([$database]);
    if ((int)$indexStmt->fetchColumn() === 0) {
        // MySQL requires a non-unique supporting index for the foreign key before
        // the historical one-payment unique index can be removed safely.
        $pdo->exec('ALTER TABLE legal_payments ADD INDEX idx_legal_payments_request (legal_request_id)');
    }
};
