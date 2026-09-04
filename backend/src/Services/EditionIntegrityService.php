<?php

declare(strict_types=1);

require_once __DIR__ . '/../Http/StoragePath.php';

final class EditionIntegrityService
{
    /** @var array<int,bool> */
    private array $availabilityCache = [];

    public function __construct(private PDO $pdo) {}

    public function fileIsAvailable(?int $fileId): bool
    {
        $fileId = (int) ($fileId ?? 0);
        if ($fileId < 1) return false;
        if (array_key_exists($fileId, $this->availabilityCache)) {
            return $this->availabilityCache[$fileId];
        }

        $stmt = $this->pdo->prepare(
            "SELECT path,size FROM files WHERE id=? AND deleted_at IS NULL "
            . "AND status IN ('processed','uploaded')"
        );
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$file || empty($file['path'])) {
            return $this->availabilityCache[$fileId] = false;
        }

        try {
            $path = StoragePath::getFile((string) $file['path']);
            $physicalSize = filesize($path);
            $recordedSize = (int) ($file['size'] ?? 0);
            return $this->availabilityCache[$fileId] = $physicalSize !== false
                && $physicalSize > 0
                && ($recordedSize < 1 || $recordedSize === $physicalSize);
        } catch (RuntimeException) {
            return $this->availabilityCache[$fileId] = false;
        }
    }

    public function fileHasValidChecksum(?int $fileId): bool
    {
        $fileId = (int) ($fileId ?? 0);
        if (!$this->fileIsAvailable($fileId)) return false;

        $stmt = $this->pdo->prepare('SELECT path,checksum FROM files WHERE id=?');
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$file || empty($file['path']) || empty($file['checksum'])) return false;

        try {
            $checksum = hash_file('sha256', StoragePath::getFile((string) $file['path']));
            return $checksum !== false && hash_equals((string) $file['checksum'], $checksum);
        } catch (RuntimeException) {
            return false;
        }
    }

    /** @return list<array<string,mixed>> */
    public function findInvalidPublishedEditions(?int $editionId = null): array
    {
        $sql = "SELECT id,edition_no,code,status,file_id,file_name,published_at,published_by,"
            . "published_file_checksum FROM editions WHERE status='Publicada' AND deleted_at IS NULL";
        $params = [];
        if ($editionId !== null) {
            $sql .= ' AND id=?';
            $params[] = $editionId;
        }
        $sql .= ' ORDER BY id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $invalid = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $edition) {
            if (!$this->fileHasValidChecksum((int) ($edition['file_id'] ?? 0))) {
                $edition['reason'] = empty($edition['file_id'])
                    ? 'missing_file_id'
                    : 'missing_or_invalid_physical_file';
                $invalid[] = $edition;
            }
        }
        return $invalid;
    }

    /** @return array{edition_id:int,requests_requeued:int} */
    public function repairInvalidPublishedEdition(int $editionId, ?int $actorId = null): array
    {
        $driver = (string) $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $lock = $driver === 'sqlite' ? '' : ' FOR UPDATE';
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                "SELECT id,status,file_id FROM editions WHERE id=? AND deleted_at IS NULL{$lock}"
            );
            $stmt->execute([$editionId]);
            $edition = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$edition) throw new RuntimeException('Edición no encontrada.', 404);
            if (($edition['status'] ?? '') !== 'Publicada') {
                throw new RuntimeException('La edición no está publicada.', 409);
            }
            if ($this->fileHasValidChecksum((int) ($edition['file_id'] ?? 0))) {
                throw new RuntimeException('La edición posee un PDF final válido y no requiere reparación.', 409);
            }

            $requests = $this->pdo->prepare(
                "UPDATE legal_requests SET status='En trámite',publish_date=NULL "
                . "WHERE status='Publicada' AND deleted_at IS NULL "
                . 'AND id IN (SELECT legal_request_id FROM edition_orders WHERE edition_id=?)'
            );
            $requests->execute([$editionId]);

            $this->pdo->prepare(
                "UPDATE editions SET status='Borrador',file_id=NULL,file_name=NULL,"
                . 'published_at=NULL,published_by=NULL,published_file_checksum=NULL WHERE id=?'
            )->execute([$editionId]);
            $this->pdo->prepare(
                'INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)'
            )->execute([$actorId, 'repair_invalid_published_edition', 'edition', $editionId]);

            $this->pdo->commit();
            unset($this->availabilityCache[(int) ($edition['file_id'] ?? 0)]);
            return ['edition_id' => $editionId, 'requests_requeued' => $requests->rowCount()];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }
}
