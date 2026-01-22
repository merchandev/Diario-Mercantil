<?php
require_once __DIR__.'/../src/Database.php';

function test($name, $algo) {
    echo "\n--- Testing $name ($algo) ---\n";
    $pass = '123456';
    $hash = password_hash($pass, $algo);
    echo "Password: $pass\n";
    echo "Hash: $hash\n";
    echo "Length: " . strlen($hash) . "\n";
    
    if (password_verify($pass, $hash)) {
        echo "[OK] password_verify success\n";
    } else {
        echo "[FAIL] password_verify failed\n";
    }
}

test("UserController Style (BCRYPT)", PASSWORD_BCRYPT);
test("AuthController Style (DEFAULT)", PASSWORD_DEFAULT);

// Test Database Interaction
echo "\n--- Testing DB Insert/Select ---\n";
$pdo = Database::pdo();
$doc = 'test_debug_' . time();
$pass = '123456';
$hash = password_hash($pass, PASSWORD_BCRYPT);

echo "Inserting user: $doc\n";
$stmt = $pdo->prepare('INSERT INTO users(document,name,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
$now = gmdate('c');
try {
    $stmt->execute([$doc, 'Debug User', $hash, 'admin', 'active', $now, $now]);
    echo "Inserted.\n";
} catch(Exception $e) {
    echo "Insert failed: " . $e->getMessage() . "\n";
    exit;
}

echo "Selecting user...\n";
$stmt = $pdo->prepare('SELECT * FROM users WHERE document=?');
$stmt->execute([$doc]);
$u = $stmt->fetch();
if (!$u) {
    echo "User not found!\n";
    exit;
}
echo "User found. ID: {$u['id']}, Hash from DB: {$u['password_hash']}\n";
echo "Hash Length: " . strlen($u['password_hash']) . "\n";

if (password_verify($pass, $u['password_hash'])) {
    echo "[OK] DB Hash verification success\n";
} else {
    echo "[FAIL] DB Hash verification failed\n";
    echo "This implies DB truncated the hash or encoding issue.\n";
}

// Clean up
$pdo->prepare('DELETE FROM users WHERE id=?')->execute([$u['id']]);
?>
