<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    $stmt = $pdo->prepare("SELECT id, avatar_updated_at FROM users WHERE document = 'merchandev' LIMIT 1");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "User: "; print_r($user);

    if ($user && $user['avatar_updated_at']) {
        $lastDate = new DateTime($user['avatar_updated_at']);
        $now = new DateTime();
        $diff = $now->diff($lastDate);
        echo "\nDiff: "; print_r($diff);
        if ($diff->y == 0 && $diff->m < 3) {
            echo "\nBlocked by 3 month rule!\n";
        }
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage();
}
