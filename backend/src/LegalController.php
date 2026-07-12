<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';
require_once __DIR__.'/Services/BcvService.php';
require_once __DIR__.'/Services/PublicationService.php';
require_once __DIR__.'/Services/PdfGenerationService.php';
require_once __DIR__.'/Services/LegalRequestStateMachine.php';

class LegalController {
  
  private function checkAccess($reqId, $u) {
      $role = strtolower($u['role'] ?? '');
      if (in_array($role, ['admin','staff','manager'])) return true;
      $pdo = Database::pdo();
      $s = $pdo->prepare('SELECT user_id FROM legal_requests WHERE id=?');
      $s->execute([$reqId]);
      $r = $s->fetch(PDO::FETCH_ASSOC);
      if (!$r || (int)$r['user_id'] !== (int)$u['id']) {
          Response::json(['error'=>'not_authorized'], 403);
          exit;
      }
      return true;
  }

  private function requireAdmin($u) {
      $role = strtolower($u['role'] ?? '');
      if (!in_array($role, ['admin','staff','manager'])) {
          Response::json(['error'=>'forbidden_admin_only'], 403);
          exit;
      }
  }

  private function ensureMutable(int $reqId) {
      $pdo = Database::pdo();
      $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?');
      $s->execute([$reqId]);
      if ($s->fetchColumn() === 'Publicada') {
          Response::json(['error'=>'conflict', 'message'=>'No se puede modificar una solicitud que ya está publicada.'], 409);
          exit;
      }
  }

  public function uploadPdf(){
    $u = AuthController::requireAuth();
    if (!isset($_FILES['file'])) return Response::json(['error'=>'No se ha enviado ningún archivo'], 400);
    $file = $_FILES['file'];
    $name = $file['name'] ?? '';
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return Response::json(['error'=>'Error en la subida del archivo', 'sys_err'=>$file['error']], 400);
    }
    
