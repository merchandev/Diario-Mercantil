<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "Adding verification_date column to legal_requests...\n";
    
    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM legal_requests LIKE 'verification_date'");
    if ($stmt->fetch()) {
        echo "Column 'verification_date' already exists.\n";
    } else {
        $pdo->exec("ALTER TABLE legal_requests ADD COLUMN verification_date DATE NULL AFTER publish_date");
        echo "Column 'verification_date' added successfully.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
