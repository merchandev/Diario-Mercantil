<?php
require __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "🔌 Checking 'pages' table schema...\n";

    $stmt = $pdo->query("DESCRIBE pages");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "🔍 Columns found: " . implode(", ", $columns) . "\n";

    // 1. Ensure 'body_json' exists
    if (!in_array('body_json', $columns)) {
        if (in_array('body_blocks', $columns)) {
            echo "🔄 Renaming 'body_blocks' to 'body_json'...\n";
            $pdo->exec("ALTER TABLE pages CHANGE COLUMN body_blocks body_json JSON");
        } else {
            echo "➕ Adding 'body_json' column...\n";
            $pdo->exec("ALTER TABLE pages ADD COLUMN body_json JSON AFTER title");
        }
    } else {
        echo "✅ 'body_json' exists.\n";
    }

    // 2. Ensure 'header_html' exists
    if (!in_array('header_html', $columns)) {
        echo "➕ Adding 'header_html' column...\n";
        $pdo->exec("ALTER TABLE pages ADD COLUMN header_html TEXT AFTER title");
    } else {
        echo "✅ 'header_html' exists.\n";
    }

    // 3. Ensure 'footer_html' exists
    if (!in_array('footer_html', $columns)) {
        echo "➕ Adding 'footer_html' column...\n";
        $pdo->exec("ALTER TABLE pages ADD COLUMN footer_html TEXT AFTER body_json");
    } else {
        echo "✅ 'footer_html' exists.\n";
    }

    // 4. Ensure 'status' exists
    if (!in_array('status', $columns)) {
         echo "➕ Adding 'status' column...\n";
         $pdo->exec("ALTER TABLE pages ADD COLUMN status VARCHAR(20) DEFAULT 'published'");
    }

    echo "🚀 Schema fix completed.\n";

} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
} catch (Throwable $e) {
    echo "❌ General Error: " . $e->getMessage() . "\n";
}
