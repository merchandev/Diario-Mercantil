<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/UploadController.php';

class FileController {
  public function list() {
    $pdo = Database::pdo();
    $q = $_GET['q'] ?? '';
    $status = $_GET['status'] ?? '';
    // SQLite/MySQL compat: if deleted_at doesn't exist yet or is null
    $sql = 'SELECT * FROM files WHERE (deleted_at IS NULL OR deleted_at = "")';
    $params = [];
    if ($q !== '') { $sql .= ' AND name LIKE ?'; $params[] = "%$q%"; }
    if ($status !== '') { $sql .= ' AND status = ?'; $params[] = $status; }
    $sql .= ' ORDER BY id DESC LIMIT 200';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function get($id) {
    $pdo = Database::pdo();
    $f = $pdo->prepare('SELECT * FROM files WHERE id=?');
    $f->execute([$id]);
    $file = $f->fetch(PDO::FETCH_ASSOC);
    if (!$file) Response::json(['error'=>'Not found'], 404);

    $e = $pdo->prepare('SELECT ts,type,message FROM file_events WHERE file_id=? ORDER BY id ASC');
    $e->execute([$id]);
    $events = $e->fetchAll(PDO::FETCH_ASSOC);

    Response::json(['file'=>$file,'events'=>$events]);
  }

  public function retry($id) {
    $pdo = Database::pdo();
    $f = $pdo->prepare('SELECT * FROM files WHERE id=?');
    $f->execute([$id]);
    $file = $f->fetch(PDO::FETCH_ASSOC);
    if (!$file) Response::json(['error'=>'Not found'],404);
    $now = gmdate('c');
    $pdo->prepare('UPDATE files SET status=?, updated_at=? WHERE id=?')
        ->execute(['uploaded',$now,$id]);
    $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)')
        ->execute([$id,$now,'retry','Reintento solicitado']);
    UploadController::bgProcess((int)$id);
    Response::json(['ok'=>true]);
  }

  public function softDelete($id) {
    $pdo = Database::pdo();
    $pdo->prepare('UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function listTrashed() {
    $pdo = Database::pdo();
    // Use try-catch or ensure the column exists, falling back to empty if it fails.
    try {
        $stmt = $pdo->prepare("SELECT * FROM files WHERE deleted_at IS NOT NULL AND deleted_at != '' ORDER BY deleted_at DESC LIMIT 200");
        $stmt->execute();
        Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        // If column doesn't exist yet, return empty
        Response::json(['items'=>[]]);
    }
  }

  public function restore($id) {
    $pdo = Database::pdo();
    $pdo->prepare("UPDATE files SET deleted_at = NULL WHERE id=?")->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function permanentDelete($id) {
    $pdo = Database::pdo();
    $f = $pdo->prepare('SELECT path FROM files WHERE id=?');
    $f->execute([$id]);
    $file = $f->fetch(PDO::FETCH_ASSOC);
    if ($file && $file['path']) {
        $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
        $fullPath = $uploadDir . '/' . $file['path'];
        if (file_exists($fullPath)) @unlink($fullPath);
    }
    
    $pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM files WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function emptyTrash() {
    $pdo = Database::pdo();
    $stmt = $pdo->query("SELECT id, path FROM files WHERE deleted_at IS NOT NULL");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    $count = 0;
    foreach ($files as $f) {
        if ($f['path']) {
            $fullPath = $uploadDir . '/' . $f['path'];
            if (file_exists($fullPath)) @unlink($fullPath);
        }
        $pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$f['id']]);
        $pdo->prepare('DELETE FROM files WHERE id=?')->execute([$f['id']]);
        $count++;
    }
    Response::json(['ok'=>true, 'count'=>$count]);
  }

  public function sse() {
    // Auth via Authorization: Bearer or token query
    AuthController::requireAuth();
    Response::sseHeaders();
    $retry = (int) (getenv('SSE_RETRY_MS') ?: 2000);
    echo "retry: $retry\n\n";
    $pdo = Database::pdo();
    $lastId = 0;
    while (true) {
      $stmt = $pdo->query('SELECT e.id, e.file_id, e.ts, e.type, e.message FROM file_events e ORDER BY e.id DESC LIMIT 20');
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
      foreach (array_reverse($rows) as $row) {
        if ($row['id'] <= $lastId) continue;
        $lastId = $row['id'];
        $data = json_encode($row);
        echo "id: {$row['id']}\n";
        echo "event: file_event\n";
        echo "data: $data\n\n";
      }
      @ob_flush(); @flush();
      sleep(2);
    }
  }


  // Serve raw file content
  public function serve($id) {
    // CORS headers for fetch requests from frontend
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT id, name, path, type, created_at FROM files WHERE id=?');
    $stmt->execute([$id]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        http_response_code(404);
        error_log("File not found in database: ID $id");
        die(json_encode(['error' => 'File not found in database', 'id' => $id]));
    }

    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    $path = $file['path'] ?? null;
    $filePath = '';

    // Strategy: 
    // 1. Try 'path' column (new uploads)
    // 2. Fallback to searching by name pattern
    
    if ($path && file_exists($uploadDir.'/'.$path)) {
        $filePath = $uploadDir.'/'.$path;
    } else {
        // Fallback: try to find file by pattern
        error_log("File path not found: {$uploadDir}/{$path}. File record: " . json_encode($file));
    }
    
    if (!$filePath || !file_exists($filePath)) {
        http_response_code(404);
        $debugInfo = [
            'error' => 'File content not found on server',
            'file_id' => $id,
            'expected_path' => $path,
            'upload_dir' => $uploadDir,
            'full_path_attempted' => $filePath,
            'files_in_dir' => @scandir($uploadDir)
        ];
        error_log("File not found on disk: " . json_encode($debugInfo));
        die(json_encode($debugInfo));
    }

    // Serve with proper CORS headers
    $mime = $file['type'] === 'pdf' ? 'application/pdf' : mime_content_type($filePath);
    header('Content-Type: '.$mime);
    header('Content-Length: ' . filesize($filePath));
    header('Accept-Ranges: bytes');
    
    // Provide filename for download
    $downloadName = $file['name'] ?: basename($filePath);
    header('Content-Disposition: inline; filename="' . $downloadName . '"'); // inline to view, attachment to download
    
    // Prevent caching issues
    header('Cache-Control: public, max-age=3600');
    header('Pragma: public');
    
    readfile($filePath);
    exit;
  }
}
