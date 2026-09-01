<?php

declare(strict_types=1);

require_once __DIR__ . '/../Http/StoragePath.php';

/**
 * Performs the destructive admin-only removal of legal requests and editions.
 *
 * Database rows are removed inside a transaction. Physical files are removed only
 * after the commit and only when their files row is no longer referenced anywhere.
 */
final class PermanentDeletionService
{
    /** @var array<string, bool> */
    private array $tableCache = [];

    /** @var array<string, bool> */
    private array $columnCache = [];

    public function __construct(private PDO $pdo)
    {
    }

    /** @return array<string, mixed> */
    public function deleteLegalRequest(int $requestId, int $actorUserId): array
    {
        $this->assertPositiveId($requestId);
        $physicalPaths = [];

        $this->pdo->beginTransaction();
        try {
            $request = $this->selectOneForUpdate(
                'SELECT id,status FROM legal_requests WHERE id=?',
                [$requestId]
            );
            if (!$request) {
                throw new RuntimeException('Publicación no encontrada.', 404);
            }

            $editionIds = $this->columnValues(
                'SELECT edition_id FROM edition_orders WHERE legal_request_id=?',
                [$requestId]
            );

            $deletedEditions = 0;
            $requeuedRequests = 0;
            foreach ($editionIds as $editionId) {
                $editionResult = $this->deleteEditionRecord((int) $editionId, $requestId);
                if ($editionResult === null) continue;
                $deletedEditions++;
                $requeuedRequests += $editionResult['requests_requeued'];
                $physicalPaths = array_merge($physicalPaths, $editionResult['physical_paths']);
                $this->insertAudit($actorUserId, 'force_delete_edition', 'edition', (int) $editionId);
            }

            $fileIds = array_merge(
                $this->columnValues(
                    'SELECT file_id FROM legal_files WHERE legal_request_id=?',
                    [$requestId]
                ),
                $this->columnValues(
                    'SELECT publication_file_id FROM edition_orders WHERE legal_request_id=? AND publication_file_id IS NOT NULL',
                    [$requestId]
                )
            );

            // Explicit deletes keep this operation reliable even on installations
            // that still have legacy foreign keys without ON DELETE CASCADE.
            $this->pdo->prepare('DELETE FROM edition_orders WHERE legal_request_id=?')->execute([$requestId]);
            if ($this->tableExists('legal_payments')) {
                $this->pdo->prepare('DELETE FROM legal_payments WHERE legal_request_id=?')->execute([$requestId]);
            }
            if ($this->columnExists('payments', 'legal_request_id')) {
                $this->pdo->prepare('DELETE FROM payments WHERE legal_request_id=?')->execute([$requestId]);
            }
            if ($this->tableExists('legal_files')) {
                $this->pdo->prepare('DELETE FROM legal_files WHERE legal_request_id=?')->execute([$requestId]);
            }
            $this->pdo->prepare('DELETE FROM legal_requests WHERE id=?')->execute([$requestId]);

            $physicalPaths = array_merge($physicalPaths, $this->deleteOrphanFiles($fileIds));
            $this->insertAudit($actorUserId, 'force_delete_legal_request', 'legal_request', $requestId);
            $this->pdo->commit();

            $cleanup = $this->removePhysicalFiles($physicalPaths);
            return [
                'ok' => true,
                'deleted' => true,
                'deleted_editions' => $deletedEditions,
                'requests_requeued' => $requeuedRequests,
                'files_deleted' => $cleanup['deleted'],
                'file_cleanup_warnings' => $cleanup['warnings'],
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    /** @return array<string, mixed> */
    public function deleteEdition(int $editionId, int $actorUserId): array
    {
        $this->assertPositiveId($editionId);
        $this->pdo->beginTransaction();
        try {
            $result = $this->deleteEditionRecord($editionId);
            if ($result === null) {
                throw new RuntimeException('Edición no encontrada.', 404);
            }
            $this->insertAudit($actorUserId, 'force_delete_edition', 'edition', $editionId);
            $this->pdo->commit();

            $cleanup = $this->removePhysicalFiles($result['physical_paths']);
            return [
                'ok' => true,
                'deleted' => true,
                'requests_requeued' => $result['requests_requeued'],
                'files_deleted' => $cleanup['deleted'],
                'file_cleanup_warnings' => $cleanup['warnings'],
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * @return array{requests_requeued:int,physical_paths:array<int,string>}|null
     */
    private function deleteEditionRecord(int $editionId, ?int $excludedRequestId = null): ?array
    {
        $edition = $this->selectOneForUpdate(
            'SELECT id,file_id FROM editions WHERE id=?',
            [$editionId]
        );
        if (!$edition) return null;

        $requestIds = $this->columnValues(
            'SELECT legal_request_id FROM edition_orders WHERE edition_id=?',
            [$editionId]
        );
        $fileIds = $this->columnValues(
            'SELECT publication_file_id FROM edition_orders WHERE edition_id=? AND publication_file_id IS NOT NULL',
            [$editionId]
        );
        if (!empty($edition['file_id'])) $fileIds[] = (int) $edition['file_id'];

        $this->pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$editionId]);
        $this->pdo->prepare('DELETE FROM editions WHERE id=?')->execute([$editionId]);

        $requeueIds = array_values(array_filter(
            array_map('intval', $requestIds),
            static fn(int $id): bool => $excludedRequestId === null || $id !== $excludedRequestId
        ));
        $requeued = $this->requeueRequestsWithoutPublishedEdition($requeueIds);
        $paths = $this->deleteOrphanFiles($fileIds);

        return ['requests_requeued' => $requeued, 'physical_paths' => $paths];
    }

    /** @param array<int, int|string> $requestIds */
    private function requeueRequestsWithoutPublishedEdition(array $requestIds): int
    {
        $requestIds = array_values(array_unique(array_map('intval', $requestIds)));
        if (!$requestIds) return 0;

        $assignments = ["status='En trámite'"];
        foreach (['publish_date', 'edition_code', 'edition_no'] as $column) {
            if ($this->columnExists('legal_requests', $column)) $assignments[] = "{$column}=NULL";
        }

        $placeholders = implode(',', array_fill(0, count($requestIds), '?'));
        $sql = 'UPDATE legal_requests SET ' . implode(',', $assignments)
            . " WHERE id IN ({$placeholders}) AND status='Publicada'"
            . ' AND NOT EXISTS (SELECT 1 FROM edition_orders active_eo '
            . 'JOIN editions active_e ON active_e.id=active_eo.edition_id '
            . 'WHERE active_eo.legal_request_id=legal_requests.id '
            . "AND active_e.deleted_at IS NULL AND active_e.status='Publicada')";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($requestIds);
        return $stmt->rowCount();
    }

    /**
     * Deletes file metadata only when no live owner references it.
     *
     * @param array<int, int|string|null> $fileIds
     * @return array<int, string>
     */
    private function deleteOrphanFiles(array $fileIds): array
    {
        $paths = [];
        $ids = array_values(array_unique(array_filter(array_map('intval', $fileIds))));
        foreach ($ids as $fileId) {
            if ($this->fileIsReferenced($fileId)) continue;

            $stmt = $this->pdo->prepare('SELECT path FROM files WHERE id=?');
            $stmt->execute([$fileId]);
            $path = $stmt->fetchColumn();
            if ($path === false) continue;

            if ($this->tableExists('file_events')) {
                $this->pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$fileId]);
            }
            $this->pdo->prepare('DELETE FROM files WHERE id=?')->execute([$fileId]);
            if (is_string($path) && trim($path) !== '') $paths[] = $path;
        }
        return $paths;
    }

    private function fileIsReferenced(int $fileId): bool
    {
        $references = [
            ['legal_files', 'file_id'],
            ['edition_orders', 'publication_file_id'],
            ['editions', 'file_id'],
            ['payment_methods', 'qr_file_id'],
        ];
        foreach ($references as [$table, $column]) {
            if (!$this->columnExists($table, $column)) continue;
            $stmt = $this->pdo->prepare("SELECT 1 FROM {$table} WHERE {$column}=? LIMIT 1");
            $stmt->execute([$fileId]);
            if ($stmt->fetchColumn() !== false) return true;
        }
        return false;
    }

    /** @param array<int, string> $paths @return array{deleted:int,warnings:array<int,string>} */
    private function removePhysicalFiles(array $paths): array
    {
        $deleted = 0;
        $warnings = [];
        foreach (array_values(array_unique($paths)) as $relativePath) {
            try {
                $absolutePath = StoragePath::getFile($relativePath);
                if (@unlink($absolutePath)) {
                    $deleted++;
                } else {
                    $warnings[] = $relativePath;
                    error_log('[permanent-delete] No se pudo borrar el archivo físico: ' . $relativePath);
                }
            } catch (RuntimeException $e) {
                // A missing file is already physically deleted and must not fail the request.
                if (!str_contains($e->getMessage(), 'File not found')) {
                    $warnings[] = $relativePath;
                    error_log('[permanent-delete] ' . $e->getMessage());
                }
            }
        }
        return ['deleted' => $deleted, 'warnings' => $warnings];
    }

    /** @param array<int, mixed> $params @return array<string, mixed>|false */
    private function selectOneForUpdate(string $sql, array $params): array|false
    {
        if ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'sqlite') $sql .= ' FOR UPDATE';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /** @param array<int, mixed> $params @return array<int, mixed> */
    private function columnValues(string $sql, array $params): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    private function insertAudit(int $actorUserId, string $action, string $resourceType, int $resourceId): void
    {
        if (!$this->tableExists('audit_logs')) return;
        $this->pdo->prepare(
            'INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)'
        )->execute([$actorUserId, $action, $resourceType, $resourceId]);
    }

    private function tableExists(string $table): bool
    {
        if (array_key_exists($table, $this->tableCache)) return $this->tableCache[$table];
        if ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $stmt = $this->pdo->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?");
            $stmt->execute([$table]);
        } else {
            $stmt = $this->pdo->prepare(
                'SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?'
            );
            $stmt->execute([$table]);
        }
        return $this->tableCache[$table] = $stmt->fetchColumn() !== false;
    }

    private function columnExists(string $table, string $column): bool
    {
        $key = $table . '.' . $column;
        if (array_key_exists($key, $this->columnCache)) return $this->columnCache[$key];
        if (!$this->tableExists($table)) return $this->columnCache[$key] = false;

        if ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $stmt = $this->pdo->query("PRAGMA table_info({$table})");
            $columns = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            foreach ($columns as $row) {
                if (($row['name'] ?? '') === $column) return $this->columnCache[$key] = true;
            }
            return $this->columnCache[$key] = false;
        }

        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM information_schema.columns '
            . 'WHERE table_schema=DATABASE() AND table_name=? AND column_name=?'
        );
        $stmt->execute([$table, $column]);
        return $this->columnCache[$key] = $stmt->fetchColumn() !== false;
    }

    private function assertPositiveId(int $id): void
    {
        if ($id < 1) throw new RuntimeException('Identificador inválido.', 400);
    }
}
