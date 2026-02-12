<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "Checking users table columns...\n";
    
    // Helper to check if column exists
    function colExists($pdo, $col) {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE '$col'");
        return (bool) $stmt->fetch();
    }

    $add = [];
    if (!colExists($pdo, 'state')) $add[] = "ADD COLUMN state VARCHAR(100) NULL AFTER phone";
    if (!colExists($pdo, 'municipality')) $add[] = "ADD COLUMN municipality VARCHAR(100) NULL AFTER state";
    if (!colExists($pdo, 'address')) $add[] = "ADD COLUMN address TEXT NULL AFTER municipality";

    if (!empty($add)) {
        $sql = "ALTER TABLE users " . implode(", ", $add);
        echo "Executing: $sql\n";
        $pdo->exec($sql);
        echo "Columns added successfully.\n";
    } else {
        echo "Columns already exist.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
