<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    
    echo "--- Recent Legal Requests ---\n";
    $stmt = $pdo->query("SELECT id, order_no, status FROM legal_requests ORDER BY id DESC LIMIT 5");
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($requests);

    echo "\n--- Recent Legal Files ---\n";
    $stmt = $pdo->query("SELECT * FROM legal_files ORDER BY id DESC LIMIT 5");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($files);

    echo "\n--- Recent Files ---\n";
    $stmt = $pdo->query("SELECT * FROM files ORDER BY id DESC LIMIT 5");
    $realFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($realFiles);
    
    // Check specific file with ID like '1-1' if possible (though ID is likely int)
    // If ID is int, '1-1' is invalid.
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
