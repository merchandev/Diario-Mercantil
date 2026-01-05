<?php
require_once __DIR__ . '/../src/Database.php';

$pdo = Database::pdo();
$stmt = $pdo->query("SELECT id, document, name, role, status, person_type, email, substr(password_hash, 1, 10) as hash_prefix FROM users ORDER BY id DESC");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "ID | Document | Role | Status | Person | HashPrefix | Email\n";
echo str_repeat("-", 80) . "\n";

foreach ($users as $u) {
    printf("%d | %s | %s | %s | %s | %s | %s\n", 
        $u['id'], 
        $u['document'], 
        $u['role'], 
        $u['status'], 
        $u['person_type'], 
        $u['hash_prefix'],
        $u['email']
    );
}
