<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';

class LegalController {
  
  public function uploadPdf(){
    $u = AuthController::requireAuth();
    if (!isset($_FILES['file'])) return Response::json(['error'=>'No se ha enviado ningún archivo'], 400);
    $file = $_FILES['file'];
    $name = $file['name'] ?? '';
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    
    // Validate Extension
    if ($ext !== 'pdf') return Response::json(['error'=>'Solo archivos PDF'], 400);
    
    // Validate MIME Type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if ($mime !== 'application/pdf') {
        return Response::json(['error'=>'El archivo no es un PDF válido (MIME mismatch)'], 400);
    }
    
    $uploadDir = realpath(__DIR__.'/..').'/storage/uploads';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    
    $dest = $uploadDir.'/'.uniqid('doc_', true).'_'.preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
    if (!move_uploaded_file($file['tmp_name'], $dest)) return Response::json(['error'=>'Error moviendo archivo'], 500);

    $pdo = Database::pdo();
    $now = gmdate('c');
    
    // Store relative path (relative to storage/uploads? or full relative?)
    // FileController logic will expect relative to storage/uploads if we stick to a pattern, 
    // or we can store "uploads/..."
    // Let's store the filename as it lies in storage/uploads.
    $storageName = basename($dest);
    
    $stmt = $pdo->prepare('INSERT INTO files(name,path,size,type,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$name,$storageName,$file['size'],'pdf','uploaded',$now,$now]);
    $fileId = (int)$pdo->lastInsertId();

    // Contar paginas
    $folios = 1;
    $content = @file_get_contents($dest);
    if(preg_match_all('/\/Type\s*\/Page[\s\/>]/', $content, $m)) $folios = count($m[0]);

    // Check if we should attach to existing draft
    $reqId = isset($_POST['legal_request_id']) ? (int)$_POST['legal_request_id'] : 0;
    
    if ($reqId > 0) {
        // Update existing request
        $pdo->prepare("UPDATE legal_requests SET folios=? WHERE id=?")->execute([$folios, $reqId]);
        
        // Remove previous document_pdf files to ensure only one exists
        $pdo->prepare("DELETE FROM legal_files WHERE legal_request_id=? AND kind='document_pdf'")->execute([$reqId]);
    } else {
        // Crear solicitud nueva (fallback)
        $stmt = $pdo->prepare("INSERT INTO legal_requests(status,name,document,date,folios,pub_type,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)");
        $stmt->execute(['Borrador',$u['name'],$u['document'],gmdate('Y-m-d'),$folios,'Documento', $u['id'], $now]);
        $reqId = (int)$pdo->lastInsertId();
    }

    $pdo->prepare('INSERT INTO legal_files(legal_request_id,kind,file_id,created_at) VALUES(?,?,?,?)')
        ->execute([$reqId,'document_pdf',$fileId,$now]);

    // Get live BCV rate from settings
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key`=?');
    $stmt->execute(['bcv_rate']);
    $bcvRaw = $stmt->fetchColumn();
    $bcv = is_numeric($bcvRaw) ? (float)$bcvRaw : 370.0; // fallback if not found
    
    // Get Price Per Folio
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key`=?');
    $stmt->execute(['price_per_folio_usd']);
    $priceRaw = $stmt->fetchColumn();
    $pricePerFolioUsd = is_numeric($priceRaw) ? (float)$priceRaw : 1.5; // fallback
    
    // $pricePerFolioUsd = 1.5; // Removed hardcoded val
    $ivaPercent = 16;
    
    // Calculate pricing: (folios × $1.5 × bcv_rate) + IVA
    $priceUsd = $folios * $pricePerFolioUsd;
    $subtotalBs = round($priceUsd * $bcv, 2);
    $ivaBs = round($subtotalBs * ($ivaPercent / 100), 2);
    $totalBs = round($subtotalBs + $ivaBs, 2);
      
    return Response::json([
        'ok'=>true, 
        'id'=>$reqId, 
        'file_id'=>$fileId, 
        'folios'=>$folios,
        'pricing'=>[
            'price_per_folio_usd' => $pricePerFolioUsd,
            'price_usd' => $priceUsd,
            'bcv_rate' => $bcv,
            'subtotal_bs' => $subtotalBs,
            'iva_percent' => $ivaPercent,
            'iva_bs' => $ivaBs,
            'total_bs' => $totalBs
        ]
    ]);
  }

