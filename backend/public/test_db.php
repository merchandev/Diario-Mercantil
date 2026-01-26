<?php
// backend/public/test_db.php
// Validates connection logic from Database.php

require_once __DIR__."/../src/Database.php";

echo "<h2>Database Connection Test</h2>";
echo "<pre>";

try {
    $pdo = Database::pdo();
    echo "✅ Database connection successful!\n";
    echo "Driver: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";
    echo "Server Version: " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
} catch (Throwable $e) {
    echo "❌ Connection failed.\n";
    echo "Error: " . $e->getMessage() . "\n";
    
    // Check if we can determine why
    echo "\n--- Environment Debug ---\n";
    $conn = getenv("DB_CONNECTION") ?: "sqlite (default)";
    echo "DB_CONNECTION: " . $conn . "\n";
    
    if ($conn === "mysql") {
        echo "DB_HOST: " . (getenv("DB_HOST") ?: "db (default)") . "\n";
        echo "DB_PORT: " . (getenv("DB_PORT") ?: "3306 (default)") . "\n";
        echo "DB_DATABASE: " . (getenv("DB_DATABASE") ?: "diario_mercantil (default)") . "\n";
        echo "DB_USERNAME: " . (getenv("DB_USERNAME") ?: "mercantil_user (default)") . "\n";
        // Do not print password
    } else {
        echo "DB_PATH: " . (getenv("DB_PATH") ?: "storage/database.sqlite (default)") . "\n";
    }
}
echo "</pre>";
