<?php
declare(strict_types=1);

return static function (PDO $pdo): void {
    // Deliberately independent of cascading deletes: preserve editorial history.
    $pdo->exec('CREATE TABLE IF NOT EXISTS edition_archives (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        edition_id INT NOT NULL,
        file_id INT NULL,
        snapshot_json LONGTEXT NOT NULL,
        actor_user_id INT NULL,
        reason VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_edition_archive (edition_id),
        INDEX idx_edition_archive_file (file_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
