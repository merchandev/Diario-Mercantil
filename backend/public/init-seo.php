<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    $sql = "
    CREATE TABLE IF NOT EXISTS seo_metadata (
      path VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      og_image VARCHAR(255),
      robots VARCHAR(50) DEFAULT 'index, follow',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );
    ";
    $pdo->exec($sql);
    echo "OK";
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
