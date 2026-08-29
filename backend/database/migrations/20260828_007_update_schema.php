<?php
declare(strict_types=1);

return function(PDO $pdo): void {
    $stmt = $pdo->query("SELECT * FROM legal_requests LIMIT 0");
    $cols = array_keys($stmt->fetch(PDO::FETCH_ASSOC) ?: []);
    if (empty($cols)) {
        // Fallback for empty table
        $stmt2 = $pdo->query("EXPLAIN legal_requests");
        if ($stmt2) {
            $cols = $stmt2->fetchAll(PDO::FETCH_COLUMN, 0); // MySQL EXPLAIN gives Field as col 0
        }
    }
    
    // Actually, let's just catch exceptions if column exists
    try { $pdo->exec("ALTER TABLE legal_requests ADD COLUMN edition_code VARCHAR(20) DEFAULT NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE legal_requests ADD COLUMN edition_no INT DEFAULT NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE editions ADD COLUMN published_by_name VARCHAR(255) DEFAULT NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE editions ADD COLUMN published_at DATETIME DEFAULT NULL"); } catch (PDOException $e) {}
};

