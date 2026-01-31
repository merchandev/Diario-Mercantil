<?php
/**
 * Create Admin User Script
 * Usage: php create_admin.php <document> <name> <password>
 * Example: php create_admin.php V12345678 "Administrador Sistema" "G0ku#1890"
 */

require_once __DIR__ . '/../src/Database.php';

if ($argc < 4) {
    echo "Usage: php create_admin.php <document> <name> <password>\n";
    echo "Example: php create_admin.php V12345678 \"Administrador Sistema\" \"MySecurePass123\"\n";
    exit(1);
}

$document = trim($argv[1]);
$name = trim($argv[2]);
$password = $argv[3];

if (empty($document) || empty($name) || empty($password)) {
    echo "Error: All parameters are required\n";
    exit(1);
}

try {
    $pdo = Database::pdo();
    
    // Check if user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE document = ?");
    $stmt->execute([$document]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        echo "Error: User with document '$document' already exists (ID: {$existing['id']})\n";
        echo "If you want to update the password, delete the user first or use a different document number.\n";
        exit(1);
    }
    
    // Generate password hash
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $now = gmdate("Y-m-d H:i:s");
    
    // Insert user
    $stmt = $pdo->prepare("
        INSERT INTO users (document, name, password_hash, role, email, phone, person_type, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', '', '', 'natural', ?, ?)
    ");
    
    $stmt->execute([$document, $name, $hash, $now, $now]);
    $userId = $pdo->lastInsertId();
    
    echo "✅ Admin user created successfully!\n";
    echo "   ID: $userId\n";
    echo "   Document: $document\n";
    echo "   Name: $name\n";
    echo "   Role: admin\n";
    echo "   Password hash length: " . strlen($hash) . " characters\n";
    echo "\nYou can now login with:\n";
    echo "   Document: $document\n";
    echo "   Password: (the one you provided)\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
