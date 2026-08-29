<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/UploadController.php';
require_once __DIR__."/Http/StoragePath.php";

class FileController {
  private const PUBLIC_MEDIA_SETTINGS = ['banner_main_1', 'banner_sidebar', 'promo_popup'];

  private function requireAdmin() {
      require_once __DIR__.'/AuthController.php';
      $u = AuthController::requireAuth();
      if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
          Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
          exit;
      }
      return $u;
  }

  public function list() {
    $this->requireAdmin();
    $pdo = Database::pdo();
    $q = $_GET['q'] ?? '';
    $status = $_GET['status'] ?? '';
    
    $params = [];
    $baseSql = 'FROM files WHERE 1=1';
    
    if ($q !== '') { $baseSql .= ' AND name LIKE ?'; $params[] = "%$q%"; }
    if ($status !== '') { $baseSql .= ' AND status = ?'; $params[] = $status; }
    
    try {
        $sql = "SELECT * $baseSql AND (deleted_at IS NULL OR deleted_at = '') ORDER BY id DESC LIMIT 200";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        // Fallback if deleted_at column does not exist yet
        $sqlFallback = "SELECT * $baseSql ORDER BY id DESC LIMIT 200";
        $stmt = $pdo->prepare($sqlFallback);
        $stmt->execute($params);
        Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
  }

  public function get($id) {
    $this->requireAdmin();
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
    $this->requireAdmin();
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
    $this->requireAdmin();
    $pdo = Database::pdo();
    $references = $this->publicSettingReferences($pdo, (int)$id);
    if ($references) {
      Response::json([
        'error'=>'file_in_use',
        'message'=>'No se puede eliminar este archivo porque actualmente está siendo utilizado como banner.',
        'settings'=>$references,
      ], 409);
    }
    $pdo->prepare('UPDATE files SET deleted_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function listTrashed() {
    $this->requireAdmin();
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
    $this->requireAdmin();
    $pdo = Database::pdo();
    $pdo->prepare("UPDATE files SET deleted_at = NULL WHERE id=?")->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function permanentDelete($id) {
    $this->requireAdmin();
    $pdo = Database::pdo();
    $references = $this->publicSettingReferences($pdo, (int)$id);
    if ($references) {
      Response::json([
        'error'=>'file_in_use',
        'message'=>'No se puede eliminar este archivo porque actualmente está siendo utilizado como banner.',
        'settings'=>$references,
      ], 409);
    }
    $f = $pdo->prepare('SELECT path FROM files WHERE id=?');
    $f->execute([$id]);
    $file = $f->fetch(PDO::FETCH_ASSOC);
    if (!$file) { Response::json(['error'=>'not_found'], 404); return; }
    if (!empty($file['path'])) {
        try {
            $fullPath = StoragePath::getFile($file['path']);
            if (is_file($fullPath) && !unlink($fullPath)) {
                Response::json(['error'=>'file_delete_failed', 'message'=>'No se pudo eliminar físicamente el archivo.'], 500);
                return;
            }
        } catch (RuntimeException $e) {
            // A missing physical file must not block cleaning an already orphaned DB record.
            if (!str_contains($e->getMessage(), 'File not found')) {
                Response::json(['error'=>'file_delete_failed'], 500);
                return;
            }
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM files WHERE id=?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    Response::json(['ok'=>true]);
  }

  public function emptyTrash() {
    $this->requireAdmin();
    $pdo = Database::pdo();
    $stmt = $pdo->query("SELECT id, path FROM files WHERE deleted_at IS NOT NULL");
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $count = 0;
    $failed = [];
    foreach ($files as $f) {
        if ($this->publicSettingReferences($pdo, (int)$f['id'])) {
            $failed[] = (int)$f['id'];
            continue;
        }
        if (!empty($f['path'])) {
            try {
                $fullPath = StoragePath::getFile($f['path']);
                if (is_file($fullPath) && !unlink($fullPath)) {
                    $failed[] = (int)$f['id'];
                    continue;
                }
            } catch (RuntimeException $e) {
                if (!str_contains($e->getMessage(), 'File not found')) {
                    $failed[] = (int)$f['id'];
                    continue;
                }
            }
        }
        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM file_events WHERE file_id=?')->execute([$f['id']]);
            $pdo->prepare('DELETE FROM files WHERE id=?')->execute([$f['id']]);
            $pdo->commit();
            $count++;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $failed[] = (int)$f['id'];
        }
    }
    Response::json(['ok'=>count($failed)===0, 'count'=>$count, 'failed'=>$failed]);
  }

  private function publicSettingReferences(PDO $pdo, int $fileId): array {
    $placeholders = implode(',', array_fill(0, count(self::PUBLIC_MEDIA_SETTINGS), '?'));
    $sql = "SELECT `key`, value FROM settings WHERE `key` IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(self::PUBLIC_MEDIA_SETTINGS);

    $references = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      if (preg_match('~/api/uploads/(\d+)(?:$|[/?#])~', (string)($row['value'] ?? ''), $matches)
          && (int)$matches[1] === $fileId) {
        $references[] = (string)$row['key'];
      }
    }
    return $references;
  }

  public function sse(): never {
    AuthController::requireAuth();
    Response::sseHeaders();
    set_time_limit(0);
    ignore_user_abort(false);
    $retry = (int) (getenv('SSE_RETRY_MS') ?: 2000);
    echo "retry: $retry\n\n";
    $pdo = Database::pdo();
    $lastId = max(0, (int)($_SERVER['HTTP_LAST_EVENT_ID'] ?? 0));
    $startedAt = time();
    while (!connection_aborted() && time() - $startedAt < 25) {
      $stmt = $pdo->prepare('SELECT e.id, e.file_id, e.ts, e.type, e.message FROM file_events e WHERE e.id > ? ORDER BY e.id ASC LIMIT 20');
      $stmt->execute([$lastId]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
      foreach ($rows as $row) {
        $lastId = $row['id'];
        $data = json_encode($row);
        echo "id: {$row['id']}\n";
        echo "event: file_event\n";
        echo "data: $data\n\n";
      }
      if (!$rows) echo ": keep-alive\n\n";
      @ob_flush(); @flush();
      sleep(2);
    }
    exit;
  }


  // Serve raw file content
  public function serve($id) {
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT id, name, path, type, created_at, is_public FROM files WHERE id=?');
    $stmt->execute([$id]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        http_response_code(404);
        die(json_encode(['error' => 'Archivo no encontrado']));
    }
    
    // Authorization check
    $ed = $pdo->prepare("SELECT status FROM editions WHERE file_id=?");
    $ed->execute([$id]);
    $editionStatus = $ed->fetchColumn();
    
    $isPublic = ($editionStatus === 'Publicada') || !empty($file['is_public']);
    
    if (!$isPublic) {
        require_once __DIR__.'/AuthController.php';
        $u = AuthController::userFromToken();
        if (!$u) {
            http_response_code(403);
            die(json_encode(['error'=>'Acceso denegado. Se requiere autenticacion.']));
        }
        $role = strtolower($u['role'] ?? '');
        if (!in_array($role, ['admin', 'superadmin', 'staff', 'manager'])) {
            $check = $pdo->prepare("SELECT lr.user_id FROM legal_files lf JOIN legal_requests lr ON lr.id = lf.legal_request_id WHERE lf.file_id = ?");
            $check->execute([$id]);
            $ownerId = $check->fetchColumn();
            if ($ownerId != $u['id']) {
                http_response_code(403);
                die(json_encode(['error'=>'No tienes permiso para ver este archivo']));
            }
        }
    }

    try {
        $filePath = StoragePath::getFile($file['path']);
    } catch (RuntimeException $e) {
        http_response_code(404);
        die(json_encode([
            'error' => 'FILE_MISSING',
            'message' => 'El documento no está disponible actualmente.'
        ]));
    }

    // Serve with proper CORS headers
    $mime = $file['type'] === 'pdf' ? 'application/pdf' : mime_content_type($filePath);
    header('Content-Type: '.$mime);
    header('Content-Length: ' . filesize($filePath));
    header('Accept-Ranges: bytes');
    
    // Provide filename for download
    $downloadName = $file['name'] ?: basename($filePath);
    $disposition = (($_GET['download'] ?? '') === '1') ? 'attachment' : 'inline';
    header('Content-Disposition: ' . $disposition . '; filename*=UTF-8\'\'' . rawurlencode($downloadName));
    
    // Prevent caching issues
    if ($isPublic) {
        header('Cache-Control: public, max-age=3600');
        header('Pragma: public');
    } else {
        header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }
    
    readfile($filePath);
    exit;
  }

  // Serve Avatar content
  public function serveAvatar($filename) {
    try {
        $filePath = StoragePath::getAvatar($filename);
    } catch (RuntimeException $e) {
        http_response_code(404);
        die(json_encode(['error' => 'Avatar not found']));
    }

    $mime = mime_content_type($filePath);
    header('Content-Type: '.$mime);
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: public, max-age=86400');
    readfile($filePath);
    exit;
  }
}
