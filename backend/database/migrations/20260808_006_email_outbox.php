<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS email_outbox (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            payload_json TEXT NOT NULL,
            status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
            attempts INT DEFAULT 0,
            next_attempt_at DATETIME,
            last_error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
};
