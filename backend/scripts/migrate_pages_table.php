<?php
// backend/scripts/migrate_pages_table.php
require_once __DIR__ . '/../src/Database.php';

echo "--- MIGRATING PAGES TABLE ---\n";

try {
    $pdo = Database::pdo();
    
    // Check columns
    $stmt = $pdo->query("DESCRIBE pages");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('status', $columns)) {
        echo "➕ Adding 'status' column...\n";
        // Default to 'published'
        $pdo->exec("ALTER TABLE pages ADD COLUMN status VARCHAR(20) DEFAULT 'published' AFTER content");
        
        // Migrate existing data if any
        if (in_array('published', $columns)) {
            echo "🔄 Migrating 'published' boolean to 'status' string...\n";
            $pdo->exec("UPDATE pages SET status = 'published' WHERE published = 1");
            $pdo->exec("UPDATE pages SET status = 'draft' WHERE published = 0");
        }
        
        echo "✅ Migration completed.\n";
    } else {
        echo "✅ Table 'pages' already has 'status' column.\n";
    }

} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
} catch (Throwable $e) {
    echo "❌ General Error: " . $e->getMessage() . "\n";
}
