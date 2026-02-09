<?php
require_once __DIR__ . '/../src/Database.php';

$pdo = Database::pdo();

echo "=== USERS TABLE SCHEMA ===\n";
$stmt = $pdo->query("DESCRIBE users");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo str_pad($row['Field'], 20) . " " . $row['Type'] . " (Default: " . ($row['Default'] ?? 'NULL') . ")\n";
}
echo "\n";

echo "=== CHECKING USER 123456789 ===\n";
$docs_to_check = ['123456789', 'V-123456789', 'V123456789'];
foreach ($docs_to_check as $doc) {
    echo "Checking document: '$doc'\n";
    $stmt = $pdo->prepare("SELECT * FROM users WHERE document = ?");
    $stmt->execute([$doc]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "✓ FOUND!\n";
        foreach ($user as $k => $v) {
            echo "  $k: $v\n";
        }
        
        // Test password
        $testPass = '1234567890';
        if (password_verify($testPass, $user['password_hash'])) {
            echo "✓ Password '$testPass' MATCHES!\n";
        } else {
            echo "✗ Password '$testPass' DOES NOT MATCH!\n";
        }
    } else {
        echo "✗ NOT FOUND\n";
    }
    echo "--------------------------------------------------\n";
}

echo "=== CHECKING RATE LIMIT FILES ===\n";
$cacheDir = __DIR__ . '/../storage/cache';
if (is_dir($cacheDir)) {
    $files = glob($cacheDir . '/login_*');
    foreach ($files as $f) {
        echo basename($f) . ": " . file_get_contents($f) . "\n";
    }
} else {
    echo "Cache directory not found at $cacheDir\n";
}
