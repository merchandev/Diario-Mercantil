<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    // Check if the 'order_id' column exists in 'edition_orders'
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'edition_orders'
          AND column_name = 'order_id'
    ");
    $stmt->execute();

    if ((int)$stmt->fetchColumn() > 0) {
        // Drop existing foreign key on 'order_id' before renaming (to prevent issues in some MySQL versions)
        // First we need to find the FK constraint name
        $fkStmt = $pdo->prepare("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'edition_orders'
              AND COLUMN_NAME = 'order_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        $fkStmt->execute();
        $fkName = $fkStmt->fetchColumn();

        if ($fkName) {
            $pdo->exec("ALTER TABLE edition_orders DROP FOREIGN KEY `{$fkName}`");
        }

        // Rename the column
        $pdo->exec("
            ALTER TABLE edition_orders
            CHANGE order_id legal_request_id INT NOT NULL
        ");

        // Add the foreign key back with the new column name
        $pdo->exec("
            ALTER TABLE edition_orders
            ADD CONSTRAINT fk_edition_orders_legal_request
            FOREIGN KEY (legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE
        ");

        // Add the unique key that was added in the new init.sql but missing in old schema
        // First check if it already exists
        $ukStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'edition_orders'
              AND CONSTRAINT_NAME = 'uq_edition_orders_request'
        ");
        $ukStmt->execute();
        if ((int)$ukStmt->fetchColumn() === 0) {
            $pdo->exec("
                ALTER TABLE edition_orders
                ADD UNIQUE KEY uq_edition_orders_request (legal_request_id)
            ");
        }
    } else {
        // Just in case the column is already named legal_request_id but missing the unique constraint
        $ukStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'edition_orders'
              AND CONSTRAINT_NAME = 'uq_edition_orders_request'
        ");
        $ukStmt->execute();
        if ((int)$ukStmt->fetchColumn() === 0) {
            $pdo->exec("
                ALTER TABLE edition_orders
                ADD UNIQUE KEY uq_edition_orders_request (legal_request_id)
            ");
        }
    }
};
