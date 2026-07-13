<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/Services/EditionOrderService.php';
require_once __DIR__.'/Http/StoragePath.php';

class EditionController {
  private function requireAdmin() {
      require_once __DIR__.'/AuthController.php';
      $u = AuthController::requireAuth();
      if ($u['role'] !== 'admin' && $u['role'] !== 'superadmin') {
          Response::json(["error"=>"forbidden", "details"=>"No autorizado"], 403);
          exit;
      }
      return $u;
  }

  private function locateUploadedFile(?int $fileId): ?string {
    if (!$fileId) return null;
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT path FROM files WHERE id=?');
    $stmt->execute([$fileId]);
    $path = $stmt->fetchColumn();
    if ($path) {
        try {
            return StoragePath::getFile($path);
        } catch (RuntimeException $e) {
            return null;
        }
    }
    return null;
  }

  private function streamPdf(string $path, string $downloadName, bool $forceDownload=false) {
    if (!file_exists($path)) {
      http_response_code(404);
      echo 'Archivo no encontrado';
      return;
    }
    $mimeType = 'application/pdf';
    header('Content-Type: '.$mimeType);
    header('Content-Length: ' . filesize($path));
    header('Accept-Ranges: bytes');
    $disposition = $forceDownload ? 'attachment' : 'inline';
    header('Content-Disposition: '.$disposition.'; filename="'.basename($downloadName).'"');
    readfile($path);
    exit;
  }

