<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

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

  private function locateUploadedFile(?int $fileId, ?string $originalName): ?string {
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!$uploadDir || !is_dir($uploadDir)) return null;

    if ($fileId) {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT path FROM files WHERE id=?');
        $stmt->execute([$fileId]);
        $path = $stmt->fetchColumn();
        if ($path && file_exists($uploadDir.'/'.$path)) {
            return $uploadDir.'/'.$path;
        }
        $files = glob($uploadDir.'/'.$fileId.'_edition_*');
        if (!empty($files)) return $files[0];
    }

    $files = glob($uploadDir.'/*');
    foreach ($files as $fp) {
      $base = basename($fp);
      if ($fileId && strpos($base, (string)$fileId) !== false) return $fp;
      if ($originalName && strpos($base, basename($originalName)) !== false) return $fp;
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

  public function downloadById($id){
    $pdo = Database::pdo();
    $ed = $pdo->prepare("SELECT * FROM editions WHERE id=? AND status='Publicada'");
    $ed->execute([$id]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) { http_response_code(404); echo 'Not found'; return; }

    $fileId = (int)($edition['file_id'] ?? 0);
    $fileName = $edition['file_name'] ?? '';
    if (!$fileId) {
      http_response_code(404);
      echo 'No hay un PDF cargado para esta edicion';
      return;
    }

    $f = $pdo->prepare('SELECT name FROM files WHERE id=?');
    $f->execute([$fileId]);
    $fileRow = $f->fetch(PDO::FETCH_ASSOC);
    $originalName = $fileRow['name'] ?? $fileName ?? '';

    $path = $this->locateUploadedFile($fileId, $originalName);
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
    $this->requireAdmin();
    $pdo = Database::pdo();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $status = 'Borrador'; // Forzar creación como borrador
    $date = trim($input['date'] ?? gmdate('Y-m-d'));
    $edition_no = (int)($input['edition_no'] ?? 1);
    $orders = $input['orders'] ?? [];
    if (!is_array($orders)) $orders = [];
    $orders_count = count($orders);

    // Auto-generate edition number and code (Format: DMV-<edition_no><date>)
    $dateObj = new DateTime($date);
    $dateStr = $dateObj->format('Y-m-d');
    $dateStrNum = $dateObj->format('dmY'); // Use full year Y (e.g., 2026 instead of 26)
    $code = "DMV-{$edition_no}{$dateStrNum}";

    $fileId = isset($input['file_id']) ? (int)$input['file_id'] : null;
    $fileName = trim($input['file_name'] ?? '');

    if ($fileId && $fileName==='') {
      $f = $pdo->prepare('SELECT name FROM files WHERE id=?');
      $f->execute([$fileId]);
      $found = $f->fetchColumn();
      if ($found) $fileName = $found;
    }

    $now = gmdate('c');
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO editions(code,status,date,edition_no,orders_count,file_id,file_name,created_at) VALUES(?,?,?,?,?,?,?,?)');
        $stmt->execute([$code,$status,$date,$edition_no,$orders_count,$fileId,$fileName,$now]);
        $editionId = $pdo->lastInsertId();

        if ($orders_count > 0) {
            $ins = $pdo->prepare('INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
            foreach ($orders as $oid) {
                $ins->execute([$editionId, (int)$oid]);
            }
            // Do NOT auto-mark orders as Publicada here; only do so when the edition is formally published via publish()
        }
        $pdo->commit();
        Response::json(['ok'=>true, 'id'=>$editionId, 'code'=>$code]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() == 23000) {
            Response::json(['error'=>'Ya existe una edición con el código generado ('.$code.')'], 400);
        } else {
            Response::json(['error'=>'Database error: '.$e->getMessage()], 500);
        }
    } catch (Throwable $e) {
        $pdo->rollBack();
        Response::json(['error'=>'Error: '.$e->getMessage()], 500);
    }
  }

  public function delete($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() === 'Publicada') {
        Response::json(['error'=>'No se puede eliminar una edición publicada'], 403);
        exit;
    }
    
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM editions WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function update($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() === 'Publicada') {
        Response::json(['error'=>'No se puede modificar una edición publicada'], 403);
        exit;
    }
    
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    // Only safe fields (exclude status, code, file_id, file_name)
    $fields = ['date','edition_no'];
    $set=[]; $vals=[];
    foreach ($fields as $f) if (isset($in[$f])) { $set[]="$f=?"; $vals[]=$in[$f]; }
    if (!$set) return Response::json(['ok'=>true]);
    $sql = 'UPDATE editions SET '.implode(',', $set).' WHERE id=?';
    $vals[] = $id;
    $pdo->prepare($sql)->execute($vals);
    Response::json(['ok'=>true]);
  }

  public function setOrders($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() !== 'Borrador') {
        Response::json(['error'=>'Solo se pueden modificar las órdenes de una edición en Borrador'], 403);
        exit;
    }

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $ids = $in['order_ids'] ?? isset($in['orders']) ? ($in['orders'] ?? []) : [];
    if (!is_array($ids)) $ids = [];
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    
    if (count($ids) > 0) {
        $inQuery = implode(',', array_fill(0, count($ids), '?'));
        $statusStmt = $pdo->prepare("SELECT COUNT(*) FROM legal_requests WHERE id IN ($inQuery) AND status != 'En trámite'");
        $statusStmt->execute($ids);
        if ((int)$statusStmt->fetchColumn() > 0) {
            $pdo->rollBack();
            Response::json(['error'=>'Todas las solicitudes seleccionadas deben estar En trámite'], 400);
            exit;
        }
    }
    
    $ins = $pdo->prepare('INSERT IGNORE INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
    foreach ($ids as $oid) { $ins->execute([$id,(int)$oid]); }
    // Do NOT mark orders as Publicada here; only mark them when the edition is formally published
    $cnt = (int)$pdo->query('SELECT COUNT(*) FROM edition_orders WHERE edition_id='.(int)$id)->fetchColumn();
    $pdo->prepare('UPDATE editions SET orders_count=? WHERE id=?')->execute([$cnt,$id]);
    $pdo->commit();
    Response::json(['ok'=>true,'orders_count'=>$cnt]);
  }
  
  public function autoSelectOrders($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=?'); $s->execute([$id]);
    if ($s->fetchColumn() !== 'Borrador') {
        Response::json(['error'=>'Solo se pueden modificar las órdenes de una edición en Borrador'], 403);
        exit;
    }
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $limit = (int)($in['limit'] ?? 10);
    
    // Only auto-select orders that are 'En trámite' (verified but not yet published)
    $stmt = $pdo->prepare("SELECT id FROM legal_requests WHERE status='En trámite' AND deleted_at IS NULL ORDER BY id DESC LIMIT ?");
    $stmt->execute([$limit]);
    $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($orderIds)) {
      Response::json(['ok'=>false, 'message'=>'No hay ordenes en trámite disponibles'], 400);
    }
    
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    $ins = $pdo->prepare('INSERT IGNORE INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
    foreach ($orderIds as $oid) { $ins->execute([$id, $oid]); }
    $cnt = count($orderIds);
    $pdo->prepare('UPDATE editions SET orders_count=? WHERE id=?')->execute([$cnt, $id]);
    $pdo->commit();
    
    Response::json(['ok'=>true, 'orders_count'=>$cnt, 'order_ids'=>$orderIds]);
  }
  
  public function publish($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    require_once __DIR__ . '/Services/EditionPublicationService.php';
    $service = new EditionPublicationService($pdo);
    
    try {
        $service->publish($id);
        return Response::json(['ok'=>true]);
    } catch (RuntimeException $e) {
        $code = $e->getCode() ?: 500;
        return Response::json(['error'=>$e->getMessage()], $code);
    } catch (Throwable $e) {
        return Response::json(['error'=>$e->getMessage()], 500);
    }
  }

  public function uploadPdf($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    $ed = $pdo->prepare('SELECT * FROM editions WHERE id=?');
    $ed->execute([$id]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
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

    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));

    $pdo->beginTransaction();
    try {
      $checksum = hash_file('sha256', $tmp);
      $now = gmdate('c');
      // Insert to get ID
      $stmt = $pdo->prepare('INSERT INTO files(name,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
      $stmt->execute([$name,$size,'pdf',$checksum,'uploaded',$now,$now]);
      $fileId = (int)$pdo->lastInsertId();
      
      $path = $fileId . '_edition_' . $safeName;
      $dest = $uploadDir . '/' . $path;
      
      if (!move_uploaded_file($tmp, $dest)) throw new Exception('No se pudo guardar el archivo');
      
      $pdo->prepare("UPDATE files SET path=? WHERE id=?")->execute([$path, $fileId]);
      $pdo->prepare('UPDATE editions SET file_id=?, file_name=? WHERE id=?')->execute([$fileId,$name,$id]);
      $pdo->commit();
      $edition['file_id'] = $fileId;
      $edition['file_name'] = $name;
      $edition['file_url'] = '/api/e/'.urlencode((string)$edition['code']).'/download';
      Response::json(['ok'=>true,'file_id'=>$fileId,'file_name'=>$name,'edition'=>$edition]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      @unlink($dest);
      Response::json(['error'=>'Error guardando PDF: '.$e->getMessage()],500);
    }
  }
}
