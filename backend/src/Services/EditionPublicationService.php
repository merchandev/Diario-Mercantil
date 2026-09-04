<?php

declare(strict_types=1);

require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/StoragePath.php';
require_once __DIR__ . '/EditionOrderPdfService.php';
require_once __DIR__ . '/EditionPdfGenerator.php';

final class EditionPublicationService
{
    public function __construct(private PDO $pdo) {}

    public function publish(int $id, int $actorId, ?callable $progressCallback = null): void
    {
        $lockName = 'diario_edition_publish_' . $id;
        $hasAdvisoryLock = false;
        $driver = (string) $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

        try {
            if ($driver === 'mysql') {
                $stmt = $this->pdo->prepare('SELECT GET_LOCK(?, 10)');
                $stmt->execute([$lockName]);
                if ((int) $stmt->fetchColumn() !== 1) {
                    throw new RuntimeException('La edición ya está siendo procesada. Intente nuevamente en unos segundos.', 409);
                }
                $hasAdvisoryLock = true;
            }

            $orderIds = $this->draftOrderIds($id);
            $totalSteps = count($orderIds) + 1;
            $done = 0;
            $orderPdfService = new EditionOrderPdfService($this->pdo);

            foreach ($orderIds as $orderId) {
                if (!$this->hasValidPreparedPdf($id, $orderId)) {
                    $orderPdfService->prepareFromRequest($id, $orderId, $actorId);
                }
                $done++;
                if ($progressCallback) {
                    $progressCallback($done, $totalSteps, "PDF individual de la solicitud {$orderId} listo");
                }
            }

            $this->ensureConsolidatedPdf($id, $orderIds);
            $done++;
            if ($progressCallback) {
                $progressCallback($done, $totalSteps, 'PDF consolidado verificado');
            }

            $this->commitPublication($id, $actorId, $orderIds);
        } finally {
            if ($hasAdvisoryLock) {
                try {
                    $release = $this->pdo->prepare('SELECT RELEASE_LOCK(?)');
                    $release->execute([$lockName]);
                } catch (Throwable $e) {
                    error_log('[edition.publish] No se pudo liberar el bloqueo: ' . $e->getMessage());
                }
            }
        }
    }

    /** @return list<int> */
    private function draftOrderIds(int $editionId): array
    {
        $stmt = $this->pdo->prepare('SELECT status FROM editions WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$editionId]);
        $edition = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$edition) {
            throw new RuntimeException('Edición no encontrada', 404);
        }
        $status = (string) ($edition['status'] ?? '');
        if ($status !== 'Borrador') {
            throw new RuntimeException('La edición debe estar en estado Borrador para ser publicada.', 409);
        }

        $orders = $this->pdo->prepare(
            'SELECT legal_request_id FROM edition_orders WHERE edition_id=? ORDER BY legal_request_id'
        );
        $orders->execute([$editionId]);
        $ids = array_map('intval', $orders->fetchAll(PDO::FETCH_COLUMN));
        if ($ids === []) {
            throw new RuntimeException('La edición debe tener al menos una solicitud asociada.', 400);
        }
        return $ids;
    }

    private function hasValidPreparedPdf(int $editionId, int $requestId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT f.path,f.checksum,eo.publication_checksum FROM edition_orders eo '
            . 'JOIN files f ON f.id=eo.publication_file_id '
            . 'WHERE eo.edition_id=? AND eo.legal_request_id=? AND f.deleted_at IS NULL '
            . "AND f.status IN ('processed','uploaded')"
        );
        $stmt->execute([$editionId, $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['path'])) return false;