  public function publicByCode($code){
    $pdo = Database::pdo();
    $ed = $pdo->prepare("SELECT * FROM editions WHERE (code=? OR code LIKE ?) AND status='Publicada' ORDER BY id DESC LIMIT 1");
    $ed->execute([$code, '%'.$code]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_id'] ? '/api/e/'.urlencode((string)$edition['code']).'/download' : null;
    $ord = $pdo->prepare("SELECT l.id, l.name, l.document, l.status, l.date FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id");
    $ord->execute([$edition['id']]);
    return Response::json(['edition'=>$edition,'orders'=>$ord->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function downloadById($idOrCode){
    $pdo = Database::pdo();
    if (is_numeric($idOrCode)) {
        $ed = $pdo->prepare("SELECT * FROM editions WHERE id=?");
        $ed->execute([$idOrCode]);
    } else {
        $ed = $pdo->prepare("SELECT * FROM editions WHERE code=?");
        $ed->execute([$idOrCode]);
    }
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) { http_response_code(404); echo 'Not found'; return; }

    if ($edition['status'] !== 'Publicada') {
        require_once __DIR__.'/AuthController.php';
        $u = AuthController::userFromToken();
        if (!$u || ($u['role'] !== 'admin' && $u['role'] !== 'superadmin')) {
            http_response_code(403); echo 'Acceso denegado'; return;
        }
    }

    $fileId = (int)($edition['file_id'] ?? 0);
    if (!$fileId) {
      http_response_code(404);
      echo 'No hay un PDF cargado para esta edicion';
      return;
    }

    $f = $pdo->prepare('SELECT name FROM files WHERE id=?');
    $f->execute([$fileId]);
    $originalName = $f->fetchColumn() ?: '';

    $path = $this->locateUploadedFile($fileId);
    if (!$path || !file_exists($path)) {
      http_response_code(404);
      echo 'Archivo PDF no encontrado en el servidor';
      return;
    }

    $forceDownload = isset($_GET['download']) && $_GET['download'] === '1';
    $safeName = $originalName ?: ('edicion-'.$edition['code'].'.pdf');
    $this->streamPdf($path, $safeName, $forceDownload);
  }

  public function downloadByCode($code){
    $pdo = Database::pdo();
    $ed = $pdo->prepare("SELECT id FROM editions WHERE code=? AND status='Publicada'");
    $ed->execute([$code]);
    $id = (int)($ed->fetchColumn() ?: 0);
    if (!$id) { http_response_code(404); echo 'Not found'; return; }
    return $this->downloadById($id);
  }

  public function list(){
    $this->requireAdmin();
    $pdo = Database::pdo();
    $stmt = $pdo->query('SELECT * FROM editions ORDER BY id DESC LIMIT 200');
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$row) {
      $row['file_url'] = $row['file_id'] ? '/api/e/'.urlencode((string)$row['code']).'/download' : null;
    }
    Response::json(['items'=>$items]);
  }

  public function get($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    $ed = $pdo->prepare('SELECT * FROM editions WHERE id=?');
    $ed->execute([$id]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_id'] ? '/api/e/'.urlencode((string)$edition['code']).'/download' : null;
    $ord = $pdo->prepare('SELECT l.id, l.name, l.document, l.status, l.date FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id');
    $ord->execute([$id]);
    Response::json(['edition'=>$edition,'orders'=>$ord->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function create(){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    
    $status = 'Borrador';
    $date = trim($input['date'] ?? gmdate('Y-m-d'));
    $edition_no = (int)($input['edition_no'] ?? 1);
    $orders = $input['orders'] ?? [];
    if (!is_array($orders)) $orders = [];

    $dateObj = new DateTime($date);
    $dateStrNum = $dateObj->format('dmY');
    $code = "DMV-{$edition_no}{$dateStrNum}";

    $now = gmdate('c');
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO editions(code,status,date,edition_no,orders_count,created_at) VALUES(?,?,?,?,?,?)');
        $stmt->execute([$code, $status, $date, $edition_no, 0, $now]);
        $editionId = (int)$pdo->lastInsertId();

        $orderService = new EditionOrderService($pdo);
        $orderService->setOrdersForEdition($editionId, $orders);

        // Audit
        $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
            ->execute([$u['id'], 'create_edition', 'edition', $editionId]);

        $pdo->commit();
        Response::json(['ok'=>true, 'id'=>$editionId, 'code'=>$code]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() == 23000) {
            Response::json(['error'=>'Ya existe una edición con el código generado ('.$code.') o el número de edición está duplicado.'], 400);
        } else {
            Response::json(['error'=>'Database error: '.$e->getMessage()], 500);
        }
    } catch (Throwable $e) {
        $pdo->rollBack();
        $codeResp = $e->getCode() ?: 500;
        if ($codeResp < 400 || $codeResp > 599) $codeResp = 500;
        Response::json(['error'=>$e->getMessage()], $codeResp);
    }
  }

  public function delete($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() === 'Publicada') {
        Response::json(['error'=>'No se puede eliminar una edición publicada'], 409);
        exit;
    }
    
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM editions WHERE id=?')->execute([$id]);
    
    $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
        ->execute([$u['id'], 'delete_edition', 'edition', $id]);
        
    Response::json(['ok'=>true]);
  }

  public function update($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() === 'Publicada') {
        Response::json(['error'=>'No se puede modificar una edición publicada'], 409);
        exit;
    }
    
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $fields = ['date','edition_no'];
    $set=[]; $vals=[];
    foreach ($fields as $f) if (isset($in[$f])) { $set[]="$f=?"; $vals[]=$in[$f]; }
    
    if (!$set) return Response::json(['ok'=>true]);
    $sql = 'UPDATE editions SET '.implode(',', $set).' WHERE id=?';
    $vals[] = $id;
    
    try {
        $pdo->prepare($sql)->execute($vals);
        $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
            ->execute([$u['id'], 'update_edition', 'edition', $id]);
        Response::json(['ok'=>true]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            Response::json(['error'=>'Ya existe una edición con ese número.'], 400);
        } else {
            Response::json(['error'=>'server_error'], 500);
        }
    }
  }

  public function setOrders($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $ids = $in['order_ids'] ?? isset($in['orders']) ? ($in['orders'] ?? []) : [];
    if (!is_array($ids)) $ids = [];
    
    try {
        $orderService = new EditionOrderService($pdo);
        $cnt = $orderService->setOrdersForEdition($id, $ids);
        
        $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
            ->execute([$u['id'], 'set_orders_edition', 'edition', $id]);
            
        Response::json(['ok'=>true,'orders_count'=>$cnt]);
    } catch (Throwable $e) {
        $codeResp = $e->getCode() ?: 500;
        if ($codeResp < 400 || $codeResp > 599) $codeResp = 500;
        Response::json(['error'=>$e->getMessage()], $codeResp);
    }
  }
  
  public function publish($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    require_once __DIR__ . '/Services/EditionPublicationService.php';
    $service = new EditionPublicationService($pdo);
    
    try {
        $service->publish($id, $u['id']);
        Response::json(['ok'=>true]);
    } catch (RuntimeException $e) {
        $code = $e->getCode() ?: 500;
        Response::json(['error'=>$e->getMessage()], $code);
    } catch (Throwable $e) {
        Response::json(['error'=>$e->getMessage()], 500);
    }
  }

  public function uploadPdf($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    $ed = $pdo->prepare('SELECT status, code FROM editions WHERE id=? FOR UPDATE');
    $ed->execute([$id]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    if ($edition['status'] !== 'Borrador') return Response::json(['error'=>'La edición debe estar en Borrador para subir o reemplazar un archivo.'], 409);
    
    if (!isset($_FILES['file'])) return Response::json(['error'=>'file_required'],400);

    $file = $_FILES['file'];
    $name = $file['name'] ?? '';
    $tmp = $file['tmp_name'] ?? '';
    $size = (int)($file['size'] ?? 0);
    $err = $file['error'] ?? UPLOAD_ERR_OK;

    if ($err !== UPLOAD_ERR_OK) {
      return Response::json(['error'=>'Error al subir archivo (codigo '.$err.')'],400);
    }
    
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext !== 'pdf') return Response::json(['error'=>'Solo se aceptan archivos PDF'],400);
    if ($size <= 0 || !is_uploaded_file($tmp)) return Response::json(['error'=>'Archivo invalido'],400);
    if ($size > 80 * 1024 * 1024) return Response::json(['error'=>'PDF demasiado grande (max 80MB)'],400);

    // MIME Validation
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $tmp);
    finfo_close($finfo);
    if ($mime !== 'application/pdf') {
        return Response::json(['error'=>'MIME inválido, no es un PDF.'], 400);
    }
    
    // Check %PDF- signature
    $handle = fopen($tmp, 'r');
    $header = fread($handle, 5);
    fclose($handle);
    if ($header !== '%PDF-') {
        return Response::json(['error'=>'Firma de archivo PDF inválida.'], 400);
    }

    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0750, true);
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));

    $pdo->beginTransaction();
    try {
      $checksum = hash_file('sha256', $tmp);
      $now = gmdate('c');
      $stmt = $pdo->prepare('INSERT INTO files(name,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
      $stmt->execute([$name,$size,'pdf',$checksum,'uploaded',$now,$now]);
      $fileId = (int)$pdo->lastInsertId();
      
      $path = $fileId . '_edition_' . $safeName;
      $dest = $uploadDir . '/' . $path;
      
      if (!move_uploaded_file($tmp, $dest)) throw new Exception('No se pudo guardar el archivo físico');
      
      $pdo->prepare("UPDATE files SET path=? WHERE id=?")->execute([$path, $fileId]);
      $pdo->prepare('UPDATE editions SET file_id=?, file_name=? WHERE id=?')->execute([$fileId,$name,$id]);
      
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
            ->execute([$u['id'], 'upload_edition_pdf', 'edition', $id]);
            
      $pdo->commit();
      
      Response::json(['ok'=>true,'file_id'=>$fileId,'file_name'=>$name]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      @unlink($dest);
      Response::json(['error'=>'Error guardando PDF: '.$e->getMessage()],500);
    }
  }
}
