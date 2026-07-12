<?php
require_once __DIR__.'/../Database.php';

final class EditionOrderService {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function setOrdersForEdition(int $editionId, array $orderIds): int {
        // Normalizar y eliminar duplicados
        $orderIds = array_unique(array_filter(array_map('intval', $orderIds)));
        
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            // Verificar estado de la edición (FOR UPDATE)
            $stmt = $this->pdo->prepare('SELECT status FROM editions WHERE id=? FOR UPDATE');
            $stmt->execute([$editionId]);
            $editionStatus = $stmt->fetchColumn();

            if ($editionStatus !== 'Borrador') {
                throw new Exception("Solo se pueden modificar las órdenes de una edición en Borrador.", 403);
            }

            // Limpiar relaciones anteriores
            $this->pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$editionId]);
            
            if (count($orderIds) > 0) {
                // Verificar órdenes
                $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
                $stmt = $this->pdo->prepare("
                    SELECT id, status, deleted_at 
                    FROM legal_requests 
                    WHERE id IN ($inQuery) 
                    FOR UPDATE
                ");
                $stmt->execute($orderIds);
                $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($requests) !== count($orderIds)) {
                    throw new Exception("Algunas de las solicitudes no existen.", 400);
                }

                foreach ($requests as $req) {
                    if ($req['deleted_at'] !== null) {
                        throw new Exception("La solicitud {$req['id']} está eliminada.", 400);
                    }
                    if ($req['status'] !== 'En trámite') {
                        throw new Exception("La solicitud {$req['id']} no está En trámite.", 400);
                    }
                }
                
                // Verificar que no pertenezcan a OTRA edición publicada
                $stmt = $this->pdo->prepare("
                    SELECT eo.legal_request_id, e.code 
                    FROM edition_orders eo
                    JOIN editions e ON e.id = eo.edition_id
                    WHERE eo.legal_request_id IN ($inQuery) AND e.id != ?
                ");
                $params = $orderIds;
                $params[] = $editionId;
                $stmt->execute($params);
                $conflicts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (count($conflicts) > 0) {
                    throw new Exception("La solicitud {$conflicts[0]['legal_request_id']} ya pertenece a la edición {$conflicts[0]['code']}.", 400);
                }

                // Insertar
                $ins = $this->pdo->prepare('INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
                foreach ($orderIds as $oid) {
                    $ins->execute([$editionId, $oid]);
                }
            }
            
            // Actualizar contador
            $cnt = (int)$this->pdo->query("SELECT COUNT(*) FROM edition_orders WHERE edition_id=$editionId")->fetchColumn();
            $this->pdo->prepare('UPDATE editions SET orders_count=? WHERE id=?')->execute([$cnt, $editionId]);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
            
            return $cnt;
        } catch (Throwable $e) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
