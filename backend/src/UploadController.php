<?php

declare(strict_types=1);

require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/AuthController.php';

final class UploadController
{
    private string $baseUploadDir;
    private array $allowedExtensions;
    private array $allowedMimes;
    private int $maxBytes;

    public function __construct()
    {
        $this->baseUploadDir = rtrim(
            (string) (getenv('UPLOAD_DIR') ?: dirname(__DIR__) . '/storage/uploads'),
            '/'
        );
        if (!is_dir($this->baseUploadDir)) {
            mkdir($this->baseUploadDir, 0750, true);
        }

        $allowed = (string) (getenv('ALLOWED_TYPES') ?: 'csv,xlsx,json,pdf,zip,jpg,jpeg,png,webp,doc,docx');
        $this->allowedExtensions = array_values(array_filter(array_map(
            static fn(string $v): string => trim(strtolower($v)),
            explode(',', $allowed)
        )));

        $this->allowedMimes = [
            'pdf' => ['application/pdf', 'application/x-pdf'],
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'webp' => ['image/webp'],
            'csv' => ['text/csv', 'text/plain', 'application/csv'],
            'json' => ['application/json', 'text/plain'],
            'zip' => ['application/zip', 'application/x-zip-compressed'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'doc' => ['application/msword'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ];

        $maxMb = max(1, (int) (getenv('MAX_FILE_MB') ?: 50));
        $this->maxBytes = $maxMb * 1024 * 1024;
    }

    public function create(): void
    {
        Response::json(['ok' => true, 'message' => 'Direct upload supported at POST /api/files']);
    }

    public function upload(): void
    {
        $user = AuthController::requireAuth();
        if (!isset($_FILES['files']) || !is_array($_FILES['files']['name'] ?? null)) {
            Response::json(['error' => 'No files field'], 400);
            return;
        }

        $pdo = Database::pdo();
        $created = [];
        $datePath = gmdate('Y/m/d');
        $targetDir = $this->baseUploadDir . '/' . $datePath;
        if (!is_dir($targetDir) && !mkdir($targetDir, 0750, true) && !is_dir($targetDir)) {
            Response::json(['error' => 'storage_not_writable'], 500);
            return;
        }
        if (!is_writable($targetDir)) {
            Response::json(['error' => 'storage_not_writable'], 500);
            return;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);

        foreach ($_FILES['files']['name'] as $i => $name) {
            $name = (string) $name;
            $size = (int) ($_FILES['files']['size'][$i] ?? 0);
            $tmp = (string) ($_FILES['files']['tmp_name'][$i] ?? '');
            $err = (int) ($_FILES['files']['error'][$i] ?? UPLOAD_ERR_NO_FILE);
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

            if ($err !== UPLOAD_ERR_OK || $tmp === '' || !is_uploaded_file($tmp) || $size < 1) {
                $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'Error de carga o archivo vacío'];
                continue;
            }
            if (!in_array($ext, $this->allowedExtensions, true)) {
                $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'Extensión no permitida'];
                continue;
            }
            if ($size > $this->maxBytes) {
                $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'Excede tamaño máximo permitido'];
                continue;
            }

            $mime = (string) $finfo->file($tmp);
            $expected = $this->allowedMimes[$ext] ?? [];
            if ($expected !== [] && !in_array($mime, $expected, true)) {
                $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'El MIME no coincide con la extensión'];
                continue;
            }

            if ($ext === 'pdf') {
                $handle = fopen($tmp, 'rb');
                $header = $handle ? fread($handle, 1024) : false;
                if (is_resource($handle)) {
                    fclose($handle);
                }
                if ($header === false || strpos($header, '%PDF-') === false) {
                    $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'Firma de PDF inválida'];
                    continue;
                }
            }

            $checksum = hash_file('sha256', $tmp);
            if ($checksum === false) {
                $created[] = ['name' => $name, 'status' => 'validation_failed', 'error' => 'No se pudo calcular checksum'];
                continue;
            }

            $safeExt = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'bin';
            $storageName = bin2hex(random_bytes(16)) . '.' . $safeExt;
            $relativePath = $datePath . '/' . $storageName;
            $absolutePath = $targetDir . '/' . $storageName;
            $saved = false;

            try {
                if (!move_uploaded_file($tmp, $absolutePath)) {
                    throw new RuntimeException('No se pudo guardar el archivo físicamente.');
                }
                $saved = true;
                @chmod($absolutePath, 0640);

                $pdo->beginTransaction();
                $now = gmdate('Y-m-d H:i:s');
                $stmt = $pdo->prepare(
                    'INSERT INTO files(name,path,size,type,checksum,version,status,owner,created_at,updated_at) '
                    . 'VALUES(?,?,?,?,?,?,?,?,?,?)'
                );
                $stmt->execute([
                    $name,
                    $relativePath,
                    $size,
                    $safeExt,
                    $checksum,
                    1,
                    'uploaded',
                    (string) $user['id'],
                    $now,
                    $now,
                ]);
                $fileId = (int) $pdo->lastInsertId();

                $event = $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,NOW(),?,?)');
                $event->execute([$fileId, 'uploaded', 'Archivo cargado']);
                $pdo->commit();

                $created[] = [
                    'fileId' => $fileId,
                    'name' => $name,
                    'status' => 'uploaded',
                    'path' => $relativePath,
                ];
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                if ($saved && is_file($absolutePath) && !unlink($absolutePath)) {
                    error_log('[file-upload] No se pudo limpiar el archivo tras el rollback: ' . $absolutePath);
                }
                error_log('[file-upload] ' . $e->getMessage());
                $created[] = ['name' => $name, 'status' => 'upload_failed', 'error' => 'No se pudo procesar el archivo'];
            }
        }

        Response::json(['created' => $created]);
    }
}
