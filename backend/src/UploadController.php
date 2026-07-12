<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class UploadController {
  private string $baseUploadDir;
  private array $allowedExtensions;
  private array $allowedMimes;
  private int $maxBytes;

  public function __construct() {
    $this->baseUploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($this->baseUploadDir)) mkdir($this->baseUploadDir, 0750, true);
    
    $allowed = getenv('ALLOWED_TYPES') ?: 'csv,xlsx,json,pdf,zip,jpg,jpeg,png,webp,doc,docx';
    $this->allowedExtensions = array_map('trim', explode(',', strtolower($allowed)));
    
    $this->allowedMimes = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'csv' => 'text/csv',
        'json' => 'application/json',
        'zip' => 'application/zip',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    $maxMb = (int) (getenv('MAX_FILE_MB') ?: 500);
    $this->maxBytes = $maxMb * 1024 * 1024;
  }

  public function create() {
    Response::json(['ok' => true, 'message' => 'Direct upload supported at POST /api/files']);
  }

  public function upload() {
    require_once __DIR__.'/AuthController.php';
    $u = AuthController::requireAuth();
    if (!isset($_FILES['files'])) {
      Response::json(['error' => 'No files field'], 400);
      exit;
    }
    
    $pdo = Database::pdo();
    $created = [];
    $datePath = date('Y/m/d');
    $targetDir = $this->baseUploadDir . '/' . $datePath;
    
    if (!is_dir($targetDir)) {
      mkdir($targetDir, 0750, true);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);

    // Process each file independently
    foreach ($_FILES['files']['name'] as $i => $name) {
      $size = (int) $_FILES['files']['size'][$i];
      $tmp  = $_FILES['files']['tmp_name'][$i];
      $err  = (int) $_FILES['files']['error'][$i];
      $type = strtolower(pathinfo($name, PATHINFO_EXTENSION));

      if ($err !== UPLOAD_ERR_OK || !is_uploaded_file($tmp) || $size <= 0) {
        $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Error de carga o archivo vacío'];
        continue;
      }

      if (!in_array($type, $this->allowedExtensions)) {
        $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Extensión no permitida'];
        continue;
      }
      
      if ($size > $this->maxBytes) {
        $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Excede tamaño máximo permitido'];
        continue;
      }

      $mime = finfo_file($finfo, $tmp);
      $expectedMime = $this->allowedMimes[$type] ?? null;
      if ($expectedMime && $mime !== $expectedMime) {
          $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'El tipo MIME no coincide con la extensión'];
          continue;
      }

      // If PDF, strictly check signature
      if ($type === 'pdf') {
          $handle = fopen($tmp, 'r');
          $header = fread($handle, 5);
          fclose($handle);
          if ($header !== '%PDF-') {
              $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Firma de PDF inválida'];
              continue;
          }
      }

      $checksum = hash_file('sha256', $tmp);
      $uniqueName = uniqid('f_', true) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
      $dest = $targetDir . '/' . $uniqueName;
      
      $storagePath = $datePath . '/' . $uniqueName;
      $now = gmdate('c');
      
      // Transaction for THIS file
      $pdo->beginTransaction();
      $fileSaved = false;
      try {
          if (!move_uploaded_file($tmp, $dest)) {
              throw new Exception('No se pudo guardar el archivo físicamente.');
          }
          $fileSaved = true;
          // Set restricted permissions
          chmod($dest, 0640);
          
          $stmt = $pdo->prepare('INSERT INTO files(name,path,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
          $stmt->execute([$name, $storagePath, $size, $type, $checksum, 'uploaded', $now, $now]);
          $fileId = (int) $pdo->lastInsertId();

          $ev = $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)');
          $ev->execute([$fileId, $now, 'uploaded', 'Archivo cargado']);

          $pdo->commit();
          $created[] = ['fileId'=>$fileId,'name'=>$name,'status'=>'uploaded','path'=>$storagePath];
      } catch (Throwable $e) {
          $pdo->rollBack();
          if ($fileSaved && file_exists($dest)) {
              @unlink($dest);
          }
          error_log("File upload failed: " . $e->getMessage());
          $created[] = ['name'=>$name,'status'=>'upload_failed','error'=>'No se pudo procesar el archivo en la base de datos'];
      }
    }
    
    finfo_close($finfo);
    Response::json(['created'=>$created]);
  }
}
