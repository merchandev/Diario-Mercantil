<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "Connected to database.\n";

    // Check superadmins table
    echo "Checking superadmins table...\n";
    $stmt = $pdo->query("SELECT * FROM superadmins WHERE username = 'merchandev'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo "User 'merchandev' FOUND.\n";
        echo "ID: " . $user['id'] . "\n";
        echo "Hash: " . $user['password_hash'] . "\n";
        
        // Reset password to 'merchandev' for testing
        $newPass = 'merchandev';
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE superadmins SET password_hash = ? WHERE id = ?")->execute([$hash, $user['id']]);
        echo "Password reset to '$newPass'.\n";
    } else {
        echo "User 'merchandev' NOT FOUND.\n";
        
        // Create it?
        echo "Creating 'merchandev' user...\n";
        $pass = 'merchandev'; // Default temporary password
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO superadmins (username, password_hash, created_at) VALUES (?, ?, NOW())");
        $stmt->execute(['merchandev', $hash]);
        echo "Created user 'merchandev' with password '$pass'.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
