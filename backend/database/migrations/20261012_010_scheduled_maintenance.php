<?php
declare(strict_types=1);
return static function (PDO $pdo): void {
    $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    $pdo->exec($sqlite
        ? 'CREATE TABLE IF NOT EXISTS maintenance_sessions (token_hash TEXT PRIMARY KEY, credential_type TEXT NOT NULL, credential_id INTEGER NOT NULL, credential_hash TEXT NOT NULL, generation TEXT NOT NULL, expires_at INTEGER NOT NULL)'
        : 'CREATE TABLE IF NOT EXISTS maintenance_sessions (token_hash CHAR(64) PRIMARY KEY, credential_type VARCHAR(20) NOT NULL, credential_id BIGINT UNSIGNED NOT NULL, credential_hash CHAR(64) NOT NULL, generation CHAR(32) NOT NULL, expires_at BIGINT NOT NULL, INDEX idx_maintenance_expiry(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $pdo->exec($sqlite
        ? 'CREATE TABLE IF NOT EXISTS maintenance_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_hash TEXT NOT NULL, attempted_at INTEGER NOT NULL)'
        : 'CREATE TABLE IF NOT EXISTS maintenance_attempts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ip_hash CHAR(64) NOT NULL, attempted_at BIGINT NOT NULL, INDEX idx_maintenance_attempt(ip_hash,attempted_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
