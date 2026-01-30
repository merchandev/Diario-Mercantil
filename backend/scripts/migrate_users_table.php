<?php
// backend/scripts/migrate_users_table.php
require_once __DIR__ . '/../src/Database.php';

echo "--- MIGRATING USERS TABLE ---\n";

try {
    $pdo = Database::pdo();
    
    // Get current columns
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $updates = [];

    // Define schema changes
    $schema = [
        'email' => "VARCHAR(100) NULL",
        'phone' => "VARCHAR(20) NULL",
        'status' => "VARCHAR(20) DEFAULT 'active'",
        'person_type' => "VARCHAR(20) DEFAULT 'natural'",
        'role' => "VARCHAR(20) DEFAULT 'solicitante'",
        'created_at' => "DATETIME DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];

    foreach ($schema as $col => $def) {
        if (!in_array($col, $columns)) {
            echo "➕ Adding missing column: $col\n";
            $pdo->exec("ALTER TABLE users ADD COLUMN $col $def");
            $updates[] = $col;
        } else {
            echo "✅ Column exists: $col\n";
        }
    }

    if (empty($updates)) {
        echo "\n🎉 Table is already up to date.\n";
    } else {
        echo "\n🚀 Migration completed. Added: " . implode(', ', $updates) . "\n";
    }

} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
} catch (Throwable $e) {
    echo "❌ General Error: " . $e->getMessage() . "\n";
}
