<?php

declare(strict_types=1);

require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/BcvService.php';
require_once __DIR__ . '/PublicationService.php';
require_once __DIR__ . '/PdfInspector.php';

final class DocumentUploadException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 400,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }
}

final class DocumentUploadService
{
    private int $maxBytes;
    private string $uploadDir;

    public function __construct(private PDO $pdo)
    {
        $maxMb = max(1, (int) (getenv('MAX_FILE_MB') ?: 50));
        $this->maxBytes = $maxMb * 1024 * 1024;
        $this->uploadDir = rtrim(
            getenv('UPLOAD_DIR') ?: dirname(__DIR__, 2) . '/storage/uploads',
            '/'
        );
    }

    public function upload(array $user, array $file, int $requestId = 0): array
    {
        $this->assertUser($user);
        $this->validateUpload($file);

        $tmp = (string) $file['tmp_name'];
        $originalName = (string) ($file['name'] ?? 'documento.pdf');
        $size = (int) $file['size'];

        $folios = (new PdfInspector())->pageCount($tmp);
        $checksum = hash_file('sha256', $tmp);
        if ($checksum === false) {
            throw new DocumentUploadException('CHECKSUM_FAILED', 'No se pudo calcular la huella del PDF.', 500);
        }

        $bcvService = new BcvService($this->pdo);
        $publicationService = new PublicationService($this->pdo, $bcvService);
        $pricing = $publicationService->calculatePricing($folios);

        $datePath = gmdate('Y/m/d');
        $targetDir = $this->uploadDir . '/' . $datePath;
        $this->ensureWritableDirectory($targetDir);

        $storageName = bin2hex(random_bytes(16)) . '.pdf';
        $relativePath = $datePath . '/' . $storageName;
        $absolutePath = $targetDir . '/' . $storageName;
        $fileSaved = false;

        try {
            if (!move_uploaded_file($tmp, $absolutePath)) {
                throw new DocumentUploadException('STORAGE_WRITE_FAILED', 'No se pudo guardar el PDF en el almacenamiento.', 500);
            }
            $fileSaved = true;
            @chmod($absolutePath, 0640);

            $this->pdo->beginTransaction();

            $request = null;
            if ($requestId > 0) {
                $request = $this->lockEditableRequest($requestId, $user);
            }

            $now = gmdate('Y-m-d H:i:s');
            $insertFile = $this->pdo->prepare(
                'INSERT INTO files(name,path,size,type,checksum,version,status,owner,created_at,updated_at) '
                . 'VALUES(?,?,?,?,?,?,?,?,?,?)'
            );
            $insertFile->execute([
                $originalName,
                $relativePath,
                $size,
                'pdf',
                $checksum,
                1,
                'processed',
                (string) $user['id'],
                $now,
                $now,
            ]);
            $fileId = (int) $this->pdo->lastInsertId();

            $this->addFileEvent($fileId, 'uploaded', 'PDF recibido y validado.');
            $this->addFileEvent($fileId, 'processed', "PDF inspeccionado correctamente: {$folios} página(s).");

            if ($request) {
                $requestId = (int) $request['id'];
                $this->updateRequestPricing($requestId, $folios, $pricing, $now);
            } else {
                $requestId = $this->createDraftRequest($user, $folios, $pricing, $now);
            }

            $oldFileId = $this->currentDocumentFileId($requestId);

            $this->pdo->prepare(
                "DELETE FROM legal_files WHERE legal_request_id=? AND kind='document_pdf'"
            )->execute([$requestId]);

            $attach = $this->pdo->prepare(
                'INSERT INTO legal_files(legal_request_id,kind,file_id,created_at) VALUES(?,?,?,?)'
            );
            $attach->execute([$requestId, 'document_pdf', $fileId, $now]);

            if ($oldFileId && $oldFileId !== $fileId) {
                $this->pdo->prepare(
                    "UPDATE files SET status='replaced', deleted_at=?, updated_at=? WHERE id=?"
                )->execute([$now, $now, $oldFileId]);
                $this->addFileEvent($oldFileId, 'replaced', 'Archivo sustituido por una versión posterior.');
            }

            $this->pdo->commit();

            return [
                'ok' => true,
                'id' => $requestId,
                'file_id' => $fileId,
                'folios' => $folios,
                'pricing' => $pricing,
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($fileSaved && is_file($absolutePath) && !unlink($absolutePath)) {
                error_log('[document-upload] No se pudo limpiar el archivo tras el rollback: ' . $absolutePath);
            }

            if ($e instanceof DocumentUploadException) {
                throw $e;
            }
            if ($e instanceof PdfInspectionException) {
                throw new DocumentUploadException('INVALID_PDF', $e->getMessage(), 422, $e);
            }

            error_log('[document-upload] ' . get_class($e) . ': ' . $e->getMessage());
            throw new DocumentUploadException(
                'PROCESSING_FAILED',
                'No se pudo completar el procesamiento del documento.',
                500,
                $e
            );
        }
    }

    private function assertUser(array $user): void
    {
        if ((int) ($user['id'] ?? 0) < 1) {
            throw new DocumentUploadException('UNAUTHENTICATED', 'Sesión inválida.', 401);
        }
    }

    private function validateUpload(array $file): void
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                throw new DocumentUploadException('UPLOAD_TOO_LARGE', 'El PDF excede el tamaño máximo permitido.', 413);
            }
            throw new DocumentUploadException('UPLOAD_FAILED', 'La carga del archivo no se completó.', 400);
        }

        $tmp = (string) ($file['tmp_name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        $name = (string) ($file['name'] ?? '');

        if ($tmp === '' || !is_uploaded_file($tmp) || $size < 1) {
            throw new DocumentUploadException('INVALID_UPLOAD', 'El archivo recibido no es una carga válida.', 400);
        }
        if ($size > $this->maxBytes) {
            throw new DocumentUploadException('UPLOAD_TOO_LARGE', 'El PDF excede el tamaño máximo permitido.', 413);
        }
        if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf') {
            throw new DocumentUploadException('INVALID_EXTENSION', 'Solo se permiten archivos PDF.', 415);
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($tmp);
        if (!in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
            throw new DocumentUploadException('INVALID_MIME', 'El contenido no corresponde a un PDF.', 415);
        }

        $handle = fopen($tmp, 'rb');
        if ($handle === false) {
            throw new DocumentUploadException('INVALID_PDF', 'No se pudo leer el PDF.', 422);
        }
        $header = fread($handle, 1024);
        fclose($handle);
        if ($header === false || strpos($header, '%PDF-') === false) {
            throw new DocumentUploadException('INVALID_PDF', 'La firma interna del PDF no es válida.', 422);
        }
    }

    private function ensureWritableDirectory(string $directory): void
    {
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new DocumentUploadException('STORAGE_NOT_WRITABLE', 'No se pudo crear el directorio de carga.', 500);
        }
        if (!is_writable($directory)) {
            throw new DocumentUploadException('STORAGE_NOT_WRITABLE', 'El directorio de carga no tiene permisos de escritura.', 500);
        }
    }

    private function lockEditableRequest(int $requestId, array $user): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id,user_id,status FROM legal_requests WHERE id=? AND deleted_at IS NULL FOR UPDATE'
        );
        $stmt->execute([$requestId]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            throw new DocumentUploadException('REQUEST_NOT_FOUND', 'La solicitud no existe.', 404);
        }
        if (($request['status'] ?? '') !== 'Borrador') {
            throw new DocumentUploadException('REQUEST_NOT_EDITABLE', 'Solo se puede reemplazar el PDF de una solicitud en Borrador.', 409);
        }

        $role = strtolower((string) ($user['role'] ?? ''));
        $isStaff = in_array($role, ['admin', 'staff', 'manager', 'superadmin'], true);
        if (!$isStaff && (int) $request['user_id'] !== (int) $user['id']) {
            throw new DocumentUploadException('FORBIDDEN', 'No tienes acceso a esta solicitud.', 403);
        }

        return $request;
    }

    private function createDraftRequest(array $user, int $folios, array $pricing, string $now): int
    {
        $ivaUsd = round((float) $pricing['price_usd'] * ((float) $pricing['iva_percent'] / 100), 4);
        $stmt = $this->pdo->prepare(
            'INSERT INTO legal_requests('
            . 'status,name,document,date,folios,pub_type,user_id,'
            . 'precio_unitario_usd,subtotal_usd,porcentaje_iva,iva_usd,tasa_bcv,fecha_tasa,total_bs,created_at,updated_at'
            . ') VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            'Borrador',
            (string) ($user['name'] ?? ''),
            (string) ($user['document'] ?? ''),
            gmdate('Y-m-d'),
            $folios,
            'Documento',
            (int) $user['id'],
            (float) $pricing['price_per_folio_usd'],
            (float) $pricing['price_usd'],
            (float) $pricing['iva_percent'],
            $ivaUsd,
            (float) $pricing['bcv_rate'],
            $now,
            (float) $pricing['total_bs'],
            $now,
            $now,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    private function updateRequestPricing(int $requestId, int $folios, array $pricing, string $now): void
    {
        $ivaUsd = round((float) $pricing['price_usd'] * ((float) $pricing['iva_percent'] / 100), 4);
        $stmt = $this->pdo->prepare(
            'UPDATE legal_requests SET folios=?, precio_unitario_usd=?, subtotal_usd=?, porcentaje_iva=?, '
            . 'iva_usd=?, tasa_bcv=?, fecha_tasa=?, total_bs=?, updated_at=? WHERE id=?'
        );
        $stmt->execute([
            $folios,
            (float) $pricing['price_per_folio_usd'],
            (float) $pricing['price_usd'],
            (float) $pricing['iva_percent'],
            $ivaUsd,
            (float) $pricing['bcv_rate'],
            $now,
            (float) $pricing['total_bs'],
            $now,
            $requestId,
        ]);
    }

    private function currentDocumentFileId(int $requestId): ?int
    {
        $stmt = $this->pdo->prepare(
            "SELECT file_id FROM legal_files WHERE legal_request_id=? AND kind='document_pdf' ORDER BY id DESC LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$requestId]);
        $value = $stmt->fetchColumn();
        return $value === false ? null : (int) $value;
    }

    private function addFileEvent(int $fileId, string $type, string $message): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO file_events(file_id,ts,type,message) VALUES(?,NOW(),?,?)'
        );
        $stmt->execute([$fileId, $type, $message]);
    }
}