  // == CRUD Methods que faltaban ==

  public function list(){
    $pdo = Database::pdo();
    $u = AuthController::userFromToken(AuthController::bearerToken());
    $uid = $u ? (int)$u['id'] : null;
    $role = strtolower($u['role'] ?? '');
    
    $sql = "SELECT * FROM legal_requests WHERE deleted_at IS NULL";
    $params = [];
    
    // Si no es staff, solo ve sus cosas
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

    $req_from = $_GET['req_from'] ?? '';
    if ($req_from !== '') {
        $sql .= " AND DATE(created_at) >= ?";
        $params[] = $req_from;
    }

    $req_to = $_GET['req_to'] ?? '';
    if ($req_to !== '') {
        $sql .= " AND DATE(created_at) <= ?";
        $params[] = $req_to;
    }

    $pub_from = $_GET['pub_from'] ?? '';
    if ($pub_from !== '') {
        $sql .= " AND publish_date >= ?";
        $params[] = $pub_from;
    }

    $pub_to = $_GET['pub_to'] ?? '';
    if ($pub_to !== '') {
        $sql .= " AND publish_date <= ?";
        $params[] = $pub_to;
    }

    $sql .= " ORDER BY id DESC LIMIT 500";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    Response::json(['items' => $items]);
  }

  public function get($id){
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=?'); $s->execute([$id]);
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
      $pdo = Database::pdo();
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      // Default to 'Por verificar' regardless of input
      $status = 'Por verificar';
      $u = AuthController::userFromToken(AuthController::bearerToken());
      $uid = $u ? (int)$u['id'] : null;
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
      Response::json(['error'=>$e->getMessage()], 500);
    }
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    
    
    $fields = ['status','name','document','date','publish_date','verification_date','phone','email','address','folios','comment','pub_type','meta'];
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

  public function reject($id){
     $pdo = Database::pdo();
     $in = json_decode(file_get_contents('php://input'), true) ?: [];
     $pdo->prepare("UPDATE legal_requests SET status='Rechazado', comment=? WHERE id=?")->execute([$in['reason']??'',$id]);
     Response::json(['ok'=>true]);
  }

  // == Trash & Actions ==

