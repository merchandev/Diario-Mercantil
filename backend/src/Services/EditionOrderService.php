<?php
require_once __DIR__.'/../Database.php';

final class EditionOrderService {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function setOrdersForEdition(int $editionId, array $orderIds): int {
        // Normalizar y eliminar duplicados
        $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $isSqlite = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            $lockClause = $isSqlite ? '' : ' FOR UPDATE';
            // Verificar estado de la edición (FOR UPDATE)
            $stmt = $this->pdo->prepare('SELECT status,file_id FROM editions WHERE id=? AND deleted_at IS NULL' . $lockClause);
            $stmt->execute([$editionId]);
            $edition = $stmt->fetch(PDO::FETCH_ASSOC);
            $editionStatus = $edition['status'] ?? null;

            if ($editionStatus !== 'Borrador') {
                throw new Exception("Solo se pueden modificar las órdenes de una edición en Borrador.", 403);
            }

            if (count($orderIds) > 0) {
                // Verificar órdenes
                $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
                $stmt = $this->pdo->prepare("
                    SELECT id, status, deleted_at 
                    FROM legal_requests 
                    WHERE id IN ($inQuery) $lockClause
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
                    WHERE eo.legal_request_id IN ($inQuery) AND e.id != ? AND e.deleted_at IS NULL
                ");
                $params = $orderIds;
                $params[] = $editionId;
                $stmt->execute($params);
                $conflicts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (count($conflicts) > 0) {
                    throw new Exception("La solicitud {$conflicts[0]['legal_request_id']} ya pertenece a la edición {$conflicts[0]['code']}.", 400);
                }

            }

            // Conservar las asociaciones que no cambiaron para no perder sus PDF individuales.
            $existingStmt = $this->pdo->prepare(
                'SELECT legal_request_id,publication_file_id FROM edition_orders WHERE edition_id=?' . $lockClause
            );
            $existingStmt->execute([$editionId]);
            $existingRows = $existingStmt->fetchAll(PDO::FETCH_ASSOC);
            $existingIds = array_map(static fn(array $row): int => (int) $row['legal_request_id'], $existingRows);
            $removedIds = array_values(array_diff($existingIds, $orderIds));
            $addedIds = array_values(array_diff($orderIds, $existingIds));

            if ($removedIds !== []) {
                $now = gmdate('Y-m-d H:i:s');
                $markFile = $this->pdo->prepare(
                    "UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?"
                );
                foreach ($existingRows as $existingRow) {
                    if (
                        in_array((int) $existingRow['legal_request_id'], $removedIds, true)
                        && (int) ($existingRow['publication_file_id'] ?? 0) > 0
                    ) {
                        $markFile->execute([$now, $now, (int) $existingRow['publication_file_id']]);
                    }
                }
                $delete = $this->pdo->prepare(
                    'DELETE FROM edition_orders WHERE edition_id=? AND legal_request_id=?'
                );
                foreach ($removedIds as $removedId) {
                    $delete->execute([$editionId, $removedId]);
                }
            }

            if ($addedIds !== []) {
                $insert = $this->pdo->prepare(
                    'INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)'
                );
                foreach ($addedIds as $addedId) {
                    $insert->execute([$editionId, $addedId]);
                }
            }

            if (($addedIds !== [] || $removedIds !== []) && (int) ($edition['file_id'] ?? 0) > 0) {
                $now = gmdate('Y-m-d H:i:s');
                $this->pdo->prepare(
                    "UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?"
                )->execute([$now, $now, (int) $edition['file_id']]);
                $this->pdo->prepare(
                    'UPDATE editions SET file_id=NULL,file_name=NULL WHERE id=?'
                )->execute([$editionId]);
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
