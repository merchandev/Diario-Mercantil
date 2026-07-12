<?php
require_once __DIR__ . '/../Database.php';

class EditionPublicationService {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function publish(int $id): void {
        $now = gmdate('Y-m-d');
        
        $this->pdo->beginTransaction();
        try {
            $edStmt = $this->pdo->prepare('SELECT date, status, file_id, orders_count FROM editions WHERE id=? FOR UPDATE');
            $edStmt->execute([$id]);
            $edition = $edStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$edition) {
                throw new RuntimeException("Edición no encontrada", 404);
            }
            
            if ($edition['status'] !== 'Borrador') {
                throw new RuntimeException("La edición debe estar en estado Borrador para ser publicada.", 409);
            }
            
            if (empty($edition['file_id'])) {
                throw new RuntimeException("Debe subir el PDF definitivo antes de publicar la edición.", 422);
            }

            if ((int)$edition['orders_count'] <= 0) {
                throw new RuntimeException("La edición debe tener al menos una solicitud asociada.", 400);
            }

            $editionDate = $edition['date'] ?: $now;
            
            $lastEdStmt = $this->pdo->query("SELECT MAX(date) FROM editions WHERE status='Publicada'");
            $lastEdDate = $lastEdStmt->fetchColumn();
            if ($lastEdDate && $editionDate <= $lastEdDate) {
                throw new RuntimeException("La fecha de esta edición ($editionDate) debe ser posterior a la última edición publicada ($lastEdDate).", 400);
            }
            
            $stmt = $this->pdo->prepare("SELECT legal_request_id FROM edition_orders WHERE edition_id=?");
            $stmt->execute([$id]);
            $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if ($orderIds) {
                $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
                $statusStmt = $this->pdo->prepare("SELECT COUNT(*) FROM legal_requests WHERE id IN ($inQuery) AND status != 'En trámite'");
                $statusStmt->execute($orderIds);
                if ((int)$statusStmt->fetchColumn() > 0) {
                    throw new RuntimeException("Todas las solicitudes seleccionadas deben estar 'En trámite'.", 400);
                }
                
                $params = array_merge([$editionDate], $orderIds);
                $this->pdo->prepare("UPDATE legal_requests SET status='Publicada', publish_date=? WHERE id IN ($inQuery)")->execute($params);
            }
            
            $this->pdo->prepare("UPDATE editions SET status='Publicada' WHERE id=?")->execute([$id]);
            
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
