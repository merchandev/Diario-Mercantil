<?php
// Test admin endpoint access to /api/legal
require_once __DIR__.'/../src/Database.php';
require_once __DIR__.'/../src/AuthController.php';

$pdo = Database::pdo();

// Get admin user
$admin = $pdo->query("SELECT * FROM users WHERE document='V12345678' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$admin) {
    echo "❌ Admin user not found\n";
    exit(1);
}

echo "✅ Admin user found: {$admin['name']} (ID: {$admin['id']}, Role: {$admin['role']})\n\n";

// Create a test token for admin (simulate login)
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

// Delete old tokens for this user
$pdo->prepare('DELETE FROM auth_tokens WHERE user_id = ?')->execute([$admin['id']]);

// Create new token
$stmt = $pdo->prepare('INSERT INTO auth_tokens(user_id, token, expires_at, created_at) VALUES(?, ?, ?, ?)');
$stmt->execute([$admin['id'], $token, $expiresAt, date('Y-m-d H:i:s')]);

echo "🔑 Test token created: {$token}\n";
echo "⏰ Expires: {$expiresAt}\n\n";

// Now simulate the API call
$_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";
$_GET = []; // No filters

require_once __DIR__.'/../src/LegalController.php';

$lg = new LegalController();

echo "📡 Calling LegalController->list()...\n\n";

ob_start();
$lg->list();
$response = ob_get_clean();

echo "📦 Response:\n";
$data = json_decode($response, true);
if ($data && isset($data['items'])) {
    echo "   Total items: " . count($data['items']) . "\n\n";
    if (count($data['items']) > 0) {
        echo "   First 5 items:\n";
        foreach (array_slice($data['items'], 0, 5) as $item) {
            echo "   - ID: {$item['id']} | Status: {$item['status']} | Name: {$item['name']} | user_id: {$item['user_id']}\n";
        }
    }
} else {
    echo "   Raw response: {$response}\n";
}

echo "\n✅ Test completed\n";
?>
