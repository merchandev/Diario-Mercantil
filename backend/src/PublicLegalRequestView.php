<?php
declare(strict_types=1);

require_once __DIR__ . '/Services/EditionIntegrityService.php';
require_once __DIR__ . '/Services/EditorialClock.php';

final class PublicLegalRequestView
{
    public static function fetch(
        PDO $pdo,
        string $order
    ): ?array {
        $stmt = $pdo->prepare(
            "SELECT
                e.*, e.code AS edition_code
             FROM legal_requests lr
             JOIN edition_orders eo
               ON eo.legal_request_id = lr.id
             JOIN editions e
               ON e.id = eo.edition_id
             WHERE lr.order_no = ?
               AND lr.status = 'Publicada'
               AND e.status = 'Publicada'
               AND e.deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute([$order]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || $row['date'] > EditorialClock::today() || !(new EditionIntegrityService($pdo))->publishedFileIsValid($row)) return null;
        return ['edition_code' => $row['edition_code']];
    }
}
