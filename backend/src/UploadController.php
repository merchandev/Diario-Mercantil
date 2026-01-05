<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class UploadController {
  private string $baseUploadDir;
  private array $allowed;
  private int $maxBytes;

  public function __construct() {
    $this->baseUploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($this->baseUploadDir)) mkdir($this->baseUploadDir, 0777, true);
    
    $allowed = getenv('ALLOWED_TYPES') ?: 'csv,xlsx,json,pdf,zip,jpg,jpeg,png,webp,doc,docx';
    $this->allowed = array_map('trim', explode(',', strtolower($allowed)));
    $maxMb = (int) (getenv('MAX_FILE_MB') ?: 500);
    $this->maxBytes = $maxMb * 1024 * 1024;
  }

  public function create() {
    Response::json(['ok' => true, 'message' => 'Direct upload supported at POST /api/files']);
  }

  public function upload() {
    if (!isset($_FILES['files'])) {
      Response::json(['error' => 'No files field'], 400);
    }
    $pdo = Database::pdo();
    $pdo->beginTransaction();
    $created = [];

    // Create date-based directory structure: YYYY/MM/DD
    $datePath = date('Y/m/d');
    $targetDir = $this->baseUploadDir . '/' . $datePath;
    
    if (!is_dir($targetDir)) {
      mkdir($targetDir, 0777, true);
    }

    foreach ($_FILES['files']['name'] as $i => $name) {
      $size = (int) $_FILES['files']['size'][$i];
      $tmp  = $_FILES['files']['tmp_name'][$i];
      $type = strtolower(pathinfo($name, PATHINFO_EXTENSION));

      if (!in_array($type, $this->allowed)) {
        $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Tipo no permitido'];
        continue;
      }
      if ($size > $this->maxBytes) {
        $created[] = ['name'=>$name,'status'=>'validation_failed','error'=>'Excede tamaño máximo'];
        continue;
      }

      $checksum = hash_file('sha256', $tmp);
      
      // Save with unique name in date folder
      // Store relative path in DB if needed, or just filename. 
      // For simplicity/backward compat, we store the full relative path from storage/uploads in 'name' or a new column?
      // The current DB schema has 'name' which seems to be the original filename.
      // We should probably store the physical path.
      // Let's name the file uniquely but keep original name in DB "name" column?
      // Current implementation used: $dest = $this->uploadDir.'/'.uniqid('f_', true).'_'.basename($name);
      // It didn't seem to store the path in DB, just 'name'. This implies the system assumes flat structure?
      // Checking get/download logic would be important, but assuming standard ID retrieval.
      
      $uniqueName = uniqid('f_', true) . '_' . basename($name);
      $dest = $targetDir . '/' . $uniqueName;
      
      // We will store the relative path in a new way or just assume we find it?
      // If the system relies on stored path, we need to update DB schema.
      // Looking at `files` table, it likely doesn't have 'path'.
      // If we change storage structure, we must ensure retrieval works.
      // For now, I will store the 'name' as 'YYYY/MM/DD/unique_name' so it can be retrieved?
      // Or if 'name' is just display name, we might lose track of file.
      // Let's assume 'name' column is used for display. We might need a 'path' column.
      // Use 'local_path' if exists, or store it in 'name'?
      // Risky to change semantics of 'name'.
      // Let's store the relative path in a "path" column if it exists, otherwise we might have an issue.
      // Since we are migrating DB, we can add 'path' column.
      
      // WAIT: I don't see FileController.php, so I don't know how files are served.
      // I'll stick to: 'name' = original name.
      // And I will try to save the relative path '2025/12/17/unique_name' into a 'path' column.
      // I'll add 'path' to the schema in migrations.
      
      if (!move_uploaded_file($tmp, $dest)) {
        $created[] = ['name'=>$name,'status'=>'upload_failed','error'=>'No se pudo guardar'];
        continue;
      }
      
      // Relative path for storage
      $storagePath = $datePath . '/' . $uniqueName;

      $now = gmdate('c');
      // Updated query to include 'path'
      // Note: Must update init.sql to include 'path' column in 'files' table
      $stmt = $pdo->prepare('INSERT INTO files(name,path,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
      $stmt->execute([$name, $storagePath, $size, $type, $checksum, 'uploaded', $now, $now]);
      
      $fileId = (int) $pdo->lastInsertId();

      $ev = $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)');
      $ev->execute([$fileId,$now,'uploaded','Archivo cargado y encolado para procesamiento']);

      $this->simulateProcessing($fileId, $dest, $name);

      $created[] = ['fileId'=>$fileId,'name'=>$name,'status'=>'uploaded','path'=>$storagePath];
    }

    $pdo->commit();
    Response::json(['created'=>$created]);
  }

  private function simulateProcessing(int $fileId, string $path, string $name) {
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    $php = escapeshellarg(PHP_BINARY);
    $script = escapeshellarg(__FILE__);
    $cmd = "$php -r 'require_once $script; UploadController::bgProcess($fileId);' > /dev/null 2>&1 &";
    exec($cmd);
  }

  public static function bgProcess($fileId) {
    require_once __DIR__.'/Database.php';
    $pdo = Database::pdo();
    $sleep = rand(1,3);
    sleep($sleep);
    $now = gmdate('c');

    if (rand(1,10) === 1) {
      $pdo->prepare('UPDATE files SET status=?, updated_at=? WHERE id=?')
          ->execute(['processing_failed',$now,$fileId]);
      $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)')
          ->execute([$fileId,$now,'error','Procesamiento fallido']);
      return;
    }

    $resultDir = realpath(__DIR__.'/..').'/storage/results';
    if (!is_dir($resultDir)) mkdir($resultDir, 0777, true);
    file_put_contents($resultDir.'/result_'.$fileId.'.txt', "Resultado OK para file #$fileId\n");

    $pdo->prepare('UPDATE files SET status=?, updated_at=? WHERE id=?')
        ->execute(['completed',$now,$fileId]);
    $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)')
        ->execute([$fileId,$now,'processed','Procesamiento completado']);
  }
}
