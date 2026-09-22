<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Services/EditorialTrashService.php';

// Read-only by default. Applying requires an explicit, reviewed set of editions.
$options = getopt('', ['apply', 'editions:', 'actor:']);
$pdo = Database::pdo();
$rows = $pdo->query("SELECT e.id,e.code,e.deleted_at,COUNT(*) AS requests_to_requeue
    FROM editions e JOIN edition_orders eo ON eo.edition_id=e.id
    JOIN legal_requests l ON l.id=eo.legal_request_id
    WHERE e.deleted_at IS NOT NULL AND l.deleted_at IS NULL AND l.status='Publicada'
      AND NOT EXISTS (SELECT 1 FROM edition_orders active_eo JOIN editions active_e ON active_e.id=active_eo.edition_id
          WHERE active_eo.legal_request_id=l.id AND active_e.deleted_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM edition_archives a WHERE a.edition_id=e.id AND a.reason='trash_edition')
    GROUP BY e.id,e.code,e.deleted_at ORDER BY e.id")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['mode'=>'audit', 'editions'=>$rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
if (!isset($options['apply'])) exit(0);

$rawIds = (string)($options['editions'] ?? '');
$actor = (int)($options['actor'] ?? 0);
if (!preg_match('/^[1-9][0-9]*(,[1-9][0-9]*)*$/', $rawIds) || $actor < 1) {
    fwrite(STDERR, "Uso: --apply --editions=ID,ID --actor=ID_ADMIN. Guarda un respaldo antes de aplicar.\n");
    exit(1);
}
$ids = array_values(array_unique(array_map('intval', explode(',', $rawIds))));
if (array_diff($ids, array_map('intval', array_column($rows, 'id')))) {
    fwrite(STDERR, "Alguna edición no es candidata. Revisa nuevamente la auditoría.\n");
    exit(1);
}
$user = $pdo->prepare("SELECT 1 FROM users WHERE id=? AND role IN ('admin','superadmin')");
$user->execute([$actor]);
if (!$user->fetchColumn()) {
    fwrite(STDERR, "El actor debe ser un administrador existente.\n");
    exit(1);
}
$service = new EditorialTrashService($pdo);
foreach ($ids as $id) {
    try {
        $result = $service->trashEdition($id, $actor, true);
        echo json_encode(['edition_id'=>$id] + $result, JSON_UNESCAPED_UNICODE), PHP_EOL;
    } catch (Throwable $e) {
        fwrite(STDERR, "Edición {$id}: {$e->getMessage()}\n");
        exit(1);
    }
}
