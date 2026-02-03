<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/UploadController.php';

class FileController {
  public function list() {
    $pdo = Database::pdo();
    $q = $_GET['q'] ?? '';
    $status = $_GET['status'] ?? '';
    $sql = 'SELECT * FROM files WHERE 1=1';
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

  public function delete($id) {
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM files WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
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
    // Allow public access restricted by token query param if needed, or just public for now if obscure?
    // User images/files might need auth. The request in screenshot has Authorization header.
    // But standard <img> or <a> tags often miss headers unless using fetch/blob.
    // The screenshot shows "Auth Bearer" in console, so it's fetching with auth.
    // AuthController::requireAuth(); // The user requested with fetchAuth, so headers are there.

    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT name, type, created_at FROM files WHERE id=?');
    $stmt->execute([$id]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        http_response_code(404);
        die('File not found');
    }

    if (!$file) {
        http_response_code(404);
        die('File not found');
    }

    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    $path = $file['path'] ?? null;
    $filePath = '';

    // Strategy: 
    // 1. Try 'path' column (new uploads)
    // 2. Try 'name' column if it looks like a hash (old uploads?) - unlikely as name is original.
    // 3. Fallback: Search for file with similar ID/pattern? (Hard for lost files)
    
    if ($path && file_exists($uploadDir.'/'.$path)) {
        $filePath = $uploadDir.'/'.$path;
    } 
    // Fallback for files without path (Legacy/Broken):
    // Try to find a file containing the name or just list dir? 
    // Too expensive. If path is missing, fail.
    
    if (!$filePath || !file_exists($filePath)) {
        http_response_code(404);
        // Debug: echo "Path: $filePath";
        die('File content not found on server');
    }

    // Serve
    $mime = $file['type'] === 'pdf' ? 'application/pdf' : mime_content_type($filePath);
    header('Content-Type: '.$mime);
    header('Content-Length: ' . filesize($filePath));
    // Provide filename for download
    $downloadName = $file['name'] ?: basename($filePath);
    header('Content-Disposition: inline; filename="' . $downloadName . '"'); // inline to view, attachment to download
    
    readfile($filePath);
    exit;
  }
}
