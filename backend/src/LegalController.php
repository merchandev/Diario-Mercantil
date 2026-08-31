<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';
require_once __DIR__.'/RolePolicy.php';
require_once __DIR__.'/Services/BcvService.php';
require_once __DIR__.'/Services/PublicationService.php';
require_once __DIR__.'/Services/PdfGenerationService.php';
require_once __DIR__.'/Services/LegalRequestStateMachine.php';
require_once __DIR__.'/PublicLegalRequestView.php';
require_once __DIR__.'/Http/IdempotencyService.php';
require_once __DIR__.'/Services/PdfInspector.php';
require_once __DIR__.'/Services/DocumentUploadService.php';

class LegalController {
  
  private function checkAccess($reqId, $u) {
      if (RolePolicy::canManageLegalRequests($u)) return true;
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
      if (!RolePolicy::canManageLegalRequests($u)) {
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
    $pdo = Database::pdo();
    $service = new DocumentUploadService($pdo);
    
    $reqId = isset($_POST['legal_request_id']) ? (int)$_POST['legal_request_id'] : 0;
    $file = $_FILES['file'] ?? [];
    
    try {
        $result = $service->upload($u, $file, $reqId);
        return Response::json($result);
    } catch (DocumentUploadException $e) {
        return Response::json(['error'=>$e->getMessage(), 'code'=>$e->errorCode], $e->httpStatus);
    }
  }

  public function list(){
    $u = AuthController::requireAuth();
    $pdo = Database::pdo();
    $uid = (int)$u['id'];
    $role = strtolower($u['role'] ?? '');
    
    $sql = "SELECT l.*, e.code AS edition_code, e.id AS edition_id, eo.publication_file_id FROM legal_requests l LEFT JOIN edition_orders eo ON eo.legal_request_id=l.id AND EXISTS (SELECT 1 FROM editions active_e WHERE active_e.id=eo.edition_id AND active_e.deleted_at IS NULL AND active_e.status='Publicada') LEFT JOIN editions e ON e.id=eo.edition_id WHERE l.deleted_at IS NULL";
    $params = [];
    
    if ($uid && !RolePolicy::canManageLegalRequests($u)) {
        $sql .= " AND l.user_id = ?";
        $params[] = $uid;
    }

    $q = $_GET['q'] ?? '';
    if ($q !== '') {
        $sql .= " AND (l.name LIKE ? OR l.order_no LIKE ? OR l.document LIKE ? OR l.id = ?)";
        $params[] = "%$q%";
        $params[] = "%$q%";
        $params[] = "%$q%";
        $params[] = $q;
    }

    $status = $_GET['status'] ?? '';
    if ($status !== '') {
        $sql .= " AND l.status = ?";
        $params[] = $status;
    }

    $pubType = $_GET['pub_type'] ?? '';
    if ($pubType !== '') {
        $sql .= " AND l.pub_type = ?";
        $params[] = $pubType;
    }
    
    $editionCode = $_GET['edition_code'] ?? '';
    if ($editionCode !== '') {
        $sql .= " AND e.code LIKE ?";
        $params[] = "%$editionCode%";
    }
    
    $userIdFilter = $_GET['user_id'] ?? '';
    if ($userIdFilter !== '' && RolePolicy::canManageLegalRequests($u)) {
        $sql .= " AND l.user_id = ?";
        $params[] = $userIdFilter;
    }
    
    $reqFrom = $_GET['req_from'] ?? '';
    if ($reqFrom !== '') {
        $sql .= " AND l.created_at >= ?";
        $params[] = $reqFrom . ' 00:00:00';
    }
    $reqTo = $_GET['req_to'] ?? '';
    if ($reqTo !== '') {
        $sql .= " AND l.created_at <= ?";
        $params[] = $reqTo . ' 23:59:59';
    }
    
    $pubFrom = $_GET['pub_from'] ?? '';
    if ($pubFrom !== '') {
        $sql .= " AND l.publish_date >= ?";
        $params[] = $pubFrom . ' 00:00:00';
    }
    $pubTo = $_GET['pub_to'] ?? '';
    if ($pubTo !== '') {
        $sql .= " AND l.publish_date <= ?";
        $params[] = $pubTo . ' 23:59:59';
    }
    
    $limit = max(1, min(500, (int)($_GET['limit'] ?? 500)));
    $sql .= " ORDER BY l.id DESC LIMIT " . $limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$item) {
        $item['publication_file_url'] = !empty($item['publication_file_id']) && !empty($item['edition_id'])
            ? '/api/editions/' . $item['edition_id'] . '/orders/' . $item['id'] . '/pdf'
            : null;
    }
    Response::json(["items"=>$items]);
  }


