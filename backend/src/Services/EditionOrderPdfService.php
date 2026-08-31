<?php

declare(strict_types=1);

require_once __DIR__ . '/../Http/StoragePath.php';
require_once __DIR__ . '/PdfInspector.php';

final class EditionOrderPdfService
{
    private string $uploadDir;
    private int $maxBytes;

    public function __construct(private PDO $pdo)
    {
        $this->uploadDir = StoragePath::getUploadsDir();
        $this->maxBytes = max(1, (int) (getenv('MAX_FILE_MB') ?: 50)) * 1024 * 1024;
    }

    /** @return array<string, mixed> */
    public function prepareFromRequest(int $editionId, int $requestId, int $actorId): array
    {
        $row = $this->lockDraftOrder($editionId, $requestId);
        $stmt = $this->pdo->prepare(
            "SELECT f.path,f.name FROM legal_files lf "
            . "JOIN files f ON f.id=lf.file_id "
            . "WHERE lf.legal_request_id=? AND lf.kind='document_pdf' "
            . "AND f.deleted_at IS NULL ORDER BY lf.id DESC LIMIT 1"
        );
        $stmt->execute([$requestId]);
        $source = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$source || empty($source['path'])) {
            throw new RuntimeException("La solicitud {$requestId} no tiene un PDF de documento válido.", 422);
        }

        try {
            $sourcePath = StoragePath::getFile((string) $source['path']);
            (new PdfInspector())->pageCount($sourcePath);
        } catch (Throwable $e) {
            throw new RuntimeException(
                "El PDF de origen de la solicitud {$requestId} no existe o no es válido.",
                422,
                $e
            );
        }
        $originalName = trim((string) ($source['name'] ?? '')) ?: "solicitud-{$requestId}.pdf";

