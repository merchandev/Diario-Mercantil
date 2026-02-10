<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "Setting AUTO_INCREMENT for legal_requests to 1001...\n";
    
    // Check current max ID
    $stmt = $pdo->query("SELECT MAX(id) FROM legal_requests");
    $maxId = (int)$stmt->fetchColumn();
    echo "Current MAX ID: $maxId\n";
    
    if ($maxId < 1001) {
        // SQLite
        // $pdo->exec("UPDATE sqlite_sequence SET seq = 1000 WHERE name = 'legal_requests'");
        
        // MySQL/MariaDB
        $pdo->exec("ALTER TABLE legal_requests AUTO_INCREMENT = 1001");
        echo "AUTO_INCREMENT set to 1001.\n";
    } else {
        echo "Max ID is already >= 1001 ($maxId). No change made to avoid conflict.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
