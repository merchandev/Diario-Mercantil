<?php
declare(strict_types=1);
return static function (PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS edition_sequences (publication_year INT NOT NULL PRIMARY KEY, last_number INT NOT NULL) ENGINE=InnoDB');
    $pdo->exec('INSERT INTO edition_sequences(publication_year,last_number) SELECT publication_year,MAX(edition_no) FROM editions GROUP BY publication_year ON DUPLICATE KEY UPDATE last_number=GREATEST(edition_sequences.last_number,VALUES(last_number))');
};
