<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "--- Table: legal_requests ---\n";
    $stmt = $pdo->query("DESCRIBE legal_requests");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "{$c['Field']} ({$c['Type']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
