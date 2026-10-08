<?php
declare(strict_types=1);
return static function (PDO $pdo): void {
    $columns = $pdo->query('SHOW COLUMNS FROM editions')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('cve', $columns, true)) $pdo->exec('ALTER TABLE editions ADD cve VARCHAR(32) NULL');
    $pdo->exec('CREATE TABLE IF NOT EXISTS edition_link_aliases (alias VARCHAR(190) PRIMARY KEY, edition_id INT NOT NULL) ENGINE=InnoDB');
    $rows = $pdo->query('SELECT id,code,cve FROM editions')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        if (empty($row['cve'])) $pdo->prepare('UPDATE editions SET cve=? WHERE id=?')->execute(['DM-'.strtoupper(bin2hex(random_bytes(12))),$row['id']]);
        $pdo->prepare('INSERT IGNORE INTO edition_link_aliases(alias,edition_id) VALUES(?,?)')->execute([$row['code'],$row['id']]);
    }
    $indexes = $pdo->query('SHOW INDEX FROM editions')->fetchAll(PDO::FETCH_ASSOC);
    $names = array_unique(array_column($indexes, 'Key_name'));
    foreach (['idx_code','uq_editions_code','uq_edition_year_number'] as $name) {
        if (in_array($name,$names,true)) $pdo->exec("ALTER TABLE editions DROP INDEX `$name`");
    }
    if (!in_array('active_number',$columns,true)) $pdo->exec('ALTER TABLE editions ADD active_number INT GENERATED ALWAYS AS (IF(deleted_at IS NULL,edition_no,NULL)) STORED');
    if (!in_array('active_code',$columns,true)) $pdo->exec('ALTER TABLE editions ADD active_code VARCHAR(190) GENERATED ALWAYS AS (IF(deleted_at IS NULL,code,NULL)) STORED');
    if (!in_array('uq_editions_cve',$names,true)) $pdo->exec('ALTER TABLE editions ADD UNIQUE KEY uq_editions_cve(cve)');
    if (!in_array('uq_active_year_number',$names,true)) $pdo->exec('ALTER TABLE editions ADD UNIQUE KEY uq_active_year_number(publication_year,active_number)');
    if (!in_array('uq_active_code',$names,true)) $pdo->exec('ALTER TABLE editions ADD UNIQUE KEY uq_active_code(active_code)');
    $pdo->exec('ALTER TABLE editions MODIFY cve VARCHAR(32) NOT NULL');
    $pdo->exec("INSERT IGNORE INTO settings(`key`,value,created_at,updated_at) VALUES('registration_enabled','0',NOW(),NOW())");
};
