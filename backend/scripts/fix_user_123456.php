<?php
/**
 * Fix specific user 123456789
 * Run: php backend/scripts/fix_user_123456.php
 */

require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    
    $document = '123456789'; // Matches the screenshot
    $password = '1234567890'; // Matches the screenshot
    $name = 'Usuario Demo';
    
    echo "=== FIXING USER $document ===\n";
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id, password_hash, status FROM users WHERE document = ?");
    $stmt->execute([$document]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $now = gmdate('Y-m-d H:i:s');
    
    if ($user) {
        echo "User found (ID: {$user['id']}). Updating...\n";
        
        $update = $pdo->prepare("UPDATE users SET password_hash = ?, status = 'active', updated_at = ? WHERE id = ?");
        $update->execute([$hash, $now, $user['id']]);
        
        echo "✓ User updated successfully!\n";
        echo "  - Password set to: $password\n";
        echo "  - Status set to: active\n";
        
    } else {
        echo "User not found. Creating...\n";
        
        $insert = $pdo->prepare("
            INSERT INTO users (document, name, password_hash, role, status, created_at, updated_at)
            VALUES (?, ?, ?, 'solicitante', 'active', ?, ?)
        ");
        $insert->execute([$document, $name, $hash, $now, $now]);
        
        echo "✓ User created successfully!\n";
        echo "  - Document: $document\n";
        echo "  - Password: $password\n";
        echo "  - Status: active\n";
    }
    
    // Verify login capability
    echo "\n=== VERIFICATION ===\n";
    $stmt->execute([$document]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (password_verify($password, $user['password_hash'])) {
        echo "✓ Login verification SUCCESSFUL\n";
    } else {
        echo "✗ Login verification FAILED (Hash mismatch)\n";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
