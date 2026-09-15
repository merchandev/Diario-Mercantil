<?php
declare(strict_types=1);

require_once __DIR__ . '/EditionIntegrityService.php';
require_once __DIR__ . '/EditorialClock.php';

final class EditionReadinessService
{
    public function __construct(private PDO $pdo) {}

    public function check(int $editionId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM editions WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$editionId]);
        $edition = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$edition) {
            return ['ready' => false, 'blockers' => [['code' => 'NOT_FOUND', 'message' => 'Edición no encontrada.']]];
        }

        $blockers = [];

        if (($edition['status'] ?? '') !== 'Borrador') {
            $blockers[] = ['code' => 'NOT_DRAFT', 'message' => 'La edición debe estar en Borrador.'];
        }

        $integrity = new EditionIntegrityService($this->pdo);
        if (!$integrity->editionFileIsPublishable($edition)) {
            $blockers[] = ['code' => 'MISSING_FINAL_PDF', 'message' => 'Falta cargar el PDF final o es inválido.'];
        }

        $lastDate = $this->pdo->query("SELECT MAX(date) FROM editions WHERE status='Publicada' AND deleted_at IS NULL")->fetchColumn();
        if ($lastDate && ($edition['date'] ?: EditorialClock::today()) < $lastDate) {
            $blockers[] = ['code'=>'INVALID_DATE', 'message'=>'La fecha debe ser igual o posterior a la última edición publicada.'];
        }
        $conflicts = $this->pdo->prepare('SELECT COUNT(*) FROM edition_orders own JOIN edition_orders other ON other.legal_request_id=own.legal_request_id JOIN editions e ON e.id=other.edition_id WHERE own.edition_id=? AND other.edition_id<>? AND e.deleted_at IS NULL');
        $conflicts->execute([$editionId, $editionId]);
        if ((int)$conflicts->fetchColumn() > 0) {
            $blockers[] = ['code'=>'ORDER_CONFLICT', 'message'=>'Hay solicitudes asociadas a otra edición activa.'];
        }

        $ordersStmt = $this->pdo->prepare('SELECT legal_request_id FROM edition_orders WHERE edition_id = ?');
        $ordersStmt->execute([$editionId]);
        $orderIds = $ordersStmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($orderIds) === 0) {
            $blockers[] = ['code' => 'NO_ORDERS', 'message' => 'La edición no tiene solicitudes asociadas.'];
        }

        if (count($orderIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $requestsStmt = $this->pdo->prepare("SELECT id, status, deleted_at FROM legal_requests WHERE id IN ($placeholders)");
            $requestsStmt->execute($orderIds);
            $requests = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($requests) !== count($orderIds)) {
                $blockers[] = ['code' => 'MISSING_ORDERS', 'message' => 'Faltan algunas solicitudes en la base de datos.'];
            }

            foreach ($requests as $req) {
                if (($req['status'] ?? '') !== 'En trámite' || $req['deleted_at'] !== null) {
                    $blockers[] = [
                        'code' => 'INVALID_ORDER_STATUS',
                        'message' => "La solicitud {$req['id']} no está En trámite o fue eliminada."
                    ];
                }
            }
        }

        return [
            'ready' => count($blockers) === 0,
            'blockers' => $blockers
        ];
    }
}
