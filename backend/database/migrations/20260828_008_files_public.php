<?php
declare(strict_types=1);

return function(PDO $pdo): void {
    try { $pdo->exec("ALTER TABLE files ADD COLUMN is_public TINYINT(1) DEFAULT 0"); } catch (PDOException $e) {}
    try { $pdo->exec("UPDATE files SET is_public = 1 WHERE type IN ('jpg', 'jpeg', 'png', 'webp', 'gif') OR name LIKE '%.jpg' OR name LIKE '%.png'"); } catch (PDOException $e) {}
};
