<?php
declare(strict_types=1);
return function(\PDO $pdo) {
    // Check if index exists first
    $database = $pdo->query('SELECT DATABASE()')->fetchColumn();
    $idxStmt = $pdo->prepare("
        SELECT COUNT(1) 
        FROM information_schema.statistics 
        WHERE table_schema = ? 
          AND table_name = 'legal_payments' 
          AND index_name = 'uq_legal_payment_request'
    ");
    $idxStmt->execute([$database]);
    $idxExists = (int) $idxStmt->fetchColumn() > 0;
    
    if ($idxExists) {
        $pdo->exec("ALTER TABLE legal_payments DROP INDEX uq_legal_payment_request");
    }
};
