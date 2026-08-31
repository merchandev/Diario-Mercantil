<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $columnExists = static function (string $column) use ($pdo): bool {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.columns "
            . "WHERE table_schema=DATABASE() AND table_name='settings' AND column_name=?"
        );
        $stmt->execute([$column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    if (!$columnExists('created_at')) {
        $pdo->exec(
            'ALTER TABLE settings ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER value'
        );
    }

    $pdo->exec('UPDATE settings SET created_at=COALESCE(updated_at,NOW()) WHERE created_at IS NULL');
    // Older production rows may contain MySQL's legacy zero-date sentinel.
    // It must be repaired before applying a strict NOT NULL/default contract.
    $pdo->exec('UPDATE settings SET created_at=NOW() WHERE YEAR(created_at)=0');
    $pdo->exec('UPDATE settings SET updated_at=NOW() WHERE YEAR(updated_at)=0');
    $pdo->exec(
        'ALTER TABLE settings '
        . 'MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, '
        . 'MODIFY updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    );

    // Restore public access for banners that were already configured before the
    // is_public contract was introduced. Missing/invalid references are ignored.
    $bannerSettings = $pdo->query(
        "SELECT value FROM settings WHERE `key` IN ('banner_main_1','banner_sidebar','promo_popup')"
    )->fetchAll(PDO::FETCH_COLUMN);
    $makePublic = $pdo->prepare(
        "UPDATE files SET is_public=1,updated_at=NOW() "
        . "WHERE id=? AND deleted_at IS NULL AND LOWER(SUBSTRING_INDEX(name,'.',-1)) "
        . "IN ('jpg','jpeg','png','webp','gif')"
    );
    foreach ($bannerSettings as $value) {
        if (preg_match('~/api/uploads/(\d+)(?:$|[/?#])~', (string) $value, $match)) {
            $makePublic->execute([(int) $match[1]]);
        }
    }
};
