<?php
// backend/scripts/migrate_fix_500.php
require_once __DIR__ . '/../src/Database.php';

echo "--- FIXING TABLE SCHEMA MISMATCHES ---\n";

try {
    $pdo = Database::pdo();
    
    // 1. Drop incorrect tables if they exist
    // We drop 'payments' (from CLEAN_INIT) and 'legal_payments' (if it was renamed but wrong)
    echo "Dropping incorrect tables...\n";
    $pdo->exec("DROP TABLE IF EXISTS payments");
    $pdo->exec("DROP TABLE IF EXISTS legal_payments");

    // 2. Create 'legal_payments' with the text-based schema the Code expects
    // Code uses: ref, date, bank, type, amount_bs, status
    echo "Creating correct 'legal_payments' table...\n";
    $sql = "CREATE TABLE legal_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        legal_request_id INT NOT NULL,
        ref VARCHAR(255),
        date DATE,
        bank VARCHAR(100),
        type VARCHAR(50),
        amount_bs DECIMAL(12,2),
        status VARCHAR(50) DEFAULT 'Pendiente',
        created_at DATETIME NOT NULL,
        FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
        INDEX idx_request (legal_request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $pdo->exec($sql);
    echo "Table 'legal_payments' created successfully.\n";

    // 3. Create 'legal_files' table if missing
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