        try {
            $path = StoragePath::getFile((string) $row['path']);
        } catch (RuntimeException) {
            return false;
        }
        $checksum = hash_file('sha256', $path);
        $expected = (string) ($row['publication_checksum'] ?: $row['checksum']);
        return $checksum !== false && $expected !== '' && hash_equals($expected, $checksum);
    }

    /** @param list<int> $orderIds */
    private function ensureConsolidatedPdf(int $editionId, array $orderIds): void
    {
        $stmt = $this->pdo->prepare('SELECT file_id FROM editions WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$editionId]);
        $fileId = (int) ($stmt->fetchColumn() ?: 0);
        if ($fileId > 0) {
            $this->validatedFileChecksum($fileId);
            return;
        }

        $relativePath = (new EditionPdfGenerator($this->pdo))->generate($editionId, $orderIds);
        $physicalPath = StoragePath::getFile($relativePath);
        $size = filesize($physicalPath);
        $checksum = hash_file('sha256', $physicalPath);
        if ($size === false || $size < 1 || $checksum === false) {
            @unlink($physicalPath);
            throw new RuntimeException('No se pudo verificar el PDF consolidado generado.', 500);
        }

        $now = gmdate('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $lock = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
            $edition = $this->pdo->prepare(
                'SELECT status,file_id FROM editions WHERE id=? AND deleted_at IS NULL' . $lock
            );
            $edition->execute([$editionId]);
            $current = $edition->fetch(PDO::FETCH_ASSOC);
            if (!$current || ($current['status'] ?? '') !== 'Borrador') {
                throw new RuntimeException('La edición cambió mientras se generaba el consolidado.', 409);
            }
            if ((int) ($current['file_id'] ?? 0) > 0) {
                throw new RuntimeException('La edición ya recibió otro PDF consolidado.', 409);
            }

            $name = basename($relativePath);
            $insert = $this->pdo->prepare(
                'INSERT INTO files(name,path,size,type,checksum,version,status,created_at,updated_at) '
                . 'VALUES(?,?,?,?,?,?,?,?,?)'
            );
            $insert->execute([$name, $relativePath, $size, 'pdf', $checksum, 1, 'processed', $now, $now]);
            $newFileId = (int) $this->pdo->lastInsertId();
            $this->pdo->prepare(
                'UPDATE editions SET file_id=?,file_name=? WHERE id=?'
            )->execute([$newFileId, $name, $editionId]);
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            if (is_file($physicalPath) && !unlink($physicalPath)) {
                error_log('[edition.publish] No se pudo limpiar el consolidado ' . $physicalPath);
            }
            throw $e;
        }
    }

    /** @param list<int> $expectedOrderIds */
    private function commitPublication(int $editionId, int $actorId, array $expectedOrderIds): void
    {
        $today = gmdate('Y-m-d');
        $this->pdo->beginTransaction();
        try {
            $lock = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
            $editionStmt = $this->pdo->prepare(
                'SELECT date,status,file_id FROM editions WHERE id=? AND deleted_at IS NULL' . $lock
            );
            $editionStmt->execute([$editionId]);
            $edition = $editionStmt->fetch(PDO::FETCH_ASSOC);
            if (!$edition) throw new RuntimeException('Edición no encontrada', 404);
            if (($edition['status'] ?? '') !== 'Borrador') {
                throw new RuntimeException('La edición debe estar en estado Borrador para ser publicada.', 409);
            }

            $ordersStmt = $this->pdo->prepare(
                'SELECT legal_request_id,publication_file_id,publication_checksum '
                . 'FROM edition_orders WHERE edition_id=? ORDER BY legal_request_id' . $lock
            );
            $ordersStmt->execute([$editionId]);
            $orderRows = $ordersStmt->fetchAll(PDO::FETCH_ASSOC);
            $orderIds = array_map(static fn(array $row): int => (int) $row['legal_request_id'], $orderRows);
            if ($orderIds !== $expectedOrderIds) {
                throw new RuntimeException('La selección de solicitudes cambió durante la publicación.', 409);
            }
            foreach ($orderRows as $row) {
                if ((int) ($row['publication_file_id'] ?? 0) < 1 || empty($row['publication_checksum'])) {
                    throw new RuntimeException(
                        "La solicitud {$row['legal_request_id']} no tiene un PDF individual preparado.",
                        422
                    );
                }
                if (!$this->hasValidPreparedPdf($editionId, (int) $row['legal_request_id'])) {
                    throw new RuntimeException(
                        "El PDF individual de la solicitud {$row['legal_request_id']} no superó la validación de integridad.",
                        422
                    );
                }
            }

            $fileId = (int) ($edition['file_id'] ?? 0);
            if ($fileId < 1) {
                throw new RuntimeException('La edición no tiene un PDF consolidado válido.', 422);
            }
            $editionChecksum = $this->validatedFileChecksum($fileId);

            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $requestsStmt = $this->pdo->prepare(
                "SELECT id,status,deleted_at FROM legal_requests WHERE id IN ({$placeholders})" . $lock
            );
            $requestsStmt->execute($orderIds);
            $requests = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);
            if (count($requests) !== count($orderIds)) {
                throw new RuntimeException('Algunas solicitudes asociadas ya no existen.', 400);
            }
            foreach ($requests as $request) {
                if (($request['status'] ?? '') !== 'En trámite' || $request['deleted_at'] !== null) {
                    throw new RuntimeException(
                        "La solicitud {$request['id']} debe estar verificada y En trámite.",
                        400
                    );
                }
            }

            $editionDate = (string) ($edition['date'] ?: $today);
            $lastPublished = $this->pdo->query(
                "SELECT MAX(date) FROM editions WHERE status='Publicada' AND deleted_at IS NULL"
            )->fetchColumn();
            if ($lastPublished && $editionDate <= $lastPublished) {
                throw new RuntimeException(
                    "La fecha de esta edición ({$editionDate}) debe ser posterior a la última edición publicada ({$lastPublished}).",
                    400
                );
            }

            $params = array_merge([$editionDate], $orderIds);
            $updateRequests = $this->pdo->prepare(
                "UPDATE legal_requests SET status='Publicada',publish_date=? "
                . "WHERE id IN ({$placeholders}) AND status='En trámite'"
            );
            $updateRequests->execute($params);
            if ($updateRequests->rowCount() !== count($orderIds)) {
                throw new RuntimeException('Error de concurrencia al publicar las solicitudes.', 409);
            }

            $publishedAt = gmdate('Y-m-d H:i:s');
            $this->pdo->prepare(
                "UPDATE editions SET status='Publicada',published_at=?,published_by=?,"
                . 'published_file_checksum=?,orders_count=? WHERE id=?'
            )->execute([$publishedAt, $actorId, $editionChecksum, count($orderIds), $editionId]);

            $audit = $this->pdo->prepare(
                'INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)'
            );
            $audit->execute([$actorId, 'publish_edition', 'edition', $editionId]);
            foreach ($orderIds as $orderId) {
                $audit->execute([$actorId, 'status_changed_to_Publicada', 'legal_request', $orderId]);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    private function validatedFileChecksum(int $fileId): string
    {
        $stmt = $this->pdo->prepare(
            "SELECT path,checksum FROM files WHERE id=? AND deleted_at IS NULL "
            . "AND status IN ('processed','uploaded')"
        );
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$file || empty($file['path'])) {
            throw new RuntimeException('El PDF asociado no existe o no es válido.', 422);
        }
        try {
            $path = StoragePath::getFile((string) $file['path']);
        } catch (RuntimeException $e) {
            throw new RuntimeException('El PDF asociado no se encuentra en el almacenamiento.', 422, $e);
        }
        $checksum = hash_file('sha256', $path);
        if ($checksum === false || !hash_equals((string) $file['checksum'], $checksum)) {
            throw new RuntimeException('La integridad del PDF asociado no coincide.', 422);
        }
        return $checksum;
    }
}
