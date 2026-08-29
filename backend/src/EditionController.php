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
    require_once __DIR__.'/AuthController.php';
    $u = AuthController::userFromToken();
    $isAdmin = $u && ($u['role'] === 'admin' || $u['role'] === 'superadmin');

    if ($isAdmin) {
        $ed = $pdo->prepare("SELECT * FROM editions WHERE (code=? OR code LIKE ?) AND deleted_at IS NULL ORDER BY id DESC LIMIT 1");
        $ed->execute([$code, '%'.$code]);
    } else {
        $today = gmdate('Y-m-d');
        $ed = $pdo->prepare("SELECT * FROM editions WHERE (code=? OR code LIKE ?) AND status='Publicada' AND date <= ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1");
        $ed->execute([$code, '%'.$code, $today]);
    }

    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_id'] ? '/api/e/code/'.urlencode((string)$edition['code']).'/download' : null;

    $edition['seo'] = [
        'title' => 'Edición N° ' . $edition['edition_no'] . ' | Diario Mercantil Venezuela',
        'description' => 'Consulta el archivo digital de la edición N° ' . $edition['edition_no'] . ' de fecha ' . $edition['date'] . ' del Diario Mercantil Venezuela. Válido para Registros Mercantiles.',
        'og_image' => 'https://diariomercantil.com/logo-blanco.png'
    ];

    $ord = $pdo->prepare("SELECT l.name, l.status, l.date FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id");
    $ord->execute([$edition['id']]);
    return Response::json(['edition'=>$edition,'orders'=>$ord->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function downloadById($idOrCode){
    $pdo = Database::pdo();
    if (is_numeric($idOrCode)) {
        $ed = $pdo->prepare("SELECT * FROM editions WHERE id=? AND deleted_at IS NULL");
        $ed->execute([$idOrCode]);
    } else {
        $ed = $pdo->prepare("SELECT * FROM editions WHERE code=? AND deleted_at IS NULL");
        $ed->execute([$idOrCode]);
    }
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) { http_response_code(404); echo 'Not found'; return; }

    $today = gmdate('Y-m-d');
    if ($edition['status'] !== 'Publicada' || $edition['date'] > $today) {
        require_once __DIR__.'/AuthController.php';
        $u = AuthController::userFromToken();
        if (!$u || ($u['role'] !== 'admin' && $u['role'] !== 'superadmin')) {
            http_response_code(403); echo 'Acceso denegado (edición futura o no publicada)'; return;
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
    $today = gmdate('Y-m-d');
    $ed = $pdo->prepare("SELECT id FROM editions WHERE code=? AND status='Publicada' AND date <= ? AND deleted_at IS NULL");
    $ed->execute([$code, $today]);
    $id = (int)($ed->fetchColumn() ?: 0);
    if (!$id) { http_response_code(404); echo 'Not found'; return; }
    return $this->downloadById($id);
  }

  public function list(){
    $this->requireAdmin();
    $pdo = Database::pdo();
    $stmt = $pdo->query('
        SELECT e.*, u.name as published_by_name 
        FROM editions e 
        LEFT JOIN users u ON e.published_by = u.id 
        WHERE e.deleted_at IS NULL
        ORDER BY e.id DESC LIMIT 200
    ');
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$row) {
      $row['file_url'] = $row['file_id'] ? '/api/e/code/'.urlencode((string)$row['code']).'/download' : null;
    }
    Response::json(['items'=>$items]);
  }

  public function listPublic(){
    $pdo = Database::pdo();
    $today = gmdate('Y-m-d');
    $q = $_GET['q'] ?? '';
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';
    $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

    $sql = 'SELECT DISTINCT e.* FROM editions e ';
    if ($q !== '') {
        $sql .= 'LEFT JOIN edition_orders eo ON eo.edition_id = e.id ';
        $sql .= 'LEFT JOIN legal_requests l ON l.id = eo.legal_request_id ';
    }
    $sql .= 'WHERE e.status = "Publicada" AND e.date <= ? AND e.deleted_at IS NULL ';
    $params = [$today];

    if ($q !== '') {
        if ($isSqlite) {
            $sql .= 'AND (e.code LIKE ? OR CAST(e.edition_no AS TEXT) LIKE ? OR l.name LIKE ? OR l.meta LIKE ?) ';
            for ($i=0; $i<4; $i++) $params[] = "%$q%";
        } else {
            $sql .= 'AND (e.code LIKE ? OR CAST(e.edition_no AS CHAR) LIKE ? OR l.name LIKE ? OR (JSON_VALID(l.meta) AND (JSON_UNQUOTE(JSON_EXTRACT(l.meta, "$.razon_social")) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(l.meta, "$.razon_denominacion_social")) LIKE ?))) ';
            for ($i=0; $i<5; $i++) $params[] = "%$q%";
        }
    }

    if ($from !== '') {
        $sql .= 'AND e.date >= ? ';
        $params[] = $from;
    }
    if ($to !== '') {
        $sql .= 'AND e.date <= ? ';
        $params[] = $to;
    }
    
    $sql .= 'ORDER BY e.date DESC, e.id DESC LIMIT 50';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $companyNames = [];
    if ($items) {
      $editionIds = array_map(static fn(array $row): int => (int)$row['id'], $items);
      $in = implode(',', array_fill(0, count($editionIds), '?'));
      $companiesStmt = $pdo->prepare("SELECT eo.edition_id, l.name, l.meta FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id IN ($in) ORDER BY l.id");
      $companiesStmt->execute($editionIds);
      foreach ($companiesStmt->fetchAll(PDO::FETCH_ASSOC) as $company) {
        $meta = json_decode((string)($company['meta'] ?? ''), true);
        if (!is_array($meta)) $meta = [];
        $name = trim((string)($meta['razon_denominacion_social'] ?? $meta['razon_social'] ?? $meta['razon_social_convocatoria'] ?? $company['name'] ?? ''));
        if ($name !== '') $companyNames[(int)$company['edition_id']][$name] = true;
      }
    }
    foreach ($items as &$row) {
      $row['file_url'] = $row['file_id'] ? '/api/e/code/'.urlencode((string)$row['code']).'/download' : null;
      $row['company_name'] = implode(' · ', array_keys($companyNames[(int)$row['id']] ?? []));
    }
    Response::json(['items'=>$items]);
  }

  public function exportCsv($id) {
    $this->requireAdmin();
    $pdo = Database::pdo();
    
    $edStmt = $pdo->prepare('SELECT code, date FROM editions WHERE id=? AND deleted_at IS NULL');
    $edStmt->execute([$id]);
    $edition = $edStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$edition) {
        http_response_code(404);
        echo "Edition not found";
        return;
    }
    
    $stmt = $pdo->prepare("SELECT l.order_no, l.name, u.name as applicant_name, u.email, l.status, l.total_bs FROM edition_orders eo JOIN legal_requests l ON eo.legal_request_id = l.id JOIN users u ON l.user_id = u.id WHERE eo.edition_id=? ORDER BY l.id");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $filename = "Edicion_" . ($edition['code'] ?: $id) . ".csv";
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    // Add BOM for Excel UTF-8 support
    fputs($output, "\xEF\xBB\xBF");
    fputcsv($output, ['N° Orden', 'Razón / Denominación', 'Solicitante', 'Correo', 'Estado', 'Monto (Bs)']);
    
    foreach ($items as $row) {
        fputcsv($output, [
            $row['order_no'],
            $row['name'],
            $row['applicant_name'],
            $row['email'],
            $row['status'],
            $row['total_bs']
        ]);
    }
    fclose($output);
  }

  public function get($id){
    $this->requireAdmin();
    $pdo = Database::pdo();
    $ed = $pdo->prepare('SELECT * FROM editions WHERE id=? AND deleted_at IS NULL');
    $ed->execute([$id]);
    $edition = $ed->fetch(PDO::FETCH_ASSOC);
    if (!$edition) Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_id'] ? '/api/e/code/'.urlencode((string)$edition['code']).'/download' : null;
    $ord = $pdo->prepare('SELECT l.id, l.name, l.document, l.status, l.date, l.meta FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id');
    $ord->execute([$id]);
    $orders = $ord->fetchAll(PDO::FETCH_ASSOC);
    foreach ($orders as &$order) {
        if (!empty($order['meta'])) {
            $meta = json_decode($order['meta'], true) ?: [];
            $order['company_name'] = $meta['razon_social'] ?? $meta['razon_denominacion_social'] ?? $order['name'];
        } else {
            $order['company_name'] = $order['name'];
        }
        unset($order['meta']);
    }
    Response::json(['edition'=>$edition, 'orders'=>$orders]);
  }

  private function generateCode($date, $edition_no) {
      $year = (int) substr($date, 0, 4);
      if ($year >= 2026) {
          $map = ['M' => 1000, 'CM' => 900, 'D' => 500, 'CD' => 400, 'C' => 100, 'XC' => 90, 'L' => 50, 'XL' => 40, 'X' => 10, 'IX' => 9, 'V' => 5, 'IV' => 4, 'I' => 1];
          $res = '';
          $num = $year;
          foreach ($map as $roman => $int) {
              while ($num >= $int) {
                  $res .= $roman;
                  $num -= $int;
              }
          }
          return $res . '-' . str_pad((string)$edition_no, 4, '0', STR_PAD_LEFT);
      }
      $dateObj = new DateTime($date);
      $dateStrNum = $dateObj->format('dmY');
      return "DMV-{$edition_no}{$dateStrNum}";
  }

  public function create(){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    $status = 'Borrador';
    $date = trim((string)($input['date'] ?? gmdate('Y-m-d')));
    $orders = $input['orders'] ?? [];
    if (!is_array($orders)) $orders = [];

    $dateObj = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        Response::json(['error'=>'Fecha de edición inválida. Use YYYY-MM-DD.'], 422);
    }

    $year = (int)$dateObj->format('Y');
    $now = gmdate('Y-m-d H:i:s');
    $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    $lockName = 'diario_edition_counter_' . $year;
    $lockAcquired = false;
    $responseCode = 200;
    $responseBody = [];

    try {
        // Acquire the yearly advisory lock BEFORE starting the MySQL transaction and
        // keep it until after commit. This prevents two concurrent requests from
        // reading the same MAX(edition_no).
        if (!$isSqlite) {
            $lock = $pdo->prepare('SELECT GET_LOCK(?, 10)');
            $lock->execute([$lockName]);
            if ((int)$lock->fetchColumn() !== 1) {
                throw new RuntimeException('No se pudo bloquear el correlativo anual de ediciones.', 503);
            }
            $lockAcquired = true;
            $pdo->beginTransaction();
        } else {
            // SQLite development fallback: reserve the writer lock up front.
            $pdo->exec('BEGIN IMMEDIATE TRANSACTION');
        }

        $q = $pdo->prepare('SELECT MAX(edition_no) FROM editions WHERE publication_year = ?');
        $q->execute([$year]);
        $editionNo = ((int)$q->fetchColumn()) + 1;
        $code = $this->generateCode($date, $editionNo);

        $stmt = $pdo->prepare(
            'INSERT INTO editions(code,status,date,edition_no,orders_count,created_at,publication_year) '
            . 'VALUES(?,?,?,?,?,?,?)'
        );
        $stmt->execute([$code, $status, $date, $editionNo, 0, $now, $year]);
        $editionId = (int)$pdo->lastInsertId();

        $orderService = new EditionOrderService($pdo);
        $orderService->setOrdersForEdition($editionId, $orders);

        $pdo->prepare(
            'INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)'
        )->execute([$u['id'], 'create_edition', 'edition', $editionId]);

        if ($pdo->inTransaction()) $pdo->commit();
        $responseBody = ['ok'=>true, 'id'=>$editionId, 'code'=>$code, 'edition_no'=>$editionNo];
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ((string)$e->getCode() === '23000') {
            $responseCode = 409;
            $responseBody = ['error'=>'El correlativo o CVE de la edición ya existe. Intente crear la edición nuevamente.'];
        } else {
            error_log('Edition create database error: ' . $e->getMessage());
            $responseCode = 500;
            $responseBody = ['error'=>'No se pudo crear la edición por un error de base de datos.'];
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $responseCode = (int)$e->getCode();
        if ($responseCode < 400 || $responseCode > 599) $responseCode = 500;
        $responseBody = ['error'=>$e->getMessage() ?: 'No se pudo crear la edición.'];
    } finally {
        if ($lockAcquired) {
            try {
                $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
                $release->execute([$lockName]);
            } catch (Throwable $releaseError) {
                error_log('No se pudo liberar el bloqueo de correlativo: ' . $releaseError->getMessage());
            }
        }
    }

    Response::json($responseBody, $responseCode);
  }

  public function delete($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=? AND deleted_at IS NULL'); $s->execute([$id]);
    $status = $s->fetchColumn();
    if (!$status) { Response::json(['error'=>'not_found'], 404); exit; }
    if ($status === 'Publicada') {
        // Preserve legal traceability: published editions are retired logically, never destroyed.
        $pdo->prepare('UPDATE editions SET deleted_at=NOW() WHERE id=?')->execute([$id]);
    } else {
        $pdo->prepare('DELETE FROM edition_orders WHERE edition_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM editions WHERE id=?')->execute([$id]);
    }
    
    $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
        ->execute([$u['id'], 'delete_edition', 'edition', $id]);
        
    Response::json(['ok'=>true]);
  }

  public function update($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    
    $s = $pdo->prepare('SELECT status FROM editions WHERE id=? AND deleted_at IS NULL'); $s->execute([$id]);
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
    $ids = $in['order_ids'] ?? ($in['orders'] ?? []);
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
  
  public function autoSelect($id){
      $u = $this->requireAdmin();
      $pdo = Database::pdo();
      
      $in = json_decode(file_get_contents('php://input'), true) ?: [];
      $limit = (int)($in['limit'] ?? 100);
      
      try {
          $s = $pdo->prepare("SELECT id FROM legal_requests WHERE status='En trámite' AND id NOT IN (SELECT legal_request_id FROM edition_orders) ORDER BY created_at ASC LIMIT " . max(1, $limit));
          $s->execute();
          $ids = $s->fetchAll(PDO::FETCH_COLUMN);
          
          $cnt = 0;
          if (!empty($ids)) {
              // We should get existing orders and append these new ones
              $exStmt = $pdo->prepare("SELECT legal_request_id FROM edition_orders WHERE edition_id=?");
              $exStmt->execute([$id]);
              $existingIds = $exStmt->fetchAll(PDO::FETCH_COLUMN);
              
              $mergedIds = array_unique(array_merge($existingIds, $ids));
              
              $orderService = new EditionOrderService($pdo);
              $cnt = $orderService->setOrdersForEdition($id, $mergedIds);
          }
          
          $pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
              ->execute([$u['id'], 'auto_select_edition_orders', 'edition', $id]);
              
          Response::json(['ok'=>true, 'count'=>count($ids), 'added'=>$ids]);
    } catch (Exception $e) {
        $code = (int)$e->getCode();
        if ($code < 400 || $code > 599) $code = 500;
        Response::json(['error'=>$e->getMessage()], $code);
    }
  }
  
    public function publish($id){
      $u = $this->requireAdmin();
      $pdo = Database::pdo();
      
      require_once __DIR__ . '/Services/EditionPublicationService.php';
      $service = new EditionPublicationService($pdo);
      
      // We will stream the progress back as SSE (Server-Sent Events)
      // or JSON streaming if preferred. We'll use SSE.
      header('Content-Type: text/event-stream');
      header('Cache-Control: no-cache');
      header('Connection: keep-alive');

      try {
          $service->publish($id, $u['id'], function($done, $total, $msg) {
              $progress = $total > 0 ? floor(($done / $total) * 100) : 100;
              echo "data: " . json_encode(['progress' => $progress, 'msg' => $msg]) . "\n\n";
              if (ob_get_level() > 0) ob_flush();
              flush();
          });
          echo "data: " . json_encode(['ok' => true]) . "\n\n";
      } catch (RuntimeException $e) {
          $code = $e->getCode() ?: 500;
          echo "data: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
      } catch (Throwable $e) {
          echo "data: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
      }
      die();
    }

    public function notify($id) {
        $u = $this->requireAdmin();
        $pdo = Database::pdo();
        
        $edStmt = $pdo->prepare('SELECT code, status FROM editions WHERE id=? AND deleted_at IS NULL');
        $edStmt->execute([$id]);
        $edition = $edStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$edition || $edition['status'] !== 'Publicada') {
            return Response::json(['error' => 'Edición no encontrada o no publicada'], 400);
        }
        
        $stmt = $pdo->prepare("SELECT legal_request_id FROM edition_orders WHERE edition_id=?");
        $stmt->execute([$id]);
        $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (count($orderIds) === 0) {
            return Response::json(['error' => 'No hay publicaciones en esta edición'], 400);
        }
        
        $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
        $ownersStmt = $pdo->prepare("SELECT u.email, u.name, l.order_no FROM legal_requests l JOIN users u ON l.user_id = u.id WHERE l.id IN ($inQuery)");
        $ownersStmt->execute($orderIds);
        $owners = $ownersStmt->fetchAll(PDO::FETCH_ASSOC);
        
        require_once __DIR__ . '/Services/EmailService.php';
        $sentCount = 0;
        foreach ($owners as $owner) {
            if ($owner['email']) {
                try {
                    EmailService::sendPublished($owner['email'], $owner['name'], $owner['order_no'] ?? 'N/A', $edition['code']);
                    $sentCount++;
                } catch (Throwable $e) {
                    error_log("Failed to send published email to {$owner['email']}: " . $e->getMessage());
                }
            }
        }
        
        Response::json(['ok' => true, 'sent' => $sentCount]);
    }

  public function uploadPdf($id){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    $lockClause = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
    $ed = $pdo->prepare('SELECT status, code FROM editions WHERE id=? AND deleted_at IS NULL' . $lockClause);
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
      if (isset($dest) && is_file($dest) && !unlink($dest)) {
        error_log('No se pudo limpiar el PDF de edición tras el rollback: ' . $dest);
      }
      Response::json(['error'=>'Error guardando PDF: '.$e->getMessage()],500);
    }
  }
}
