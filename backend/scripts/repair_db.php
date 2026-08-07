<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    
    // 1. audit_logs
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100) NULL,
        before_data JSON NULL,
        after_data JSON NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "audit_logs table verified/created.\n";
    
    // 2. legal_files
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS legal_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      legal_request_id INT NOT NULL,
      kind VARCHAR(50) NOT NULL,
      file_id INT NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "legal_files table verified/created.\n";
    
    // 3. directory_profiles
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS directory_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phones VARCHAR(255),
      state VARCHAR(100),
      areas TEXT,
      colegio VARCHAR(100),
      socials TEXT,
      inpre_photo_file_id INT,
      profile_photo_file_id INT,
      status VARCHAR(50) DEFAULT 'pendiente',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "directory_profiles table verified/created.\n";
    
    echo "Database repair completed successfully.\n";

} catch (Exception $e) {
    echo "Error repairing database: " . $e->getMessage() . "\n";
}