  public function listTrashed(){
     AuthController::requireAuth();
     $pdo = Database::pdo();
     $stmt = $pdo->query("SELECT * FROM legal_requests WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
     Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function softDelete($id){
     AuthController::requireAuth();
     $pdo = Database::pdo();
     $now = gmdate("c");
     $pdo->prepare("UPDATE legal_requests SET deleted_at=? WHERE id=?")->execute([$now, $id]);
     Response::json(["ok"=>true]);
  }

  public function restore($id){
     AuthController::requireAuth();
     $pdo = Database::pdo();
     $pdo->prepare("UPDATE legal_requests SET deleted_at=NULL WHERE id=?")->execute([$id]);
     Response::json(["ok"=>true]);
  }
  
  public function permanentDelete($id){
    AuthController::requireAuth();
    Database::pdo()->prepare('DELETE FROM legal_requests WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  public function emptyTrash(){
     AuthController::requireAuth();
     $pdo = Database::pdo();
     $pdo->prepare("DELETE FROM legal_requests WHERE deleted_at IS NOT NULL")->execute();
     Response::json(["ok"=>true]);
  }

  public function addPayment($id){
      $in = json_decode(file_get_contents('php://input'),true);
      $pdo = Database::pdo();
      // Use the status sent from frontend, fallback to 'Pendiente' if not provided
      $status = isset($in['status']) ? $in['status'] : 'Pendiente';
      $pdo->prepare('INSERT INTO legal_payments(legal_request_id,ref,date,bank,type,amount_bs,status,created_at) VALUES(?,?,?,?,?,?,?,NOW())')
          ->execute([$id, $in['ref'], $in['date'], $in['bank'], $in['type'], $in['amount_bs'], $status]);
      Response::json(['ok'=>true]);
  }
  
  public function deletePayment($id,$pid){
      Database::pdo()->prepare('DELETE FROM legal_payments WHERE id=?')->execute([$pid]);
      Response::json(['ok'=>true]);
  }

  public function download($id){
      // Require authentication
      $u = AuthController::requireAuth();
      
      $pdo = Database::pdo();
      $s = $pdo->prepare('SELECT * FROM legal_requests WHERE id=?'); $s->execute([$id]);
      $r = $s->fetch(PDO::FETCH_ASSOC);
      if (!$r) {
          http_response_code(404);
          die('Orden no encontrada');
      }

      // Fetch associated Edition for QR Code
      $stmt = $pdo->prepare("SELECT e.code, e.id FROM editions e JOIN edition_orders eo ON eo.edition_id = e.id WHERE eo.legal_request_id = ? LIMIT 1");
      $stmt->execute([$id]);
      $edition = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($edition) {
          $r['edition_code'] = $edition['code'];
          $r['edition_id'] = $edition['id'];
      }
      
      // Check if user has access to this order
      $role = strtolower($u['role'] ?? '');
      if (!in_array($role, ['admin','staff','manager'])) {
          // Regular users can only download their own orders
          if ((int)$r['user_id'] !== (int)$u['id']) {
              http_response_code(403);
              die('No tienes acceso a esta orden');
          }
      }
      
      $p = $pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id=?'); $p->execute([$id]);
      $pay = $p->fetchAll(PDO::FETCH_ASSOC);
      
      require_once __DIR__.'/OrderPdf.php';
      
      $pdf = new OrderPdf();
      $pdf->AliasNbPages();
      $pdf->orderInfo = $r;
      $pdf->AddPage();
      
      $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key`=?');
      $stmt->execute(['price_per_folio_usd']);
      $pricePerFolio = (float)$stmt->fetchColumn() ?: 1.5;

      // Get BCV Rate
      $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key`=?');
      $stmt->execute(['bcv_rate']);
      $bcv = (float)$stmt->fetchColumn() ?: 0.0;

      $totalUsd = $r['folios'] * $pricePerFolio;
      $subtotalBs = $totalUsd * $bcv;

      $clientData = [
          'Cliente:' => $r['name'],
          'Documento:' => $r['document'],
          'Email:' => $r['email'] ?? '---',
          'Telefono:' => $r['phone'] ?? '---'
      ];
      
      $orderDetails = [
          'Estado:' => $r['status'],
          'Tipo:' => $r['pub_type'] ?? 'Documento',
          'Folios:' => $r['folios'],
          'Tasa BCV:' => number_format($bcv, 2)
      ];

      $pdf->InfoSection($clientData, $orderDetails);
      
      // Totals section (moved from bottom of order details to here or after table?)
      // Use clean layout.

      
      $totalUsd = $r['folios'] * $pricePerFolio;
      $subtotalBs = $totalUsd * $bcv;
      $ivaBs = $subtotalBs * 0.16;
      $totalBs = $subtotalBs + $ivaBs;

      
      $pdf->SetFont('Arial', 'B', 10);
      $pdf->Cell(50, 6, 'Total Estimado (Bs):', 0, 0);
      $pdf->SetTextColor(143, 25, 32); // Brand color
      $pdf->Cell(0, 6, number_format($totalBs, 2).' Bs', 0, 1);
      $pdf->SetTextColor(0); // Reset
      $pdf->Ln(5);

      // -- PAGOS REGISTRADOS --
      $pdf->SectionHeader('PAGOS REGISTRADOS');
      
      // Table Header
      $pdf->SetFont('Arial', 'B', 9);
      $pdf->SetTextColor(143, 25, 32); // Brand color for headers
      // $pdf->SetFillColor(220, 220, 220); // Removed fill
      $pdf->Cell(30, 8, 'Fecha', 'B', 0, 'C', false);
      $pdf->Cell(40, 8, 'Referencia', 'B', 0, 'C', false);
      $pdf->Cell(40, 8, 'Banco', 'B', 0, 'C', false);
      $pdf->Cell(30, 8, 'Monto (Bs)', 'B', 0, 'C', false);
      $pdf->Cell(30, 8, 'Estado', 'B', 1, 'C', false);
      
      $pdf->SetFont('Arial', '', 9);
      $pdf->SetTextColor(0);
      $totalPaid = 0;
      
      foreach($pay as $py) {
        $amount = isset($py['amount_bs']) ? (float)$py['amount_bs'] : 0.0;
        if($py['status'] == 'Aprobado') $totalPaid += $amount;
        
        $pdf->Cell(30, 8, substr($py['date'], 0, 10), 'B', 0, 'C');
        $pdf->Cell(40, 8, $py['ref'], 'B', 0, 'C');
        $pdf->Cell(40, 8, $py['bank'], 'B', 0, 'C');
        $pdf->Cell(30, 8, number_format($amount, 2), 'B', 0, 'R');
        $pdf->Cell(30, 8, $py['status'], 'B', 1, 'C');
      }
      
      if(empty($pay)) {
          $pdf->Cell(170, 7, 'No hay pagos registrados', 1, 1, 'C');
      }
      
      $pdf->Ln(2);
      $pdf->SetFont('Arial', 'B', 10);
      $pdf->Cell(110, 7, '', 0, 0);
      $pdf->Cell(30, 7, 'Total Pagado:', 0, 0, 'R');
      $pdf->Cell(30, 7, number_format($totalPaid, 2).' Bs', 0, 1, 'R');

      $pdf->Ln(15);
      $pdf->SetFont('Arial', '', 10);
      $pdf->SetTextColor(100, 100, 100);
      $pdf->Cell(0, 5, 'Fecha de Emision: ' . ($r['date'] ?? date('Y-m-d')), 0, 1, 'R');
      $output = $pdf->Output('S');
      
      // Clean previous output to prevent PDF corruption
      // if (ob_get_length()) ob_end_clean();
      
      header('Content-Type: application/pdf');
      header('Content-Disposition: inline; filename="orden_'.$r['order_no'].'.pdf"'); // Changed to inline for preview
      header('Content-Length: ' . strlen($output));
      header('Cache-Control: no-cache, no-store, must-revalidate');
      header('Pragma: no-cache');
      header('Expires: 0');
      echo $output;
  }
  public function getPublic($order){ 
    $pdo = Database::pdo();
    $r = $pdo->prepare("SELECT * FROM legal_requests WHERE order_no=? OR id=?");
    $r->execute([$order, $order]);
    Response::json(['item'=>$r->fetch(PDO::FETCH_ASSOC)]);
  }

  // == FILES ==
  public function listFiles($id){
    $pdo = Database::pdo();
    // Select f.id as file_id to ensure we get the clean integer ID from the files table
    $stmt = $pdo->prepare("SELECT lf.id, lf.kind, f.id as file_id, f.name, f.size, f.type, f.created_at FROM legal_files lf JOIN files f ON f.id=lf.file_id WHERE lf.legal_request_id=?");
    $stmt->execute([$id]);
    Response::json(["items"=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }
  
  public function attachFile($id){
    $in = json_decode(file_get_contents('php://input'),true);
    $pdo = Database::pdo();
    
    // Remove existing file of the same kind to ensure 1:1 relationship per kind
    $pdo->prepare("DELETE FROM legal_files WHERE legal_request_id=? AND kind=?")->execute([$id, $in['kind']]);
    
    $pdo->prepare("INSERT INTO legal_files(legal_request_id,file_id,kind,created_at) VALUES(?,?,?,NOW())")
        ->execute([$id, $in['file_id'], $in['kind']]);
    Response::json(['ok'=>true]);
  }

  public function detachFile($id, $fid){
    Database::pdo()->prepare("DELETE FROM legal_files WHERE id=?")->execute([$fid]);
    Response::json(['ok'=>true]);
  }
}
