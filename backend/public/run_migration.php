<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    $sql = file_get_contents(__DIR__ . '/../migrations/06_password_resets_schema.sql');
    $pdo->exec($sql);
    echo "Migración ejecutada exitosamente.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
