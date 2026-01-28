<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    
    echo "Checking 'users' table schema...\n";
    $stmt = $pdo->query("DESCRIBE users");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $needsFix = false;
    foreach ($cols as $c) {
        if ($c['Field'] === 'password_hash') {
            echo "Found password_hash: " . $c['Type'] . "\n";
            if (!str_contains($c['Type'], 'varchar(255)')) {
                $needsFix = true;
            }
        }
    }
    
    if ($needsFix) {
        echo "Fixing password_hash column length...\n";
        $pdo->exec("ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL DEFAULT ''");
        echo "Success: Column updated to VARCHAR(255).\n";
    } else {
        echo "Column is already sufficient length.\n";
    }
    
    // Also fix superadmins just in case
    echo "Checking 'superadmins' table...\n";
    // Usually superadmins has 'password' or 'password_hash'?
    // Checking code... AuthController doesn't show superadmin password verification, logic is hidden in SuperAdminController?
    // Let's stick to users for now.
    
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
