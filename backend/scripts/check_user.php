<?php
/**
 * Diagnose user login issues
 * Run: php backend/scripts/check_user.php
 */

require_once __DIR__ . '/../src/Database.php';

$pdo = Database::pdo();

// Check if user V12345678 exists
$docs = ['V12345678', '12345678', 'V-12345678'];

echo "=== CHECKING USER LOGIN STATUS ===\n\n";

foreach ($docs as $doc) {
    echo "Checking document: $doc\n";
    $stmt = $pdo->prepare("SELECT id, document, name, role, password_hash FROM users WHERE document = ?");
    $stmt->execute([$doc]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "✓ FOUND!\n";
        echo "  - ID: {$user['id']}\n";
        echo "  - Document: {$user['document']}\n";
        echo "  - Name: {$user['name']}\n";
        echo "  - Role: {$user['role']}\n";
        echo "  - Hash length: " . strlen($user['password_hash']) . "\n";
        echo "  - Hash starts with: " . substr($user['password_hash'], 0, 10) . "...\n\n";
        
        // Test password verification
        $testPass = 'Admin1234*';  // Replace with actual password
        if (password_verify($testPass, $user['password_hash'])) {
            echo "✓ Password 'Admin1234*' VERIFIED!\n\n";
        } else {
            echo "✗ Password 'Admin1234*' FAILED\n";
            echo "  (This might be normal if the user has a different password)\n\n";
        }
    } else {
        echo "✗ NOT FOUND\n\n";
    }
}

// Check auth_tokens table exists
echo "=== CHECKING auth_tokens TABLE ===\n";
$stmt = $pdo->query("SHOW TABLES LIKE 'auth_tokens'");
if ($stmt->fetch()) {
    echo "✓ Table exists\n";
    
    // Show schema
    $stmt = $pdo->query("DESCRIBE auth_tokens");
    echo "\nTable structure:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['Field']} ({$row['Type']})\n";
    }
} else {
    echo "✗ TABLE MISSING!\n";
    echo "This will cause login to fail!\n";
}

echo "\n=== END DIAGNOSTICS ===\n";
