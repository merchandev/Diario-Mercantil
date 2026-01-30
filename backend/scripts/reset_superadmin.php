<?php
// backend/scripts/reset_superadmin.php
require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "--- RESET SUPERADMIN USER ---\n";
    
    $username = 'merchandev';
    $password = 'G0ku*1896';
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Check if table exists first (just in case migration failed)
    try {
        $pdo->query("SELECT 1 FROM superadmins LIMIT 1");
    } catch (PDOException $e) {
        // Table doesn't exist, create it
        echo "⚠️ Table 'superadmins' not found. Creating it...\n";
        $pdo->exec("CREATE TABLE IF NOT EXISTS superadmins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS superadmin_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            superadmin_id INT NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE
        )");
        echo "✅ Tables created.\n";
    }

    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM superadmins WHERE username = ?");
    $stmt->execute([$username]);
    $exists = $stmt->fetch();

    if ($exists) {
        // Update
        $stmt = $pdo->prepare("UPDATE superadmins SET password_hash = ? WHERE username = ?");
        $stmt->execute([$hash, $username]);
        echo "✅ User '$username' UPDATED. Password reset to '$password'.\n";
    } else {
        // Insert
        $stmt = $pdo->prepare("INSERT INTO superadmins (username, password_hash) VALUES (?, ?)");
        $stmt->execute([$username, $hash]);
        echo "✅ User '$username' CREATED. Password set to '$password'.\n";
    }

    // Verification
    echo "\n[Verifying Login Logic]\n";
    $stmt = $pdo->prepare("SELECT * FROM superadmins WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($password, $user['password_hash'])) {
        echo "SUCCESS: Login check passed for $username / $password\n";
    } else {
        echo "FAILED: Login check failed.\n";
    }

} catch (Throwable $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
