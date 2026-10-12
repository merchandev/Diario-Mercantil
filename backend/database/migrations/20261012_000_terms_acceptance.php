<?php
declare(strict_types=1);
return static function (PDO $pdo): void {
    $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    $pdo->exec($sqlite
        ? 'CREATE TABLE IF NOT EXISTS user_legal_acceptances (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,terms_page_id INTEGER NOT NULL,terms_version TEXT NOT NULL,terms_snapshot TEXT NOT NULL,accepted_at TEXT NOT NULL)'
        : 'CREATE TABLE IF NOT EXISTS user_legal_acceptances (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,terms_page_id INT NOT NULL,terms_version CHAR(64) NOT NULL,terms_snapshot LONGTEXT NOT NULL,accepted_at DATETIME NOT NULL,INDEX idx_legal_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
