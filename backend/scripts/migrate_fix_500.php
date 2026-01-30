<?php
// backend/scripts/migrate_fix_500.php
require_once __DIR__ . '/../src/Database.php';

echo "--- FIXING MISSING TABLES AND NAMES ---\n";

try {
    $pdo = Database::pdo();
    
    // 1. Rename 'payments' to 'legal_payments' if needed
    try {
        $check = $pdo->query("SHOW TABLES LIKE 'payments'")->fetch();
        if ($check) {
            echo "Renaming 'payments' -> 'legal_payments'...\n";
            $pdo->exec("ALTER TABLE payments RENAME TO legal_payments");
        } else {
            echo "Table 'payments' not found (maybe already renamed).\n";
        }
    } catch (Exception $e) {
        echo "Note on rename: " . $e->getMessage() . "\n";
    }

    // 2. Create 'legal_files' table if missing
    try {
        $check = $pdo->query("SHOW TABLES LIKE 'legal_files'")->fetch();
        if (!$check) {
            echo "Creating 'legal_files' table...\n";
            $sql = "CREATE TABLE legal_files (
              id INT AUTO_INCREMENT PRIMARY KEY,
              legal_request_id INT NOT NULL,
              file_id INT NOT NULL,
              kind VARCHAR(50) NOT NULL,
              created_at DATETIME NOT NULL,
              FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
              FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
              INDEX idx_request (legal_request_id),
              INDEX idx_file (file_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            $pdo->exec($sql);
            echo "Table 'legal_files' created.\n";
        } else {
            echo "Table 'legal_files' already exists.\n";
        }
    } catch (Exception $e) {
        echo "Error creating legal_files: " . $e->getMessage() . "\n";
    }

    echo "--- MIGRATION COMPLETE ---\n";

} catch (PDOException $e) {
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
}
