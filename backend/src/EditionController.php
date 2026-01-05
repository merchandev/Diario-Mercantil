<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class EditionController {
  private function locateUploadedFile(?int $fileId, ?string $originalName): ?string {
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!$uploadDir || !is_dir($uploadDir)) return null;
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
    $ed = $pdo->prepare('SELECT * FROM editions WHERE code=?');
    $ed->execute([$code]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_id'] ? '/api/e/'.urlencode((string)$edition['code']).'/download' : null;
    $ord = $pdo->prepare("SELECT l.id, l.name, l.document, l.status, l.date FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id");
    $ord->execute([$edition['id']]);
    return Response::json(['edition'=>$edition,'orders'=>$ord->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function downloadById($id){
    $pdo = Database::pdo();
    $ed = $pdo->prepare('SELECT * FROM editions WHERE id=?');
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
    $ed = $pdo->prepare('SELECT id FROM editions WHERE code=?');
    $ed->execute([$code]);
    $id = (int)($ed->fetchColumn() ?: 0);
    if (!$id) { http_response_code(404); echo 'Not found'; return; }
    return $this->downloadById($id);
  }

  public function list(){
    $pdo = Database::pdo();
    $stmt = $pdo->query('SELECT * FROM editions ORDER BY id DESC LIMIT 200');
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$row) {
      $row['file_url'] = $row['file_id'] ? '/api/e/'.urlencode((string)$row['code']).'/download' : null;
    }
    Response::json(['items'=>$items]);
  }

  public function get($id){
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
    $pdo = Database::pdo();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $code = trim($input['code'] ?? '');
    $status = trim($input['status'] ?? 'Borrador');
    $date = trim($input['date'] ?? gmdate('Y-m-d'));
    $edition_no = (int)($input['edition_no'] ?? 1);
    $orders_count = (int)($input['orders_count'] ?? 0);
    $fileId = isset($input['file_id']) ? (int)$input['file_id'] : null;
    $fileName = trim($input['file_name'] ?? '');
    if ($code==='') Response::json(['error'=>'code_required'],400);

    if ($fileId && $fileName==='') {
      $f = $pdo->prepare('SELECT name FROM files WHERE id=?');
      $f->execute([$fileId]);
      $found = $f->fetchColumn();
      if ($found) $fileName = $found;
    }

    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO editions(code,status,date,edition_no,orders_count,file_id,file_name,created_at) VALUES(?,?,?,?,?,?,?,?)');
    $stmt->execute([$code,$status,$date,$edition_no,$orders_count,$fileId,$fileName,$now]);
    Response::json(['ok'=>true,'id'=>$pdo->lastInsertId()]);
  }

  public function delete($id){
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM editions WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $fields = ['code','status','date','edition_no','file_id','file_name'];
    $set=[]; $vals=[];
    foreach ($fields as $f) if (isset($in[$f])) { $set[]="$f=?"; $vals[]=$in[$f]; }
    if (!$set) Response::json(['ok'=>true]);
    $sql = 'UPDATE editions SET '.implode(',', $set).' WHERE id=?';
    $vals[] = $id;
    $pdo->prepare($sql)->execute($vals);
    Response::json(['ok'=>true]);
  }

  public function setOrders($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $ids = $in['order_ids'] ?? [];
    if (!is_array($ids)) $ids = [];
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    $ins = $pdo->prepare('INSERT OR IGNORE INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
    foreach ($ids as $oid) { $ins->execute([$id,(int)$oid]); }
    $cnt = (int)$pdo->query('SELECT COUNT(*) FROM edition_orders WHERE edition_id='.(int)$id)->fetchColumn();
    $pdo->prepare('UPDATE editions SET orders_count=? WHERE id=?')->execute([$cnt,$id]);
    $pdo->commit();
    Response::json(['ok'=>true,'orders_count'=>$cnt]);
  }
  
  public function autoSelectOrders($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $limit = (int)($in['limit'] ?? 10);
    
    $stmt = $pdo->prepare("SELECT id FROM legal_requests WHERE status='Publicada' AND deleted_at IS NULL ORDER BY id DESC LIMIT ?");
    $stmt->execute([$limit]);
    $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($orderIds)) {
      Response::json(['ok'=>false, 'message'=>'No hay ordenes publicadas disponibles'], 400);
    }
    
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
    $ins = $pdo->prepare('INSERT OR IGNORE INTO edition_orders(edition_id,legal_request_id) VALUES(?,?)');
    foreach ($orderIds as $oid) { $ins->execute([$id, $oid]); }
    $cnt = count($orderIds);
    $pdo->prepare('UPDATE editions SET orders_count=? WHERE id=?')->execute([$cnt, $id]);
    $pdo->commit();
    
    Response::json(['ok'=>true, 'orders_count'=>$cnt, 'order_ids'=>$orderIds]);
  }
  
  public function publish($id){
    $pdo = Database::pdo();
    $now = gmdate('Y-m-d');
    $pdo->prepare("UPDATE editions SET status='Publicada', date=? WHERE id=?")->execute([$now, $id]);
    Response::json(['ok'=>true]);
  }

  public function uploadPdf($id){
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
    $dest = $uploadDir.'/'.uniqid('edition_', true).'_'.$safeName;
    if (!move_uploaded_file($tmp, $dest)) return Response::json(['error'=>'No se pudo guardar el PDF'],500);

    $pdo->beginTransaction();
    try {
      $checksum = hash_file('sha256', $dest);
      $now = gmdate('c');
      $stmt = $pdo->prepare('INSERT INTO files(name,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
      $stmt->execute([$name,$size,'pdf',$checksum,'uploaded',$now,$now]);
      $fileId = (int)$pdo->lastInsertId();
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
