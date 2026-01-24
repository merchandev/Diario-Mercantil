<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class LegalController {
  // New: upload a PDF from applicant, auto-count pages, create request and return pricing summary
  public function uploadPdf(){
    // Verificar autenticacion
    $u = AuthController::requireAuth();
    
    if (!isset($_FILES['file'])) {
      return Response::json(['error'=>'No se ha enviado ningún archivo'], 400);
    }
    
    $file = $_FILES['file'];
    $name = $file['name'] ?? '';
    $tmp = $file['tmp_name'] ?? '';
    $size = (int)($file['size'] ?? 0);
    $error = $file['error'] ?? UPLOAD_ERR_OK;
    
    // Check for upload errors
    if ($error !== UPLOAD_ERR_OK) {
      $errors = [
        UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido',
        UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño del formulario',
        UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
        UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
        UPLOAD_ERR_NO_TMP_DIR => 'Falta carpeta temporal',
        UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo',
        UPLOAD_ERR_EXTENSION => 'Extensión PHP detuvo la subida'
      ];
      return Response::json(['error'=> $errors[$error] ?? 'Error desconocido al subir'], 400);
    }
    
    // Validate file type
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext !== 'pdf') {
      return Response::json(['error'=>'Solo se permiten archivos PDF'], 400);
    }
    
    // Validate file size (max 50MB)
    if ($size > 50 * 1024 * 1024) {
      return Response::json(['error'=>'El archivo no puede superar 50MB'], 400);
    }
    
    if ($size < 100) {
      return Response::json(['error'=>'El archivo parece estar vacío o corrupto'], 400);
    }
    
    if (!is_uploaded_file($tmp)) {
      return Response::json(['error'=>'Archivo inválido'], 400);
    }

    // Store file in common uploads and register in files table
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($uploadDir)) {
      if (!mkdir($uploadDir, 0777, true)) {
        return Response::json(['error'=>'No se pudo crear el directorio de subida'], 500);
      }
    }
    
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
    $dest = $uploadDir.'/'.uniqid('doc_', true).'_'.$safeName;
    
    if (!move_uploaded_file($tmp, $dest)) {
      return Response::json(['error'=>'No se pudo guardar el archivo'], 500);
    }

    $pdo = Database::pdo();
    $pdo->beginTransaction();
    try {
      $checksum = hash_file('sha256', $dest);
      $now = gmdate('c');
      $stmt = $pdo->prepare('INSERT INTO files(name,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
      $stmt->execute([$name,$size,'pdf',$checksum,'uploaded',$now,$now]);
      $fileId = (int)$pdo->lastInsertId();

      // Count PDF pages (folios)
      $folios = self::countPdfPages($dest);
      if ($folios < 1) {
        throw new Exception('No se pudieron detectar páginas en el PDF. Verifique que el archivo no esté corrupto.');
      }

      // Current user
      $u = AuthController::userFromToken(AuthController::bearerToken());
      $userId = $u ? (int)$u['id'] : null;

      // START CHANGE: Check if we are attaching to an existing request or creating a new one
      $reqId = null;
      if (isset($_POST['legal_request_id']) && is_numeric($_POST['legal_request_id'])) {
        $reqId = (int)$_POST['legal_request_id'];
        // Verify ownership and existence
        $check = $pdo->prepare('SELECT id, user_id FROM legal_requests WHERE id=?');
        $check->execute([$reqId]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
          throw new Exception('La solicitud especificada no existe');
        }
        
        // Ensure user owns this request (or is admin, but for this flow it's usually the applicant)
        // If user is admin/staff they might be editing someone else's, so we might relax this or check role. 
        // For simplicity in this user flow: strict ownership if not staff.
        $role = strtolower($u['role'] ?? '');
        $isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff', 'manager']);
        
        if (!$isStaff && $existing['user_id'] != $userId) {
           throw new Exception('No tiene permiso para modificar esta solicitud');
        }

        // Update folios on existing request
        $pdo->prepare('UPDATE legal_requests SET folios=?, updated_at=? WHERE id=?')
            ->execute([$folios, $now, $reqId]);
            
        // Clean up old document_pdf files for this request to avoid duplicates? 
        // Optional. For now let's just add the new one. The latest one is usually picked.
        // Or better: mark old ones as replaced? Let's simply add the new file link.

      } else {
        // Create NEW legal request defaults
        $reqName = $u['name'] ?? '';
        $reqDocument = $u['document'] ?? '';
        $today = gmdate('Y-m-d');

        // Create legal request with Por verificar status and pub_type Documento
        $ins = $pdo->prepare("INSERT INTO legal_requests(status,name,document,date,folios,pub_type,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)");
        $ins->execute(['Borrador',$reqName,$reqDocument,$today,$folios,'Documento', $userId, $now]);
        // Changed status to Borrador initially until they submit the full form in next steps, 
        // to avoid "Por verificar" items with missing data if they abandon.
        // However, original code said 'Por verificar'. The user complained about duplicates. 
        // If the frontend does Step 1 (Create Draft) -> Step 2 (Upload), we should reuse. 
        // If we create here, we return ID.
        $reqId = (int)$pdo->lastInsertId();
      }

      // Attach uploaded PDF to request
      $pdo->prepare('INSERT INTO legal_files(legal_request_id,kind,file_id,created_at) VALUES(?,?,?,?)')
          ->execute([$reqId,'document_pdf',$fileId,$now]);

      // Compute pricing summary
      $priceUsd = (float)($pdo->query("SELECT value FROM settings WHERE `key`='price_per_folio_usd'")->fetchColumn() ?: 1.5);
      $bcv = (float)($pdo->query("SELECT value FROM settings WHERE `key`='bcv_rate'")->fetchColumn() ?: 36.0);
      $iva = (float)($pdo->query("SELECT value FROM settings WHERE `key`='iva_percent'")->fetchColumn() ?: 16);
      
      $unitBs = round($priceUsd * $bcv, 2);
      $sub = round($unitBs * $folios, 2);
      $ivaAmt = round($sub * ($iva/100), 2);
      $total = round($sub + $ivaAmt, 2);

      $pdo->commit();
      
      error_log("PDF uploaded successfully: ID=$reqId, folios=$folios, total_bs=$total");
      
      return Response::json([
        'ok'=>true,
        'id'=>$reqId,
        'file_id'=>$fileId,
        'folios'=>$folios,
        'pricing'=>[
          'price_per_folio_usd'=>$priceUsd,
          'bcv_rate'=>$bcv,
          'iva_percent'=>$iva,
          'unit_bs'=>$unitBs,
          'subtotal_bs'=>$sub,
          'iva_bs'=>$ivaAmt,
          'total_bs'=>$total
        ]
      ]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      error_log("PDF upload error: " . $e->getMessage());
      @unlink($dest); // Clean up file on error
      return Response::json(['error'=>'Error en el servidor: ' . $e->getMessage()], 500);
    }
  }

  private static function countPdfPages(string $path): int {
    // Improved PDF page counting with multiple strategies
    if (!file_exists($path) || !is_readable($path)) {
      throw new Exception('No se puede leer el archivo PDF');
    }
    
    $data = @file_get_contents($path);
    if ($data === false || strlen($data) < 100) {
      throw new Exception('El archivo PDF está vacío o corrupto');
    }
    
    // Check if it's a valid PDF
    if (substr($data, 0, 4) !== '%PDF') {
      throw new Exception('El archivo no es un PDF válido');
    }
    
    $count = 0;
    
    // Strategy 1: Count /Type /Page occurrences (most reliable)
    if (preg_match_all('/\/Type\s*\/Page[\s\/>]/', $data, $m)) {
      $count = count($m[0]);
    }
    
    // Strategy 2: If no pages found, try /Count in /Pages object
    if ($count === 0 && preg_match('/\/Type\s*\/Pages.*?\/Count\s+(\d+)/s', $data, $m)) {
      $count = (int)$m[1];
    }
    
    // Strategy 3: Count page break markers
    if ($count === 0) {
      $count = preg_match_all('/\/Page\s*<</', $data);
    }
    
    if ($count < 1) {
      error_log("Warning: Could not detect pages in PDF, defaulting to 1");
      return 1;
    }
    
    error_log("PDF page count: $count pages detected");
    return $count;
  }

  // Public endpoint to get a publication by order number (no auth required)
  public function getPublic($orderNo){
    $pdo = Database::pdo();
    // Support both order_no and id
    $stmt = $pdo->prepare('SELECT * FROM legal_requests WHERE (order_no=? OR id=?) AND status=\'Publicada\' AND deleted_at IS NULL');
    $stmt->execute([$orderNo, $orderNo]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$item) {
      Response::json(['error'=>'Publicación no encontrada o no está publicada'], 404);
      return;
    }
    
    // Get attached files
    $filesStmt = $pdo->prepare('
      SELECT f.id, f.name as original_name, f.size, f.type
      FROM legal_files lf
      JOIN files f ON f.id = lf.file_id
      WHERE lf.legal_request_id = ?
    ');
    $filesStmt->execute([$item['id']]);
    $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $item['files'] = $files;
    Response::json(['item'=>$item]);
  }

  public function list(){
    $pdo = Database::pdo();
    // Filter by current user for any non-admin role to keep applicants scoped to their own records
    $u = AuthController::userFromToken(AuthController::bearerToken());
    
    // Extract filters from request
    $q = trim($_GET['q'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $req_from = trim($_GET['req_from'] ?? '');
    $req_to = trim($_GET['req_to'] ?? '');
    $pub_from = trim($_GET['pub_from'] ?? '');
    $pub_to = trim($_GET['pub_to'] ?? '');
    $all = trim($_GET['all'] ?? '');
    
    // Determine user role and permissions
    $role = strtolower(trim((string)($u['role'] ?? '')));
    $userId = $u ? (int)$u['id'] : null;
    
    // Enhanced role detection: admin, administrador, superadmin, staff, editor, gestor, manager
    $isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff', 'editor', 'gestor', 'manager'], true);
    
    // Build WHERE clause and parameters
    $where = [];
    $params = [];
    
    // CRITICAL: Exclude soft-deleted items
    $where[] = 'deleted_at IS NULL';
    
    // Apply user filter for non-staff users (unless all=1 is explicitly set)
    if ($userId && !$isStaff && $all !== '1' && $all !== 'true') {
      $where[] = 'user_id = ?';
      $params[] = $userId;
      error_log("🔒 [LegalController] Filtering by user_id={$userId} (role={$role}, not staff)");
    } else {
      error_log("🔓 [LegalController] No user filter (role={$role}, isStaff=" . ($isStaff ? 'YES' : 'NO') . ", userId={$userId})");
    }
    
    // Search filter (name, document, order_no)
    if ($q !== '') {
      $where[] = "(name LIKE ? OR document LIKE ? OR order_no LIKE ? OR email LIKE ? OR phone LIKE ?)";
      $params[] = "%{$q}%";
      $params[] = "%{$q}%";
      $params[] = "%{$q}%";
      $params[] = "%{$q}%";
      $params[] = "%{$q}%";
    }
    
    // Status filter with normalization
    if ($status !== '') {
      // Normalize status values for consistent filtering
      $statusNormalized = $status;
      if ($status === 'Pendiente') {
        $where[] = "status IN ('Borrador', 'Pendiente')";
      } elseif ($status === 'Publicado') {
        $where[] = "status IN ('Publicada', 'Publicado')";
      } elseif ($status === 'Por verificar') {
        $where[] = "status = 'Por verificar'";
      } else {
        // Exact match for other statuses: En trámite, Rechazado, etc.
        $where[] = "status = ?";
        $params[] = $status;
      }
    }
    
    // Date range filters
    if ($req_from !== '') {
      $where[] = "date >= ?";
      $params[] = $req_from;
    }
    if ($req_to !== '') {
      $where[] = "date <= ?";
      $params[] = $req_to;
    }
    if ($pub_from !== '') {
      $where[] = "publish_date >= ?";
      $params[] = $pub_from;
    }
    if ($pub_to !== '') {
      $where[] = "publish_date <= ?";
      $params[] = $pub_to;
    }
    
    // Build final SQL query
    $sql = 'SELECT * FROM legal_requests';
    if (!empty($where)) {
      $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC';
    
    // Execute query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Enhanced debug logging
    error_log(sprintf(
      '📊 [LegalController::list] user=%s role=%s isStaff=%s filters=[q=%s status=%s dates=%s→%s pub=%s→%s] returned=%d items',
      $userId ?? 'none',
      $role ?: 'none',
      $isStaff ? 'YES' : 'NO',
      $q ?: '∅',
      $status ?: '∅',
      $req_from ?: '∅',
      $req_to ?: '∅',
      $pub_from ?: '∅',
      $pub_to ?: '∅',
      count($items)
    ));
    
    Response::json(['items' => $items]);
  }

  public function get($id){
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=?');
    $s->execute([$id]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if (!$row) return Response::json(['error'=>'not_found'],404);
    $p = $pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id=? ORDER BY date DESC, id DESC');
    $p->execute([$id]);
    $payments = $p->fetchAll(PDO::FETCH_ASSOC);
    // Attach files metadata as well for richer clients
    $f = $pdo->prepare('SELECT lf.id, lf.kind, lf.file_id, f.name, f.type, f.size, lf.created_at FROM legal_files lf JOIN files f ON f.id=lf.file_id WHERE lf.legal_request_id=? ORDER BY lf.id DESC');
    $f->execute([$id]);
    $files = $f->fetchAll(PDO::FETCH_ASSOC);
    Response::json(['item'=>$row,'payments'=>$payments,'files'=>$files]);
  }

  public function create(){
    try {
      $pdo = Database::pdo();
      $input = json_decode(file_get_contents('php://input'), true) ?: [];
      $status = $input['status'] ?? 'Borrador';
      $name = $input['name'] ?? '';
      $document = $input['document'] ?? '';
      $date = $input['date'] ?? gmdate('Y-m-d');
      $order_no = $input['order_no'] ?? null;
      $publish_date = $input['publish_date'] ?? null;
      $phone = $input['phone'] ?? null; $email = $input['email'] ?? null; $address = $input['address'] ?? null;
      $folios = (int)($input['folios'] ?? 1);
      $meta = isset($input['meta']) && is_array($input['meta']) ? json_encode($input['meta']) : (is_string($input['meta'] ?? null) ? $input['meta'] : null);
      $pub_type = $input['pub_type'] ?? 'Documento';
      $u = AuthController::userFromToken(AuthController::bearerToken());
      $user_id = $u ? (int)$u['id'] : null;
      $now = gmdate('c');
      $comment = $input['comment'] ?? null;
      $stmt = $pdo->prepare('INSERT INTO legal_requests(status,name,document,date,order_no,publish_date,phone,email,address,folios,comment,user_id,pub_type,meta,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      $stmt->execute([$status,$name,$document,$date,$order_no,$publish_date,$phone,$email,$address,$folios,$comment,$user_id,$pub_type,$meta,$now]);
      Response::json(['ok'=>true,'id'=>$pdo->lastInsertId()]);
    } catch (Throwable $e) {
      error_log('LegalController create error: ' . $e->getMessage());
      Response::json(['error'=>'Error en el servidor: ' . $e->getMessage()], 500);
    }
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    
    // Validate ID
    if (!is_numeric($id) || $id < 1) {
      return Response::json(['error'=>'ID inválido'], 400);
    }
    
    // Check if record exists
    $exists = $pdo->prepare('SELECT id FROM legal_requests WHERE id=?');
    $exists->execute([$id]);
    if (!$exists->fetch()) {
      return Response::json(['error'=>'Solicitud no encontrada'], 404);
    }
    
    // allow updating pub_type and meta from applicant flows
    $fields = ['status','name','document','date','order_no','publish_date','phone','email','address','folios','comment','pub_type','meta'];
    $set=[];
    $vals=[];
    
    foreach ($fields as $f) {
      if (array_key_exists($f,$in)) {
        // Validate specific fields
        if ($f === 'status') {
          $validStatuses = ['Borrador', 'Por verificar', 'En trámite', 'Publicada', 'Rechazado'];
          if (!in_array($in[$f], $validStatuses)) {
            return Response::json(['error'=>'Estado inválido'], 400);
          }
        }
        if ($f === 'folios') {
          $foliosVal = (int)$in[$f];
            if ($foliosVal < 1) {
              return Response::json(['error'=>'Los folios deben ser al menos 1'], 400);
            }
        }
        if ($f === 'email' && !empty($in[$f]) && !filter_var($in[$f], FILTER_VALIDATE_EMAIL)) {
          return Response::json(['error'=>'Email inválido'], 400);
        }
        $val = $in[$f];
        if ($f === 'meta' && is_array($val)) {
          // Encode arrays to JSON to avoid Array to string conversion warnings
          $val = json_encode($val, JSON_UNESCAPED_UNICODE);
        }
        $set[] = "$f=?";
        $vals[] = $val;
      }
    }
    
    if (!$set) return Response::json(['ok'=>true, 'message'=>'No hay cambios']);
    
    $vals[] = $id;
    $sql = 'UPDATE legal_requests SET '.implode(',',$set).' WHERE id=?';
    
    try {
      $pdo->prepare($sql)->execute($vals);
      Response::json(['ok'=>true, 'message'=>'Actualizado correctamente']);
    } catch (Throwable $e) {
      error_log("Error updating legal request $id: " . $e->getMessage());
      return Response::json(['error'=>'Error al actualizar: ' . $e->getMessage()], 500);
    }
  }

  public function reject($id){
    if (!is_numeric($id) || $id < 1) {
      return Response::json(['error'=>'ID inválido'], 400);
    }
    
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $reason = trim($in['reason'] ?? 'Rechazado por verificación');
    
    // Validate that record exists
    $exists = $pdo->prepare('SELECT id, status FROM legal_requests WHERE id=?');
    $exists->execute([$id]);
    $record = $exists->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
      return Response::json(['error'=>'Solicitud no encontrada'], 404);
    }
    
    // Don't allow rejecting already published requests
    if ($record['status'] === 'Publicada') {
      return Response::json(['error'=>'No se puede rechazar una solicitud ya publicada'], 400);
    }
    
    try {
      $pdo->prepare("UPDATE legal_requests SET status='Rechazado', comment=? WHERE id=?")->execute([$reason,$id]);
      error_log("Legal request $id rejected with reason: $reason");
      Response::json(['ok'=>true, 'message'=>'Solicitud rechazada correctamente']);
    } catch (Throwable $e) {
      error_log("Error rejecting legal request $id: " . $e->getMessage());
      return Response::json(['error'=>'Error al rechazar: ' . $e->getMessage()], 500);
    }
  }

  public function addPayment($id){
    if (!is_numeric($id) || $id < 1) {
      return Response::json(['error'=>'ID inválido'], 400);
    }
    
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    
    // Validate required fields
    $ref = $in['ref'] ?? null;
    $bank = $in['bank'] ?? null;
    $type = $in['type'] ?? null;
    
    if (empty($ref)) {
      return Response::json(['error'=>'El número de referencia es requerido'], 400);
    }
    
    if (empty($bank)) {
      return Response::json(['error'=>'El banco es requerido'], 400);
    }
    
    if (empty($type)) {
      return Response::json(['error'=>'El tipo de pago es requerido'], 400);
    }
    
    // Validate type
    $validTypes = ['Pago móvil', 'Transferencia'];
    if (!in_array($type, $validTypes)) {
      return Response::json(['error'=>'Tipo de pago inválido'], 400);
    }
    
    $date = $in['date'] ?? gmdate('Y-m-d');
    $amount_bs = (float)($in['amount_bs'] ?? 0);
    $status = $in['status'] ?? 'Pendiente';
    $comment = $in['comment'] ?? null;
    $mobile = $in['mobile_phone'] ?? null;
    $now = gmdate('c');
    
    // Validate amount
    if ($amount_bs <= 0) {
      return Response::json(['error'=>'El monto debe ser mayor a 0'], 400);
    }
    
    // Verify legal request exists
    $exists = $pdo->prepare('SELECT id FROM legal_requests WHERE id=?');
    $exists->execute([$id]);
    if (!$exists->fetch()) {
      return Response::json(['error'=>'Solicitud no encontrada'], 404);
    }
    
    try {
      $stmt = $pdo->prepare('INSERT INTO legal_payments(legal_request_id,ref,date,bank,type,amount_bs,status,mobile_phone,comment,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
      $stmt->execute([$id,$ref,$date,$bank,$type,$amount_bs,$status,$mobile,$comment,$now]);
      
      $paymentId = $pdo->lastInsertId();
      error_log("Payment added to legal request $id: payment_id=$paymentId, amount=$amount_bs");
      
      Response::json(['ok'=>true, 'payment_id'=>$paymentId, 'message'=>'Pago registrado correctamente']);
    } catch (Throwable $e) {
      error_log("Error adding payment to legal request $id: " . $e->getMessage());
      return Response::json(['error'=>'Error al registrar el pago: ' . $e->getMessage()], 500);
    }
  }

  public function deletePayment($id,$pid){
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM legal_payments WHERE id=? AND legal_request_id=?')->execute([$pid,$id]);
    Response::json(['ok'=>true]);
  }

  public function download($id){
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=?');
    $s->execute([$id]);
    $r = $s->fetch(PDO::FETCH_ASSOC);
    if (!$r) { http_response_code(404); echo 'Not found'; return; }

    $folios = (int)($r['folios'] ?? 1);
    $pubType = $r['pub_type'] ?? 'Documento';

    // Decode meta safely
    $meta = [];
    if (!empty($r['meta'])) {
      if (is_string($r['meta'])) {
        $dec = json_decode($r['meta'], true);
        $meta = is_array($dec) ? $dec : ['raw' => $r['meta']];
      } elseif (is_array($r['meta'])) {
        $meta = $r['meta'];
      }
    }

    // Pricing settings
    if ($pubType === 'Convocatoria') {
      $pr = $pdo->prepare("SELECT value FROM settings WHERE `key`='convocatoria_usd'");
      $pr->execute();
      $priceUsd = (float)($pr->fetchColumn() ?: 0);
      $folios = 1; // Convocatoria se cobra como 1 folio
    } else {
      $priceRow = $pdo->prepare("SELECT value FROM settings WHERE `key`='price_per_folio_usd'");
      $priceRow->execute();
      $priceUsd = (float)($priceRow->fetchColumn() ?: 0);
    }
    $bcvRow = $pdo->prepare("SELECT value FROM settings WHERE `key`='bcv_rate'");
    $bcvRow->execute();
    $bcv = (float)($bcvRow->fetchColumn() ?: 0);
    $ivaRow = $pdo->prepare("SELECT value FROM settings WHERE `key`='iva_percent'");
    $ivaRow->execute();
    $iva = (float)($ivaRow->fetchColumn() ?: 16);

    $unitBs = round($priceUsd * $bcv, 2);
    $sub    = round($unitBs * max(1, $folios), 2);
    $ivaAmt = round($sub * ($iva / 100), 2);
    $total  = round($sub + $ivaAmt, 2);

    // Latest payment (if any)
    $payStmt = $pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id=? ORDER BY date DESC, id DESC LIMIT 1');
    $payStmt->execute([$id]);
    $payment = $payStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    // Generate HTML content for PDF
    $html = $this->generateOrderHTML($r, $meta, $pubType, $folios, $unitBs, $sub, $iva, $ivaAmt, $total, $priceUsd, $bcv, $payment);

    // Generate PDF using HTML → PDF conversion
    $pdf = $this->htmlToPdf($html);

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="orden-servicio-' . $id . '.pdf"');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;
  }

  private function generateOrderHTML($r, $meta, $pubType, $folios, $unitBs, $sub, $iva, $ivaAmt, $total, $priceUsd, $bcv, $payment = null) {
    $orderNo = $r['order_no'] ?: $r['id'];
    $issuedAt = gmdate('Y-m-d H:i:s') . ' UTC';
    $logoPath = realpath(__DIR__.'/../public/assets/Logotipo_Diario_Mercantil.svg');
    $logoUrl  = $logoPath ? ('file://' . $logoPath) : '';

    // Determine payment status for badge
    $paymentStatus = 'pending'; // Default: not paid
    $totalPaid = 0;
    
    if ($payment) {
      $totalPaid = (float)($payment['amount_bs'] ?? 0);
      // Check if payment covers total or is marked as verified
      if ($totalPaid >= $total || strtolower($payment['status'] ?? '') === 'verificado') {
        $paymentStatus = 'paid';
      }
    }
    
    $bandColor = $paymentStatus === 'paid' ? '#28A745' : '#C62828';
    $bandText  = $paymentStatus === 'paid' ? 'PAGADO'   : 'NO PAGADO';

    // Build description with only available real data
    $desc = [];
    if ($pubType === 'Convocatoria') {
      $tipoConv = trim((string)($meta['tipo_convocatoria'] ?? ''));
      $desc[] = 'Publicación electrónica de una convocatoria' . ($tipoConv ? (" de tipo " . htmlspecialchars($tipoConv)) : '') . ' en el Diario Mercantil de Venezuela.';
    } else {
      $desc[] = 'Publicación electrónica en el Diario Mercantil de Venezuela de documento protocolizado.';
    }

    $rmRows = [];
    $rmMap = [
      'oficina' => 'Oficina de registro mercantil',
      'tomo' => 'Tomo',
      'numero' => 'Número',
      'anio' => 'Año',
      'expediente' => 'Número de expediente'
    ];
    foreach ($rmMap as $k => $label) {
      if (!empty($meta[$k])) {
        $rmRows[] = '<tr><td>' . $label . '</td><td>' . htmlspecialchars((string)$meta[$k]) . '</td></tr>';
      }
    }
    $rmTable = $rmRows ? ('<table class="kv"><tbody>' . implode('', $rmRows) . '</tbody></table>') : '';

    $paymentBox = '';
    if ($payment) {
      $paymentBox = '<div class="box">'
        . '<div class="box-title">Pago registrado</div>'
        . '<table class="kv"><tbody>'
        . '<tr><td>Referencia</td><td>' . htmlspecialchars((string)$payment['ref']) . '</td></tr>'
        . '<tr><td>Banco</td><td>' . htmlspecialchars((string)$payment['bank']) . '</td></tr>'
        . '<tr><td>Tipo</td><td>' . htmlspecialchars((string)$payment['type']) . '</td></tr>'
        . '<tr><td>Fecha</td><td>' . htmlspecialchars((string)$payment['date']) . '</td></tr>'
        . '<tr><td>Monto (Bs.)</td><td>' . number_format((float)$payment['amount_bs'], 2, ',', '.') . '</td></tr>'
        . '<tr><td>Estado</td><td>' . htmlspecialchars((string)($payment['status'] ?? 'Pendiente')) . '</td></tr>'
        . '</tbody></table>'
        . '</div>';
    }

    $payload = json_encode([
      'orderNo' => $orderNo,
      'issuedAt' => $issuedAt,
      'name' => $r['name'],
      'document' => $r['document'],
      'phone' => $r['phone'],
      'email' => $r['email'],
      'address' => $r['address'],
      'date' => $r['date'],
      'publish_date' => $r['publish_date'],
      'pubType' => $pubType,
      'meta' => $meta,
      'folios' => max(1, $folios),
      'unitBs' => $unitBs,
      'sub' => $sub,
      'iva' => $iva,
      'ivaAmt' => $ivaAmt,
      'total' => $total,
      'priceUsd' => $priceUsd,
      'bcv' => $bcv,
      'payment' => $payment
    ], JSON_UNESCAPED_UNICODE);

    $html = '<!doctype html><html lang="es"><head><meta charset="utf-8">'
      . '<meta http-equiv="X-UA-Compatible" content="IE=edge">'
      . '<meta name="viewport" content="width=device-width, initial-scale=1">'
      . '<style>
        *{box-sizing:border-box}
        body{font-family:"DejaVu Sans", Arial, sans-serif; color:#111827; margin:0; padding:15mm 12mm 15mm 12mm; position:relative; min-height:297mm;}
        .header{display:flex; align-items:center; justify-content:center; border-bottom:3px solid #8B1538; padding-bottom:12px; margin-bottom:16px;}
        .order{margin-top:10px; display:flex; justify-content:space-between; align-items:flex-end}
        .order h1{margin:0; font-size:26px; color:#8B1538}
        .order .meta{font-size:13px; color:#6b7280}
        .grid{display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px; margin-top:16px}
        .label{font-weight:600; color:#374151; font-size:13px}
        .box{border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-top:14px}
        .box-title{font-weight:700; color:#111827; margin-bottom:10px; font-size:15px}
        table.kv{width:100%; border-collapse:collapse}
        table.kv td{border:1px solid #e5e7eb; padding:8px 10px; font-size:13px}
        table.pricing{width:100%; border-collapse:collapse; margin-top:14px}
        table.pricing th, table.pricing td{border:1px solid #e5e7eb; padding:10px 12px; font-size:13px}
        table.pricing thead th{background:#8B1538; color:#fff; text-align:left; font-weight:700}
        tr.total-row td{background:#f9fafb; font-weight:700; font-size:14px}
        .notes{margin-top:14px; font-size:12px; color:#6b7280}
        .footer{margin-top:20px; font-size:12px; color:#6b7280; text-align:center}
        img.logo{height:65px; width:auto;}
        
        /* Payment status band - positioned at bottom right */
        .status-band{
          position:absolute;
          bottom:30px;
          right:30px;
          width:200px;
          padding:14px;
          color:white;
          text-align:center;
          font-size:18px;
          font-weight:bold;
          background:' . $bandColor . ';
          border-radius:8px;
          box-shadow:0 4px 8px rgba(0,0,0,0.15);
        }
      </style></head><body><!--ORDER_DATA: ' . htmlspecialchars($payload, ENT_NOQUOTES, 'UTF-8') . '-->';

    $html .= '<div class="header">'
      . ($logoUrl ? '<img class="logo" src="' . $logoUrl . '" alt="Diario Mercantil de Venezuela" />' : '<div style="height:65px;display:flex;align-items:center;font-size:22px;font-weight:700;color:#8B1538;">Diario Mercantil de Venezuela</div>')
      . '</div>';

    $html .= '<div class="order">'
      . '<h1>Orden de Servicio</h1>'
      . '<div class="meta">N.º ' . htmlspecialchars((string)$orderNo) . '<br>Emitido: ' . $issuedAt . '</div>'
      . '</div>';

    // Client info
    $html .= '<div class="box"><div class="box-title">Datos del solicitante</div><div class="grid">'
      . '<div><span class="label">Nombre/Razón social:</span><br>' . htmlspecialchars((string)$r['name']) . '</div>'
      . '<div><span class="label">C.I./RIF:</span><br>' . htmlspecialchars((string)$r['document']) . '</div>'
      . '<div><span class="label">Teléfono:</span><br>' . (trim((string)$r['phone']) !== '' ? htmlspecialchars((string)$r['phone']) : '-') . '</div>'
      . '<div><span class="label">Correo electrónico:</span><br>' . (trim((string)$r['email']) !== '' ? htmlspecialchars((string)$r['email']) : '-') . '</div>'
      . '<div style="grid-column:1 / span 2"><span class="label">Dirección:</span><br>' . (trim((string)$r['address']) !== '' ? htmlspecialchars((string)$r['address']) : '-') . '</div>'
      . '<div><span class="label">Fecha de solicitud:</span><br>' . htmlspecialchars((string)$r['date']) . '</div>'
      . '<div><span class="label">Fecha de publicación:</span><br>' . ($r['publish_date'] ? htmlspecialchars((string)$r['publish_date']) : '-') . '</div>'
      . '</div></div>';

    // Description and registry data
    $html .= '<div class="box"><div class="box-title">Descripción del servicio</div>'
      . '<div style="font-size:12px;color:#374151">' . implode(' ', $desc) . '</div>'
      . ($rmTable ? ('<div style="margin-top:8px">' . $rmTable . '</div>') : '')
      . '</div>';

    // Pricing table
    $html .= '<table class="pricing"><thead><tr>'
      . '<th>Descripción</th><th>N.º de folios</th><th>Precio unitario (Bs.)</th><th>Precio total (Bs.)</th>'
      . '</tr></thead><tbody>'
      . '<tr><td>Servicio de publicación</td><td>' . max(1, $folios) . '</td><td>' . number_format($unitBs,2,',','.') . '</td><td>' . number_format($sub,2,',','.') . '</td></tr>'
      . '<tr><td>IVA (' . $iva . '%)</td><td></td><td></td><td>' . number_format($ivaAmt,2,',','.') . '</td></tr>'
      . '<tr class="total-row"><td colspan="3">TOTAL A PAGAR</td><td>' . number_format($total,2,',','.') . '</td></tr>'
      . '</tbody></table>';

    // Extra pricing context
    $html .= '<div class="notes">Tasa BCV: ' . number_format($bcv, 2, ',', '.') . ' | Precio por folio: USD ' . number_format($priceUsd, 2, ',', '.') . ' (' . number_format($unitBs,2,',','.') . ' Bs.)</div>';

    // Payment
    if ($paymentBox) { $html .= $paymentBox; }

    // Footer
    $html .= '<div class="footer">Este documento es válido como constancia de generación de la orden para publicación electrónica. Para cualquier consulta contáctenos.</div>';

    // Payment status band
    $html .= '<div class="status-band">' . $bandText . '</div>';

    $html .= '</body></html>';
    return $html;
  }

  private function htmlToPdf($html) {
    // Prefer wkhtmltopdf when available for professional rendering
    $bin = getenv('WKHTMLTOPDF_BIN');
    if (!$bin) {
      $which = @shell_exec('which wkhtmltopdf 2>/dev/null');
      $bin = $which ? trim($which) : 'wkhtmltopdf';
    }

    // Try to render with wkhtmltopdf
    $tmpHtml = tempnam(sys_get_temp_dir(), 'orden_') . '.html';
    $tmpPdf  = tempnam(sys_get_temp_dir(), 'orden_') . '.pdf';
    @file_put_contents($tmpHtml, $html);

    $cmd = escapeshellcmd($bin) . ' --encoding utf-8 --enable-local-file-access --page-size A4 '
         . '--margin-top 12mm --margin-right 10mm --margin-bottom 12mm --margin-left 10mm '
         . '--quiet ' . escapeshellarg($tmpHtml) . ' ' . escapeshellarg($tmpPdf) . ' 2>/dev/null';

    @shell_exec($cmd);

    $pdf = is_file($tmpPdf) ? @file_get_contents($tmpPdf) : '';
    @unlink($tmpHtml);
    @unlink($tmpPdf);

    if ($pdf && strlen($pdf) > 1000 && str_starts_with($pdf, '%PDF')) {
      return $pdf;
    }

    // Fallback: Generate a basic PDF manually
    return $this->generateBasicPdf($html);
  }

  private function generateBasicPdf($html) {
    // Remove style blocks to avoid CSS leaking as text
    $html = preg_replace('/<style[\s\S]*?<\/style>/i', '', $html);
    
    // Extract payment status band text before stripping tags
    $statusText = '';
    if (preg_match('/<div class="status-band">(.*?)<\/div>/i', $html, $match)) {
      $statusText = trim(strip_tags($match[1]));
    }
    
    // Convert common block endings to new lines before stripping
    $html = str_replace(['<br>', '<br/>', '<br />', '</p>', '</div>', '</tr>', '</li>'], "\n", $html);

    // Plain text
    $text = strip_tags($html);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\n{3,}/', "\n\n", $text);
    
    // Add payment status at the end if available
    if ($statusText) {
      $text .= "\n\n================================\n";
      $text .= "ESTADO DE PAGO: " . strtoupper($statusText) . "\n";
      $text .= "================================\n";
    }

    // Convert to Win-1252 so accents render with core fonts
    $text1252 = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $text);
    if ($text1252 !== false) { $text = $text1252; }

    // Basic one-page PDF in Helvetica
    $pdf = "%PDF-1.4\n";
    $pdf .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    $pdf .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    $pdf .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n";
    $pdf .= "4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> >> >>\nendobj\n";

    $content = "BT\n/F1 12 Tf\n50 750 Td\n";
    $lines = explode("\n", $text);
    $inStatusSection = false;
    
    foreach ($lines as $line) {
      $line = trim($line);
      if ($line === '') continue;
      
      // Detect status section for bold rendering
      if (strpos($line, '================================') !== false || strpos($line, 'ESTADO DE PAGO:') !== false) {
        $inStatusSection = true;
        $content .= "/F2 14 Tf\n"; // Switch to bold and larger
      }
      
      $line = str_replace(['(', ')', '\\'], ['\\(', '\\)', '\\\\'], $line);
      $content .= '(' . substr($line, 0, 100) . ") Tj\n0 -15 Td\n";
      
      if ($inStatusSection && strpos($line, '================================') !== false && strpos($text, $line) > strlen($text)/2) {
        $content .= "/F1 12 Tf\n"; // Back to normal
        $inStatusSection = false;
      }
    }
    $content .= "ET\n";

    $pdf .= "5 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n" . $content . "endstream\nendobj\n";
    $pdf .= "xref\n0 6\n";
    $pdf .= "0000000000 65535 f\n";
    $pdf .= "0000000009 00000 n\n";
    $pdf .= "0000000058 00000 n\n";
    $pdf .= "0000000115 00000 n\n";
    $pdf .= "0000000214 00000 n\n";
    $pdf .= "0000000414 00000 n\n";
    $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" . strlen($pdf) . "\n%%EOF\n";

    return $pdf;
  }

  // Attachments
  public function listFiles($id){
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT lf.id, lf.kind, lf.file_id, f.name, f.type, f.size, f.created_at FROM legal_files lf JOIN files f ON f.id=lf.file_id WHERE lf.legal_request_id=? ORDER BY lf.id DESC');
    $s->execute([$id]);
    Response::json(['items'=>$s->fetchAll(PDO::FETCH_ASSOC)]);
  }
  public function attachFile($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $file_id = (int)($in['file_id'] ?? 0); $kind = $in['kind'] ?? '';
    if (!$file_id || !$kind) return Response::json(['error'=>'file_id_and_kind_required'],400);
    $now = gmdate('c');
    $pdo->prepare('INSERT INTO legal_files(legal_request_id,kind,file_id,created_at) VALUES(?,?,?,?)')->execute([$id,$kind,$file_id,$now]);
    Response::json(['ok'=>true]);
  }
  public function detachFile($id,$fid){
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM legal_files WHERE id=? AND legal_request_id=?')->execute([$fid,$id]);
    Response::json(['ok'=>true]);
  }

  // Soft Delete (Move to trash)
  public function softDelete($id){
    $pdo = Database::pdo();
    $now = gmdate('c');
    $stmt = $pdo->prepare('UPDATE legal_requests SET deleted_at=? WHERE id=? AND deleted_at IS NULL');
    $stmt->execute([$now, $id]);
    if ($stmt->rowCount() === 0) {
      return Response::json(['error'=>'Publicación no encontrada o ya eliminada'], 404);
    }
    error_log("🗑️ [LegalController] Moved to trash: legal_request_id={$id}");
    Response::json(['ok'=>true, 'message'=>'Publicación movida a la papelera']);
  }

  // List trashed items (deleted_at IS NOT NULL)
  public function listTrashed(){
    $pdo = Database::pdo();
    
    // Verify admin role
    $u = AuthController::userFromToken(AuthController::bearerToken());
    $role = strtolower($u['role'] ?? '');
    $isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff', 'editor', 'gestor', 'manager'], true);
    
    if (!$isStaff) {
      error_log("🔒 [LegalController] Unauthorized access to trash: user={$u['id']}, role={$role}");
      return Response::json(['items'=>[]]);
    }
    
    error_log("🗑️ [LegalController] Loading trash: user={$u['id']}, role={$role}");
    
    $sql = 'SELECT * FROM legal_requests WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC';
    $stmt = $pdo->query($sql);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("📊 [LegalController] Trash count: " . count($items));
    Response::json(['items'=>$items]);
  }

  // Restore from trash
  public function restore($id){
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('UPDATE legal_requests SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
      return Response::json(['error'=>'Publicación no encontrada en la papelera'], 404);
    }
    error_log("♻️ [LegalController] Restored from trash: legal_request_id={$id}");
    Response::json(['ok'=>true, 'message'=>'Publicación restaurada']);
  }

  // Permanent delete (DELETE FROM legal_requests)
  public function permanentDelete($id){
    $pdo = Database::pdo();
    
    // Only delete if already in trash
    $stmt = $pdo->prepare('SELECT id FROM legal_requests WHERE id=? AND deleted_at IS NOT NULL');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
      return Response::json(['error'=>'Publicación no encontrada en la papelera'], 404);
    }
    
    // Cascade delete will handle legal_payments and legal_files
    $pdo->prepare('DELETE FROM legal_requests WHERE id=?')->execute([$id]);
    error_log("🔥 [LegalController] Permanently deleted: legal_request_id={$id}");
    Response::json(['ok'=>true, 'message'=>'Publicación eliminada permanentemente']);
  }

  // Empty trash (delete all items with deleted_at IS NOT NULL)
  public function emptyTrash(){
    $pdo = Database::pdo();
    
    // Verify admin role
    $u = AuthController::userFromToken(AuthController::bearerToken());
    $role = strtolower($u['role'] ?? '');
    $isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff', 'editor', 'gestor', 'manager'], true);
    
    if (!$isStaff) {
      error_log("🔒 [LegalController] Unauthorized attempt to empty trash: user={$u['id']}, role={$role}");
      return Response::json(['error'=>'No autorizado'], 403);
    }
    
    $stmt = $pdo->prepare('DELETE FROM legal_requests WHERE deleted_at IS NOT NULL');
    $stmt->execute();
    $count = $stmt->rowCount();
    
    error_log("🔥 [LegalController] Trash emptied: deleted_count={$count}, user={$u['id']}");
    Response::json(['ok'=>true, 'message'=>"Se eliminaron {$count} publicaciones permanentemente", 'count'=>$count]);
  }

  // Cleanup old trashed items (30+ days old)
  public function cleanupOldTrashed(){
    $pdo = Database::pdo();
    $cutoff = gmdate('c', strtotime('-30 days'));
    
    $stmt = $pdo->prepare('DELETE FROM legal_requests WHERE deleted_at IS NOT NULL AND deleted_at < ?');
    $stmt->execute([$cutoff]);
    $count = $stmt->rowCount();
    
    error_log("🧹 [LegalController] Auto-cleanup: deleted_count={$count}, cutoff={$cutoff}");
    Response::json(['ok'=>true, 'message'=>"Se eliminaron {$count} publicaciones antiguas", 'count'=>$count]);
  }
}