        return $this->storeFile(
            $editionId,
            $requestId,
            $actorId,
            $sourcePath,
            $originalName,
            'generated',
            (int) ($row['publication_file_id'] ?? 0),
            false
        );
    }

    /** @return array<string, mixed> */
    public function upload(int $editionId, int $requestId, int $actorId, array $file): array
    {
        $row = $this->lockDraftOrder($editionId, $requestId);
        $this->validateUpload($file);
        $tmp = (string) $file['tmp_name'];
        try {
            (new PdfInspector())->pageCount($tmp);
        } catch (Throwable $e) {
            throw new RuntimeException('El PDF individual cargado no pudo ser inspeccionado.', 422, $e);
        }

        return $this->storeFile(
            $editionId,
            $requestId,
            $actorId,
            $tmp,
            (string) ($file['name'] ?? "solicitud-{$requestId}.pdf"),
            'uploaded',
            (int) ($row['publication_file_id'] ?? 0),
            true
        );
    }

    /** @return array<string, mixed> */
    public function get(int $editionId, int $requestId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT eo.publication_file_id,eo.publication_file_name,eo.publication_checksum,'
            . 'eo.publication_source,eo.publication_prepared_at,f.path,f.status '
            . 'FROM edition_orders eo LEFT JOIN files f ON f.id=eo.publication_file_id '
            . 'WHERE eo.edition_id=? AND eo.legal_request_id=?'
        );
        $stmt->execute([$editionId, $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('La solicitud no pertenece a esta edición.', 404);
        }
        if (empty($row['publication_file_id']) || empty($row['path'])) {
            throw new RuntimeException('La solicitud todavía no tiene un PDF individual preparado.', 404);
        }
        return $row;
    }

    /** @return array<string, mixed> */
    private function lockDraftOrder(int $editionId, int $requestId): array
    {
        $lock = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
        $stmt = $this->pdo->prepare(
            'SELECT eo.publication_file_id,e.file_id AS edition_file_id,e.status,l.status AS request_status '
            . 'FROM edition_orders eo JOIN editions e ON e.id=eo.edition_id '
            . 'JOIN legal_requests l ON l.id=eo.legal_request_id '
            . 'WHERE eo.edition_id=? AND eo.legal_request_id=? AND e.deleted_at IS NULL' . $lock
        );
        $stmt->execute([$editionId, $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('La solicitud no pertenece a esta edición.', 404);
        }
        if (($row['status'] ?? '') !== 'Borrador') {
            throw new RuntimeException('Solo se pueden preparar archivos de una edición en Borrador.', 409);
        }
        if (($row['request_status'] ?? '') !== 'En trámite') {
            throw new RuntimeException("La solicitud {$requestId} debe estar En trámite.", 409);
        }
        return $row;
    }

    /** @return array<string, mixed> */
    private function storeFile(
        int $editionId,
        int $requestId,
        int $actorId,
        string $sourcePath,
        string $originalName,
        string $source,
        int $oldFileId,
        bool $uploadedFile
    ): array {
        $relativeDir = 'editions/' . $editionId . '/requests/' . $requestId;
        $absoluteDir = $this->uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDir);
        if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0750, true) && !is_dir($absoluteDir)) {
            throw new RuntimeException('No se pudo crear el directorio para el PDF individual.', 500);
        }
        if (!is_writable($absoluteDir)) {
            throw new RuntimeException('El directorio de PDF individuales no permite escritura.', 500);
        }

        $storageName = bin2hex(random_bytes(16)) . '.pdf';
        $relativePath = $relativeDir . '/' . $storageName;
        $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $storageName;
        $stored = $uploadedFile
            ? move_uploaded_file($sourcePath, $absolutePath)
            : copy($sourcePath, $absolutePath);
        if (!$stored) {
            throw new RuntimeException('No se pudo almacenar el PDF individual.', 500);
        }
        @chmod($absolutePath, 0640);

        $checksum = hash_file('sha256', $absolutePath);
        $size = filesize($absolutePath);
        if ($checksum === false || $size === false || $size < 1) {
            @unlink($absolutePath);
            throw new RuntimeException('No se pudo verificar el PDF individual almacenado.', 500);
        }

        $safeOriginalName = trim(basename(str_replace('\\', '/', $originalName)));
        if ($safeOriginalName === '') $safeOriginalName = "solicitud-{$requestId}.pdf";
        $now = gmdate('Y-m-d H:i:s');
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) $this->pdo->beginTransaction();
        try {
            // Revalidate after the filesystem operation so a concurrent edition change cannot attach a stale file.
            $current = $this->lockDraftOrder($editionId, $requestId);
            $insert = $this->pdo->prepare(
                'INSERT INTO files(name,path,size,type,checksum,version,status,owner,created_at,updated_at) '
                . 'VALUES(?,?,?,?,?,?,?,?,?,?)'
            );
            $insert->execute([
                $safeOriginalName, $relativePath, $size, 'pdf', $checksum, 1,
                'processed', (string) $actorId, $now, $now,
            ]);
            $fileId = (int) $this->pdo->lastInsertId();

            $update = $this->pdo->prepare(
                'UPDATE edition_orders SET publication_file_id=?,publication_file_name=?,'
                . 'publication_checksum=?,publication_source=?,publication_prepared_at=?,'
                . 'publication_updated_at=? WHERE edition_id=? AND legal_request_id=?'
            );
            $update->execute([
                $fileId, $safeOriginalName, $checksum, $source, $now, $now, $editionId, $requestId,
            ]);
            if ($update->rowCount() !== 1) {
                throw new RuntimeException('No se pudo asociar el PDF individual a la solicitud.', 409);
            }

            $previousFileId = (int) ($current['publication_file_id'] ?? $oldFileId);
            if ($previousFileId > 0 && $previousFileId !== $fileId) {
                $this->pdo->prepare(
                    "UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?"
                )->execute([$now, $now, $previousFileId]);
            }
            $editionFileId = (int) ($current['edition_file_id'] ?? 0);
            if ($editionFileId > 0) {
                $this->pdo->prepare(
                    "UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?"
                )->execute([$now, $now, $editionFileId]);
                $this->pdo->prepare(
                    'UPDATE editions SET file_id=NULL,file_name=NULL WHERE id=? AND status=?'
                )->execute([$editionId, 'Borrador']);
            }
            $this->pdo->prepare(
                'INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)'
            )->execute([$actorId, 'prepare_edition_order_pdf', 'legal_request', $requestId]);

            if ($ownsTransaction) $this->pdo->commit();
            return [
                'ok' => true,
                'file_id' => $fileId,
                'file_name' => $safeOriginalName,
                'checksum' => $checksum,
                'source' => $source,
                'prepared_at' => $now,
            ];
        } catch (Throwable $e) {
            if ($ownsTransaction && $this->pdo->inTransaction()) $this->pdo->rollBack();
            if (is_file($absolutePath) && !unlink($absolutePath)) {
                error_log('[edition-order-pdf] No se pudo limpiar ' . $absolutePath);
            }
            throw $e;
        }
    }

    private function validateUpload(array $file): void
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            throw new RuntimeException('La carga del PDF individual no se completó.', 400);
        }
        $tmp = (string) ($file['tmp_name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        $name = (string) ($file['name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp) || $size < 1) {
            throw new RuntimeException('El archivo recibido no es una carga válida.', 400);
        }
        if ($size > $this->maxBytes) {
            throw new RuntimeException('El PDF individual excede el tamaño máximo permitido.', 413);
        }
        if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf') {
            throw new RuntimeException('Solo se permiten archivos PDF.', 415);
        }
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($tmp);
        if (!in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
            throw new RuntimeException('El archivo no contiene un PDF válido.', 415);
        }
        $handle = fopen($tmp, 'rb');
        $header = $handle ? fread($handle, 1024) : false;
        if ($handle) fclose($handle);
        if ($header === false || strpos($header, '%PDF-') === false) {
            throw new RuntimeException('La firma interna del PDF no es válida.', 422);
        }
    }
}
