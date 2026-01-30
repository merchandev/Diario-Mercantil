<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "<pre>";
    echo "<h1>Database Schema Check</h1>";

    $tables = ['users', 'legal_requests', 'legal_payments', 'editions', 'payments'];
    
    foreach ($tables as $t) {
        echo "<h3>Table: $t</h3>";
        try {
            $stmt = $pdo->query("DESCRIBE $t");
            $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($cols as $c) {
                echo " - " . $c['Field'] . " (" . $c['Type'] . ")\n";
            }
        } catch (Exception $e) {
            echo "<span style='color:red'>Table does not exist or error: " . $e->getMessage() . "</span>\n";
        }
    }
    
} catch (Throwable $e) {
    echo "Fatal Error: " . $e->getMessage();
}
