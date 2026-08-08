<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    // 1. Crear tabla de archivo
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS legal_payment_duplicates_archive (
            id INT AUTO_INCREMENT PRIMARY KEY,
            original_payment_id INT NOT NULL,
            legal_request_id INT NOT NULL,
            ref VARCHAR(255),
            date VARCHAR(255),
            bank VARCHAR(255),
            type VARCHAR(255),
            mobile_phone VARCHAR(255),
            amount_bs DECIMAL(15,2),
            status VARCHAR(50),
            created_at DATETIME,
            archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            motivo VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 2. Detectar solicitudes con pagos múltiples
    $stmt = $pdo->query("
        SELECT legal_request_id 
        FROM legal_payments 
        GROUP BY legal_request_id 
        HAVING COUNT(*) > 1
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($duplicates as $row) {
        $reqId = (int)$row['legal_request_id'];
        
        $pStmt = $pdo->prepare("SELECT * FROM legal_payments WHERE legal_request_id = ? ORDER BY id ASC");
        $pStmt->execute([$reqId]);
        $payments = $pStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Conservar el último pago
        $latestPayment = array_pop($payments);
        
        foreach ($payments as $dup) {
            // Archivar
            $arch = $pdo->prepare("
                INSERT INTO legal_payment_duplicates_archive 
                (original_payment_id, legal_request_id, ref, date, bank, type, mobile_phone, amount_bs, status, created_at, motivo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $arch->execute([
                $dup['id'], $dup['legal_request_id'], $dup['ref'], $dup['date'], $dup['bank'], 
                $dup['type'], $dup['mobile_phone'] ?? null, $dup['amount_bs'], $dup['status'], 
                $dup['created_at'], 'duplicate_cleanup_20260808'
            ]);
            
            // Eliminar
            $del = $pdo->prepare("DELETE FROM legal_payments WHERE id = ?");
            $del->execute([$dup['id']]);
        }
        
        // Corregir amount_bs en el pago sobreviviente (tomando total_bs de legal_requests)
        $upd = $pdo->prepare("
            UPDATE legal_payments lp
            JOIN legal_requests lr ON lp.legal_request_id = lr.id
            SET lp.amount_bs = lr.total_bs
            WHERE lp.id = ?
        ");
        $upd->execute([$latestPayment['id']]);
    }
    
    // Corregir también el amount_bs para todas las demás órdenes si hubiera desincronización
    $pdo->exec("
        UPDATE legal_payments lp
        JOIN legal_requests lr ON lp.legal_request_id = lr.id
        SET lp.amount_bs = lr.total_bs
    ");

    // 3. Crear restricción única (si no existe)
    $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    $idxStmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM information_schema.statistics 
        WHERE table_schema = ? 
          AND table_name = 'legal_payments' 
          AND index_name = 'uq_legal_payment_request'
    ");
    $idxStmt->execute([$database]);
    $idxExists = (int) $idxStmt->fetchColumn() > 0;
    
    if (!$idxExists) {
        $pdo->exec("ALTER TABLE legal_payments ADD UNIQUE KEY uq_legal_payment_request (legal_request_id)");
    }
};
