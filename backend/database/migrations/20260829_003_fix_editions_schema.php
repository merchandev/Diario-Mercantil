<?php

declare(strict_types=1);

return static function (\PDO $pdo): void {
    // Drop old index if exists
    try { $pdo->exec("ALTER TABLE editions DROP INDEX uq_editions_number"); } catch (\PDOException $e) {}
    
    // Add publication_year if not exists
    try { $pdo->exec("ALTER TABLE editions ADD publication_year SMALLINT UNSIGNED"); } catch (\PDOException $e) {}
    
    // Backfill
    $pdo->exec("UPDATE editions SET publication_year = YEAR(date) WHERE publication_year IS NULL");
    
    // Add new unique indices
    try { $pdo->exec("ALTER TABLE editions ADD UNIQUE KEY uq_edition_year_number (publication_year, edition_no)"); } catch (\PDOException $e) {}
    try { $pdo->exec("ALTER TABLE editions ADD UNIQUE KEY uq_editions_code (code)"); } catch (\PDOException $e) {}
};