  public function get($id){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $pdo = Database::pdo();
    $s = $pdo->prepare("SELECT l.*, e.id AS edition_id, e.code AS edition_code, e.file_id AS edition_file_id, eo.publication_file_id FROM legal_requests l LEFT JOIN edition_orders eo ON eo.legal_request_id=l.id AND EXISTS (SELECT 1 FROM editions active_e WHERE active_e.id=eo.edition_id AND active_e.deleted_at IS NULL AND active_e.status='Publicada') LEFT JOIN editions e ON e.id=eo.edition_id WHERE l.id=? AND l.deleted_at IS NULL"); $s->execute([$id]);
    $r = $s->fetch(PDO::FETCH_ASSOC);
    if (!$r) return Response::json(['error'=>'not_found'],404);
    
    if (!empty($r['edition_file_id']) && !empty($r['edition_code'])) {
        $r['edition_file_url'] = '/api/e/code/' . urlencode((string)$r['edition_code']) . '/download';
    } else {
        $r['edition_file_url'] = null;
    }
    unset($r['edition_file_id']);
    $r['publication_file_url'] = !empty($r['publication_file_id']) && !empty($r['edition_id'])
        ? '/api/editions/' . $r['edition_id'] . '/orders/' . $r['id'] . '/pdf'
        : null;
    
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
    $isAdmin = RolePolicy::canManageLegalRequests($u);
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
        if (!empty($m['numero']) && !preg_match('/^\d{1,3}$/', (string)$m['numero'])) {
            return Response::json(['error'=>'El número mercantil debe contener entre 1 y 3 dígitos'], 400);
        }
        if (!empty($m['anio'])) {
            $year = (string)$m['anio'];
            if (!preg_match('/^\d{4}$/', $year) || (int)$year > (int)gmdate('Y')) {
                return Response::json(['error'=>'El año registral debe ser válido y no puede ser superior al año actual'], 400);
            }
        }
        if (!empty($m['tipo_registrador']) && !in_array(strtoupper($m['tipo_registrador']), ['TITULAR', 'SUPLENTE', 'AUXILIAR'])) {
            return Response::json(['error'=>'Tipo de registrador inválido (TITULAR, SUPLENTE, AUXILIAR)'], 400);
        }
        if (!empty($m['letra']) && !preg_match('/^[A-E]$/i', $m['letra'])) {
            return Response::json(['error'=>'La letra del tomo debe estar entre A y E'], 400);
        }
        if (!empty($m['fecha_registro']) && strtotime($m['fecha_registro']) > time()) {
            return Response::json(['error'=>'La fecha de registro no puede ser futura'], 400);
        }
        foreach (['tipo_sociedad','tipo_acto','razon_social','estado','oficina','registrador','tipo_registrador','letra'] as $key) {
            if (isset($m[$key]) && is_string($m[$key])) {
                $m[$key] = mb_strtoupper(trim($m[$key]), 'UTF-8');
            }
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

    public function unpublish($id){
       $u = AuthController::requireAuth();
       $this->requireAdmin($u);
       $pdo = Database::pdo();
       
       $machine = new LegalRequestStateMachine($pdo);
       try {
           $machine->unpublish($id);
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
     
     if (RolePolicy::canManageLegalRequests($u)) {
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
     
     $isAdmin = RolePolicy::canManageLegalRequests($u);
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
     
     $isAdmin = RolePolicy::canManageLegalRequests($u);
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
      
      $in = json_decode(file_get_contents('php://input'),true);
      $idemKey = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? null;
      $pdo = Database::pdo();
      
      if ($idemKey) {
          $hash = hash('sha256', json_encode($in));
          $cached = IdempotencyService::check($pdo, $u['id'], $idemKey, '/api/legal/'.$id.'/payments', $hash);
          if ($cached) {
              http_response_code($cached['status']);
              Response::json($cached['body']);
              return;
          }
      }

      $ref = preg_replace('/\D+/', '', (string)($in['ref'] ?? ''));
      if (!preg_match('/^\d{4}$/', $ref)) {
          return Response::json(['error'=>'La referencia debe tener exactamente 4 dígitos'], 400);
      }

      $paymentDate = trim((string)($in['date'] ?? ''));
      $paymentDateObj = DateTimeImmutable::createFromFormat('!Y-m-d', $paymentDate);
      if (!$paymentDateObj || $paymentDateObj->format('Y-m-d') !== $paymentDate) {
          return Response::json(['error'=>'La fecha de pago es inválida. Use YYYY-MM-DD'], 400);
      }
      if ($paymentDate > gmdate('Y-m-d')) {
          return Response::json(['error'=>'La fecha de pago no puede ser futura'], 400);
      }

      $bank = trim((string)($in['bank'] ?? ''));
      if ($bank === '' || mb_strlen($bank, 'UTF-8') > 100) {
          return Response::json(['error'=>'Seleccione un banco emisor válido'], 400);
      }

      $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
      $ownsTransaction = !$pdo->inTransaction();
      if ($ownsTransaction) {
          $pdo->beginTransaction();
      }

      $remaining = 0.0;
      try {
          $lockClause = $driver === 'sqlite' ? '' : ' FOR UPDATE';
          $stmt = $pdo->prepare('SELECT id, user_id, status, total_bs FROM legal_requests WHERE id=?' . $lockClause);
          $stmt->execute([$id]);
          $req = $stmt->fetch(PDO::FETCH_ASSOC);

          if (!$req) {
              throw new Exception('Solicitud no encontrada', 404);
          }

          if (!in_array($req['status'], ['Borrador', 'Por verificar', 'En trámite'])) {
              throw new Exception('Solo se pueden agregar pagos en Borrador, Por verificar o En trámite', 403);
          }

          if (!is_numeric($req['total_bs']) || (float)$req['total_bs'] <= 0) {
              throw new Exception('La orden no tiene un monto total válido. Cotice la solicitud primero.', 400);
          }

          $mobile_phone = isset($in['mobile_phone']) ? $in['mobile_phone'] : null;
          if (($in['type'] ?? '') !== 'pago_movil') {
              throw new Exception('Solo se aceptan pagos por Pago Móvil', 400);
          }
          if (empty($mobile_phone) || !preg_match('/^04(12|14|16|22|24|26)\d{7}$/', $mobile_phone)) {
              throw new Exception('El teléfono móvil es inválido para Pago Móvil', 400);
          }
          $reportedStmt = $pdo->prepare("SELECT COALESCE(SUM(amount_bs), 0) FROM legal_payments WHERE legal_request_id=? AND status IN ('Aprobado', 'Por verificar')");
          $reportedStmt->execute([$id]);
          $alreadyReported = (float)$reportedStmt->fetchColumn();
          $remaining = max(0.0, (float)$req['total_bs'] - $alreadyReported);

          $isAdmin = RolePolicy::canManageLegalRequests($u);
          $paymentAmount = $isAdmin && isset($in['amount_bs'])
              ? (float)$in['amount_bs']
              : $remaining;
          if ($paymentAmount <= 0) { throw new Exception('El monto del pago debe ser mayor que cero', 400); }
          if ($paymentAmount > $remaining + 0.005) {
              throw new Exception('payment_exceeds_remaining', 422);
          }
          
          $stmt = $pdo->prepare("
            INSERT INTO legal_payments (legal_request_id, ref, date, bank, type, amount_bs, status, mobile_phone, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Por verificar', ?, ?, ?)
          ");
          $stmt->execute([
              $id, $ref, $paymentDate, $bank, 'pago_movil', $paymentAmount, $mobile_phone,
              trim((string)($in['comment'] ?? '')) ?: null,
              gmdate('Y-m-d H:i:s')
          ]);
          
          $paymentId = $pdo->lastInsertId();

          // Audit
          $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
              ->execute([$u['id'], 'add_payment', 'legal_request', $id]);
          
          if ($ownsTransaction) {
              $pdo->commit();
          }

          $resBody = [
              'ok'=>true,
              'payment_id'=>(int)$paymentId,
              'remaining_bs'=>max(0.0, $remaining - $paymentAmount),
          ];
          if ($idemKey) IdempotencyService::save($pdo, $u['id'], $idemKey, '/api/legal/'.$id.'/payments', $hash, 200, $resBody);
          Response::json($resBody);
      } catch (Exception $e) {
          if ($ownsTransaction) {
              $pdo->rollBack();
          }
          $code = $e->getCode() ?: 500;
          if ($code < 100 || $code > 599) $code = 400;
          $resBody = ['error'=>$e->getMessage()];
          if ($e->getMessage() === 'payment_exceeds_remaining') {
              $resBody['remaining_bs'] = $remaining;
          }
          if ($idemKey && $code < 500) IdempotencyService::save($pdo, $u['id'], $idemKey, '/api/legal/'.$id.'/payments', $hash, $code, $resBody);
          Response::json($resBody, $code);
      }
  }

  public function verifyPayment($id, $paymentId){
      $u = AuthController::requireAuth();
      $this->requireAdmin($u);
      $this->ensureMutable((int)$id);
      $pdo = Database::pdo();

      $stmt = $pdo->prepare('SELECT * FROM legal_payments WHERE id=? AND legal_request_id=? LIMIT 1');
      $stmt->execute([(int)$paymentId, (int)$id]);
      $payment = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$payment) {
          return Response::json(['error'=>'payment_not_found'], 404);
      }
      if ($payment['status'] === 'Aprobado') {
          return Response::json(['ok'=>true, 'payment'=>$payment]);
      }
      if ($payment['status'] !== 'Por verificar') {
          return Response::json(['error'=>'payment_not_pending'], 409);
      }

      $pdo->prepare("UPDATE legal_payments SET status='Aprobado' WHERE id=? AND legal_request_id=?")
          ->execute([(int)$paymentId, (int)$id]);
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
          ->execute([$u['id'], 'verify_payment', 'legal_payment', (int)$paymentId]);

      $payment['status'] = 'Aprobado';
      Response::json(['ok'=>true, 'payment'=>$payment]);
  }

  public function rejectPayment($id, $paymentId){
      $u = AuthController::requireAuth();
      $this->requireAdmin($u);
      $this->ensureMutable((int)$id);
      $pdo = Database::pdo();

      $stmt = $pdo->prepare('SELECT * FROM legal_payments WHERE id=? AND legal_request_id=? LIMIT 1');
      $stmt->execute([(int)$paymentId, (int)$id]);
      $payment = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$payment) {
          return Response::json(['error'=>'payment_not_found'], 404);
      }
      if ($payment['status'] === 'Rechazado') {
          return Response::json(['ok'=>true, 'payment'=>$payment]);
      }
      if ($payment['status'] !== 'Por verificar') {
          return Response::json(['error'=>'payment_not_pending'], 409);
      }

      $pdo->prepare("UPDATE legal_payments SET status='Rechazado' WHERE id=? AND legal_request_id=?")
          ->execute([(int)$paymentId, (int)$id]);
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
          ->execute([$u['id'], 'reject_payment', 'legal_payment', (int)$paymentId]);

      $payment['status'] = 'Rechazado';
      Response::json(['ok'=>true, 'payment'=>$payment]);
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

      $stmt = $pdo->prepare("SELECT e.code, e.id FROM editions e JOIN edition_orders eo ON eo.edition_id = e.id WHERE eo.legal_request_id = ? AND e.status='Publicada' AND e.deleted_at IS NULL LIMIT 1");
      $stmt->execute([$id]);
      $edition = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($edition) {
          $r['edition_code'] = $edition['code'];
          $r['edition_id'] = $edition['id'];
      }
      
      $role = strtolower($u['role'] ?? '');
      if (!RolePolicy::canManageLegalRequests($u)) {
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
  
  public function getPublic($order = null){
    $order = trim((string)($order ?? ($_GET['order'] ?? '')));
    if ($order === '') return Response::json(['error'=>'order_required'], 400);
    $pdo = Database::pdo();
    $item = PublicLegalRequestView::fetch($pdo, $order);
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
    
    $kind = (string)($in['kind'] ?? '');
    if ($kind === 'document_pdf') {
        return Response::json(['error'=>'Usa el flujo de upload_pdf para el documento principal.'], 400);
    }

    $fileId = (int)($in['file_id'] ?? 0);
    $checkOwner = $pdo->prepare('SELECT owner FROM files WHERE id=?');
    $checkOwner->execute([$fileId]);
    $owner = $checkOwner->fetchColumn();
    if ($owner === false) {
        return Response::json(['error'=>'Archivo no encontrado'], 404);
    }
    $isAdmin = RolePolicy::canManageLegalRequests($u);
    if (!$isAdmin && (string)$owner !== (string)$u['id']) {
        return Response::json(['error'=>'El archivo no te pertenece.'], 403);
    }

    $s = $pdo->prepare("SELECT COUNT(*) FROM legal_files WHERE file_id=? AND legal_request_id!=?");
    $s->execute([$fileId, $id]);
    if ($s->fetchColumn() > 0) {
        return Response::json(['error'=>'El archivo ya está adjunto a otra solicitud'], 400);
    }
    
    $pdo->prepare("DELETE FROM legal_files WHERE legal_request_id=? AND kind=?")->execute([$id, $kind]);
    
    $pdo->prepare("INSERT INTO legal_files(legal_request_id,file_id,kind,created_at) VALUES(?,?,?,?)")
        ->execute([$id, $fileId, $kind, gmdate('Y-m-d H:i:s')]);
    Response::json(['ok'=>true]);
  }

  public function detachFile($id, $fid){
    $u = AuthController::requireAuth();
    $this->checkAccess($id, $u);
    $this->ensureMutable($id);
    Database::pdo()->prepare("DELETE FROM legal_files WHERE id=? AND legal_request_id=?")->execute([$fid, $id]);
    Response::json(['ok'=>true]);
  }

  public function repairPdf($id, $fid) {
      $u = AuthController::requireAuth();
      $role = strtolower($u['role'] ?? '');
      if (!in_array($role, ['admin', 'superadmin'])) {
          return Response::json(['error'=>'No autorizado'], 403);
      }

      $pdo = Database::pdo();
      
      // 1. Verify file exists in DB
      $s = $pdo->prepare('SELECT f.id, f.path, f.checksum FROM files f JOIN legal_files lf ON lf.file_id=f.id WHERE lf.legal_request_id=? AND f.id=?');
      $s->execute([$id, $fid]);
      $fileRow = $s->fetch(PDO::FETCH_ASSOC);

      if (!$fileRow) {
          return Response::json(['error'=>'Archivo no encontrado en la base de datos'], 404);
      }

      $existingChecksum = $fileRow['checksum'];
      if (!$existingChecksum) {
          return Response::json(['error'=>'No hay checksum original. No se puede reparar seguramente.'], 400);
      }

      // 2. Receive new PDF
      if (empty($_FILES['file'])) {
          return Response::json(['error'=>'No se recibió ningún archivo'], 400);
      }

      $uploaded = $_FILES['file'];
      if ($uploaded['error'] !== UPLOAD_ERR_OK) {
          return Response::json(['error'=>'Error en subida: ' . $uploaded['error']], 400);
      }

      $tmp = $uploaded['tmp_name'];
      if (!is_uploaded_file($tmp)) {
          return Response::json(['error'=>'Archivo inválido'], 400);
      }

      $newChecksum = hash_file('sha256', $tmp);

      // 3. Compare checksum
      if ($newChecksum !== $existingChecksum) {
          return Response::json(['error'=>'El documento no coincide con el archivo originalmente registrado.'], 409);
      }

      require_once __DIR__.'/Http/StoragePath.php';
      $dest = StoragePath::getFilePath($fileRow['path']);
      
      $dir = dirname($dest);
      if (!is_dir($dir)) {
          mkdir($dir, 0755, true);
      }

      if (!move_uploaded_file($tmp, $dest)) {
          return Response::json(['error'=>'No se pudo guardar el archivo físico'], 500);
      }

      // Audit log
      $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
          ->execute([$u['id'], 'repair_file', 'file', $fid]);

      return Response::json(['ok'=>true, 'message'=>'Archivo recuperado exitosamente']);
  }
}
