<?php
require_once __DIR__.'/../src/Database.php';
try {
    $pdo = Database::pdo();
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage();
}
