<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    // Historical retirements left their requests marked as published even though
    // no active public edition existed. Requeue only requests with no active edition.
    $pdo->exec(
        "UPDATE legal_requests l SET l.status='En trámite',l.publish_date=NULL,l.edition_code=NULL "
        . "WHERE l.status='Publicada' "
        . 'AND EXISTS (SELECT 1 FROM edition_orders retired_eo '
        . 'JOIN editions retired_e ON retired_e.id=retired_eo.edition_id '
        . 'WHERE retired_eo.legal_request_id=l.id AND retired_e.deleted_at IS NOT NULL) '
        . 'AND NOT EXISTS (SELECT 1 FROM edition_orders active_eo '
        . 'JOIN editions active_e ON active_e.id=active_eo.edition_id '
        . 'WHERE active_eo.legal_request_id=l.id AND active_e.deleted_at IS NULL)'
    );
};