    // Validate Extension
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext !== 'pdf') return Response::json(['error'=>'Solo archivos PDF'], 400);
    
    // Validate MIME Type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if ($mime !== 'application/pdf') {
        return Response::json(['error'=>'El archivo no es un PDF válido (MIME mismatch)'], 400);
    }
    
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0750, true);
    
    $dest = $uploadDir.'/'.uniqid('doc_', true).'_'.preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
    if (!move_uploaded_file($file['tmp_name'], $dest)) return Response::json(['error'=>'Error moviendo archivo'], 500);

    $pdo = Database::pdo();
    $now = gmdate('c');
    
    $storageName = basename($dest);
    
    $stmt = $pdo->prepare('INSERT INTO files(name,path,size,type,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$name,$storageName,$file['size'],'pdf','uploaded',$now,$now]);
    $fileId = (int)$pdo->lastInsertId();

    $folios = 1;
    $content = @file_get_contents($dest);
    if(preg_match_all('/\/Type\s*\/Page[\s\/>]/', $content, $m)) $folios = count($m[0]);

    $reqId = isset($_POST['legal_request_id']) ? (int)$_POST['legal_request_id'] : 0;
    
    if ($reqId > 0) {
        $this->checkAccess($reqId, $u);
        $this->ensureMutable($reqId);
    }
    
    $bcvService = new BcvService($pdo);
    $publicationService = new PublicationService($pdo, $bcvService);
    
    try {
        $reqId = $publicationService->createLegalRequest($u, $folios, $reqId);
        $publicationService->attachFileToRequest($reqId, $fileId);
        
        $pricing = $publicationService->calculatePricing($folios);
          
        return Response::json([
            'ok'=>true, 
            'id'=>$reqId, 
            'file_id'=>$fileId, 
            'folios'=>$folios,
            'pricing'=>$pricing
        ]);
    } catch (Exception $e) {
        return Response::json(['error'=>$e->getMessage()], 400);
    }
  }

  public function list(){
    $u = AuthController::requireAuth();
    $pdo = Database::pdo();
    $uid = (int)$u['id'];
    $role = strtolower($u['role'] ?? '');
    
    $sql = "SELECT * FROM legal_requests WHERE deleted_at IS NULL";
    $params = [];
    
    if ($uid && !in_array($role, ['admin','staff','manager'])) {
        $sql .= " AND user_id = ?";
        $params[] = $uid;
    }

    $q = $_GET['q'] ?? '';
    if ($q !== '') {
        $sql .= " AND (name LIKE ? OR order_no LIKE ? OR document LIKE ? OR id = ?)";
        $params[] = "%$q%";
        $params[] = "%$q%";
        $params[] = "%$q%";
        $params[] = $q;
    }

    $status = $_GET['status'] ?? '';
    if ($status !== '') {
        $sql .= " AND status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY id DESC LIMIT 500";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    Response::json(['items' => $items]);
  }

  public function get($id){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=? AND deleted_at IS NULL'); $s->execute([$id]);
    $r = $s->fetch(PDO::FETCH_ASSOC);
    if (!$r) return Response::json(['error'=>'not_found'],404);
    
    $p = $pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id=? ORDER BY date DESC'); $p->execute([$id]);
    $pay = $p->fetchAll(PDO::FETCH_ASSOC);
    
    $f = $pdo->prepare('SELECT lf.id, lf.kind, lf.file_id, f.name FROM legal_files lf JOIN files f ON f.id=lf.file_id WHERE lf.legal_request_id=?'); $f->execute([$id]);
    $files = $f->fetchAll(PDO::FETCH_ASSOC);
    
    Response::json(['item'=>$r,'payments'=>$pay,'files'=>$files]);
  }

  public function create(){
    try {
      $u = AuthController::requireAuth();
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $status = 'Borrador';
      $uid = (int)$u['id'];
      $now = gmdate('c');
      
      $stmt = $pdo->prepare('INSERT INTO legal_requests(status,name,document,date,folios,comment,user_id,pub_type,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
      $stmt->execute([
         $status,
         $in['name']??'', 
         $in['document']??'', 
         $in['date']??gmdate('Y-m-d'), 
         (int)($in['folios']??1), 
         $in['comment']??null, 
         $uid, 
         $in['pub_type']??'Documento', 
         $now
      ]);
      Response::json(['ok'=>true,'id'=>$pdo->lastInsertId()]);
    } catch (Throwable $e) {
      Response::json(['error'=>'server_error'], 500);
    }
  }

  public function update($id){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $this->ensureMutable($id);
    
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    
    $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?'); $s->execute([$id]);
    $currStatus = $s->fetchColumn();
    $isAdmin = in_array(strtolower($u['role'] ?? ''), ['admin','staff','manager']);
    if (!$isAdmin && $currStatus !== 'Borrador') {
        return Response::json(['error'=>'No se puede editar una solicitud formalizada. Debe estar en Borrador.'], 403);
    }
    
    if (isset($in['meta']) && is_array($in['meta'])) {
        $m = $in['meta'];
        if (isset($m['año'])) { $m['anio'] = $m['año']; unset($m['año']); }
        if (isset($m['fecha'])) { $m['fecha_registro'] = $m['fecha']; unset($m['fecha']); }
        if (isset($m['razon_denominacion_social'])) { $m['razon_social'] = $m['razon_denominacion_social']; unset($m['razon_denominacion_social']); }
        if (isset($m['expediente'])) { $m['numero_expediente'] = $m['expediente']; unset($m['expediente']); }
        if (isset($m['planilla'])) { $m['numero_planilla'] = $m['planilla']; unset($m['planilla']); }

        if (!empty($m['numero_expediente']) && !preg_match('/^\d{3}-\d{1,8}$/', $m['numero_expediente'])) {
            return Response::json(['error'=>'El expediente debe tener formato 000-00000000'], 400);
        }
        if (!empty($m['numero_planilla']) && !preg_match('/^\d{3}\.\d{4}\.\d\.\d{1,6}$/', $m['numero_planilla'])) {
            return Response::json(['error'=>'La planilla debe tener formato 000.0000.0.000000'], 400);
        }
        if (!empty($m['tomo']) && !preg_match('/^\d{1,3}$/', $m['tomo'])) {
            return Response::json(['error'=>'El tomo debe ser solo números (máx 3)'], 400);
        }
        if (!empty($m['fecha_registro']) && strtotime($m['fecha_registro']) > time()) {
            return Response::json(['error'=>'La fecha de registro no puede ser futura'], 400);
        }
        $in['meta'] = $m;
    }
    
    $fields = ['name','document','date','phone','email','address','folios','comment','pub_type','meta'];
    $set=[]; $vals=[];
    foreach ($fields as $f) {
      if (array_key_exists($f,$in)) {
        $val = $in[$f];
        if ($f==='meta' && is_array($val)) $val = json_encode($val);
        $set[] = "$f=?";
        $vals[] = $val;
      }
    }
    if (!$set) return Response::json(['ok'=>true]);
    $vals[] = $id;
    $pdo->prepare("UPDATE legal_requests SET ".implode(',',$set)." WHERE id=?")->execute($vals);
    Response::json(['ok'=>true]);
  }

  public function submit($id){
     $u = AuthController::requireAuth();
     $this->checkAccess($id, $u);
     $this->ensureMutable($id);
     $pdo = Database::pdo();
     
     $machine = new LegalRequestStateMachine($pdo);
     try {
         $orderNo = $machine->submit($id);
         Response::json(['ok'=>true, 'order_no' => $orderNo]);
     } catch (Exception $e) {
         Response::json(['error'=>$e->getMessage()], 400);
     }
  }

  public function verify($id){
     $u = AuthController::requireAuth();
     $this->requireAdmin($u);
     $this->ensureMutable($id);
     $pdo = Database::pdo();
     
     $machine = new LegalRequestStateMachine($pdo);
     try {
         $machine->verify($id);
         Response::json(['ok'=>true]);
     } catch (Exception $e) {
         Response::json(['error'=>$e->getMessage()], 400);
     }
  }

  public function returnToDraft($id){
     $u = AuthController::requireAuth();
     $this->requireAdmin($u);
     $this->ensureMutable($id);
     $pdo = Database::pdo();
     
     $machine = new LegalRequestStateMachine($pdo);
     try {
         $machine->returnToDraft($id);
         Response::json(['ok'=>true]);
     } catch (Exception $e) {
         Response::json(['error'=>$e->getMessage()], 400);
     }
  }

  public function reject($id){
     $u = AuthController::requireAuth();
     $this->requireAdmin($u);
     $this->ensureMutable($id);
     $pdo = Database::pdo();
     $in = json_decode(file_get_contents('php://input'), true) ?: [];
     
     $machine = new LegalRequestStateMachine($pdo);
     try {
         $machine->reject($id, $in['reason']??'');
         Response::json(['ok'=>true]);
     } catch (Exception $e) {
         Response::json(['error'=>$e->getMessage()], 400);
     }
  }

  public function listTrashed(){
     $u = AuthController::requireAuth();
     $pdo = Database::pdo();
     $uid = (int)$u['id'];
     $role = strtolower($u['role'] ?? '');
     
     if (in_array($role, ['admin','staff','manager'])) {
         $stmt = $pdo->query("SELECT * FROM legal_requests WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
     } else {
         $stmt = $pdo->prepare("SELECT * FROM legal_requests WHERE deleted_at IS NOT NULL AND user_id=? ORDER BY deleted_at DESC");
         $stmt->execute([$uid]);
     }
     Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function softDelete($id){
     $u = AuthController::requireAuth();
     $this->checkAccess($id, $u);
     $this->ensureMutable($id);
     
     $pdo = Database::pdo();
     $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?'); $s->execute([$id]);
     $currStatus = $s->fetchColumn();
     
     $isAdmin = in_array(strtolower($u['role'] ?? ''), ['admin','staff','manager']);
     if (!$isAdmin && $currStatus !== 'Borrador') {
         return Response::json(['error'=>'Solo puedes eliminar solicitudes en Borrador'], 403);
     }
     
     $now = gmdate("c");
     $pdo->prepare("UPDATE legal_requests SET deleted_at=? WHERE id=?")->execute([$now, $id]);
     Response::json(["ok"=>true]);
  }

  public function restore($id){
     $u = AuthController::requireAuth();
     $this->checkAccess($id, $u);
     $this->ensureMutable($id);
     
     $pdo = Database::pdo();
     $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?'); $s->execute([$id]);
     $currStatus = $s->fetchColumn();
     
     $isAdmin = in_array(strtolower($u['role'] ?? ''), ['admin','staff','manager']);
     if (!$isAdmin && $currStatus !== 'Borrador') {
         return Response::json(['error'=>'Solo puedes restaurar solicitudes en Borrador'], 403);
     }
     
     $pdo->prepare("UPDATE legal_requests SET deleted_at=NULL WHERE id=?")->execute([$id]);
     Response::json(["ok"=>true]);
  }
  
  public function permanentDelete($id){
    $u = AuthController::requireAuth();
    $this->requireAdmin($u);
    // Should NOT permanent delete if Published, though they shouldn't even be soft deleted.
    $this->ensureMutable($id);
    Database::pdo()->prepare('DELETE FROM legal_requests WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function emptyTrash(){
     $u = AuthController::requireAuth();
     $this->requireAdmin($u);
     $pdo = Database::pdo();
     // Do not empty if status is Publicada (just in case they were soft deleted before the fix)
     $pdo->prepare("DELETE FROM legal_requests WHERE deleted_at IS NOT NULL AND status != 'Publicada'")->execute();
     Response::json(["ok"=>true]);
  }

  public function addPayment($id){
      $u = AuthController::requireAuth();
      $this->checkAccess($id, $u);
      $this->ensureMutable($id);
      $pdo = Database::pdo();
      
      $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?'); $s->execute([$id]);
      $reqStatus = $s->fetchColumn();
      
      if (!in_array($reqStatus, ['Borrador', 'Por verificar'])) {
          return Response::json(['error'=>'Solo se pueden agregar pagos en Borrador o Por verificar'], 403);
      }
      
      $in = json_decode(file_get_contents('php://input'),true);
      if (!preg_match('/^\d{4}$/', $in['ref'] ?? '')) {
          return Response::json(['error'=>'La referencia debe tener exactamente 4 dígitos'], 400);
      }
      if (strtotime($in['date']) > time()) {
          return Response::json(['error'=>'La fecha de pago no puede ser futura'], 400);
      }
      if (!is_numeric($in['amount_bs']) || $in['amount_bs'] <= 0) {
          return Response::json(['error'=>'El monto debe ser un número positivo'], 400);
      }

      $status = 'Por verificar';
      $mobile_phone = isset($in['mobile_phone']) ? $in['mobile_phone'] : null;
      $pdo->prepare('INSERT INTO legal_payments(legal_request_id,ref,date,bank,type,amount_bs,status,mobile_phone,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())')
          ->execute([$id, $in['ref'], $in['date'], $in['bank'] ?? 'N/A', $in['type'] ?? 'N/A', $in['amount_bs'], $status, $mobile_phone]);
      
      // Audit
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
          ->execute([$u['id'], 'add_payment', 'legal_request', $id]);
          
      Response::json(['ok'=>true]);
  }
  
  public function deletePayment($id,$pid){
      $u = AuthController::requireAuth();
      $this->checkAccess($id, $u);
      $this->ensureMutable($id);
      
      $pdo = Database::pdo();
      $s = $pdo->prepare('SELECT status FROM legal_requests WHERE id=?'); $s->execute([$id]);
      $reqStatus = $s->fetchColumn();
      
      if (!in_array($reqStatus, ['Borrador', 'Por verificar'])) {
          return Response::json(['error'=>'No se pueden eliminar pagos de una solicitud que ya está en trámite'], 403);
      }
      
      $pdo->prepare('DELETE FROM legal_payments WHERE id=? AND legal_request_id=?')->execute([$pid, $id]);
      
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
          ->execute([$u['id'], 'delete_payment', 'legal_request', $id]);
          
      Response::json(['ok'=>true]);
  }

  public function download($id){
      $u = AuthController::requireAuth();
      $pdo = Database::pdo();
      $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=?'); $s->execute([$id]);
      $r = $s->fetch(PDO::FETCH_ASSOC);
      if (!$r) {
          http_response_code(404);
          die('Orden no encontrada');
      }

      $stmt = $pdo->prepare("SELECT e.code, e.id FROM editions e JOIN edition_orders eo ON eo.edition_id = e.id WHERE eo.legal_request_id = ? LIMIT 1");
      $stmt->execute([$id]);
      $edition = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($edition) {
          $r['edition_code'] = $edition['code'];
          $r['edition_id'] = $edition['id'];
      }
      
      $role = strtolower($u['role'] ?? '');
      if (!in_array($role, ['admin','staff','manager'])) {
          if ((int)$r['user_id'] !== (int)$u['id']) {
              http_response_code(403);
              die('No tienes acceso a esta orden');
          }
      }
      
      $p = $pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id=?'); $p->execute([$id]);
      $pay = $p->fetchAll(PDO::FETCH_ASSOC);
      
      $bcvService = new BcvService($pdo);
      $publicationService = new PublicationService($pdo, $bcvService);
      $pdfGenerationService = new PdfGenerationService($pdo, $bcvService, $publicationService);
      
      $output = $pdfGenerationService->generateOrderPdf($r, $pay);
      
      header('Content-Type: application/pdf');
      header('Content-Disposition: inline; filename="orden_'.$r['order_no'].'.pdf"');
      header('Content-Length: ' . strlen($output));
      header('Cache-Control: no-cache, no-store, must-revalidate');
      header('Pragma: no-cache');
      header('Expires: 0');
      echo $output;
  }
  
  public function getPublic($order){ 
    $pdo = Database::pdo();
    $r = $pdo->prepare("SELECT * FROM legal_requests WHERE (order_no=? OR id=?) AND status='Publicada'");
    $r->execute([$order, $order]);
    $item = $r->fetch(PDO::FETCH_ASSOC);
    if (!$item) return Response::json(['error'=>'Not found'], 404);
    Response::json(['item'=>$item]);
  }

  public function listFiles($id){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $pdo = Database::pdo();
    $stmt = $pdo->prepare("SELECT lf.id, lf.kind, f.id as file_id, f.name, f.size, f.type, f.created_at FROM legal_files lf JOIN files f ON f.id=lf.file_id WHERE lf.legal_request_id=?");
    $stmt->execute([$id]);
    Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }
  
  public function attachFile($id){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $this->ensureMutable($id);
    $in = json_decode(file_get_contents('php://input'),true);
    $pdo = Database::pdo();
    
    $pdo->prepare("DELETE FROM legal_files WHERE legal_request_id=? AND kind=?")->execute([$id, $in['kind']]);
    
    $pdo->prepare("INSERT INTO legal_files(legal_request_id,file_id,kind,created_at) VALUES(?,?,?,NOW())")
        ->execute([$id, $in['file_id'], $in['kind']]);
    Response::json(['ok'=>true]);
  }

  public function detachFile($id, $fid){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $this->ensureMutable($id);
    Database::pdo()->prepare("DELETE FROM legal_files WHERE id=?")->execute([$fid]);
    Response::json(['ok'=>true]);
  }
}
