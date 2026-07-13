<?php
declare(strict_types=1);

final class PublicLegalRequestView
{
    public static function fetch(
        PDO $pdo,
        string $order
    ): ?array {
        $stmt = $pdo->prepare(
            "SELECT
                lr.order_no,
                lr.name,
                lr.pub_type,
                lr.publish_date,
                lr.folios,
                e.edition_no,
                e.date AS edition_date,
                e.code AS verification_code
             FROM legal_requests lr
             JOIN edition_orders eo
               ON eo.legal_request_id = lr.id
             JOIN editions e
               ON e.id = eo.edition_id
             WHERE (lr.order_no = ? OR lr.id = ?)
               AND lr.status = 'Publicada'
               AND e.status = 'Publicada'
             LIMIT 1"
        );
        $stmt->execute([$order, $order]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }
}
