<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/Services/EditionOrderService.php';
require_once __DIR__.'/Services/EditionIdentityService.php';
require_once __DIR__.'/Services/EditorialTrashService.php';
require_once __DIR__.'/Services/EditorialArchiveService.php';
require_once __DIR__.'/Services/PermanentDeletionService.php';
require_once __DIR__.'/Services/EditionIntegrityService.php';
require_once __DIR__.'/Http/StoragePath.php';
require_once __DIR__.'/Services/EditorialClock.php';
require_once __DIR__.'/Services/EditionReadinessService.php';

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

    $edition = (new EditionIdentityService($pdo))->resolve((string)$code);
    if ($edition && ($edition['deleted_at'] !== null || (!$isAdmin && $edition['status'] !== 'Publicada'))) $edition = null;
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $edition['file_is_valid'] = (new EditionIntegrityService($pdo))->editionFileIsPublishable($edition);
    if (!$isAdmin && !$edition['file_is_valid']) return Response::json(['error'=>'not_found'],404);
    $edition['file_url'] = $edition['file_is_valid'] ? ($isAdmin ? '/api/editions/'.$edition['id'].'/download' : '/api/e/code/'.urlencode((string)($edition['cve'] ?? $edition['code'])).'/download') : null;

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

    if ($edition['status'] !== 'Publicada') {
        require_once __DIR__.'/AuthController.php';
        $u = AuthController::userFromToken();
        if (!$u || ($u['role'] !== 'admin' && $u['role'] !== 'superadmin')) {
            http_response_code(403); echo 'Acceso denegado (edición no publicada)'; return;
        }
    }

    $fileId = (int)($edition['file_id'] ?? 0);
    if (!$fileId) {
      http_response_code(404);
      echo 'No hay un PDF cargado para esta edicion';
      return;
    }

    if (!(new EditionIntegrityService($pdo))->editionFileIsPublishable($edition)) {
      http_response_code(404);
      echo 'El PDF final de esta edición no está disponible o no superó la validación de integridad';
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
    $edition = (new EditionIdentityService($pdo))->resolve((string)$code);
    if (!$edition || $edition['deleted_at'] !== null || $edition['status'] !== 'Publicada') { http_response_code(404); echo 'Not found'; return; }
    $id = (int)$edition['id'];
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
    $editionIntegrity = new EditionIntegrityService($pdo);
    foreach ($items as &$row) {
      $row['file_is_valid'] = $editionIntegrity->editionFileIsPublishable($row);
      $row['file_url'] = $row['file_is_valid'] ? '/api/editions/'.$row['id'].'/download' : null;
    }
    Response::json(['items'=>$items]);
  }

  public function listRetired(){
    $u = $this->requireAdmin();
    $pdo = Database::pdo();
    $stmt = $pdo->query(
      'SELECT e.*, u.name AS published_by_name '
      . 'FROM editions e LEFT JOIN users u ON e.published_by=u.id '
      . 'WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC, e.id DESC LIMIT 200'
    );
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$item) {
      $item['can_permanently_delete'] = $u['role'] === 'superadmin';
    }
    Response::json(['items'=>$items]);
  }

  public function listPublic(){
    $pdo = Database::pdo();
    $q = $_GET['q'] ?? '';
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';
    $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

    $sql = 'SELECT DISTINCT e.* FROM editions e ';
    if ($q !== '') {
        $sql .= 'LEFT JOIN edition_orders eo ON eo.edition_id = e.id ';
        $sql .= 'LEFT JOIN legal_requests l ON l.id = eo.legal_request_id ';
    }
    $sql .= 'WHERE e.status = "Publicada" AND e.deleted_at IS NULL ';
    $params = [];

    if ($q !== '') {
        if ($isSqlite) {
            $sql .= 'AND (e.code LIKE ? OR e.cve LIKE ? OR CAST(e.edition_no AS TEXT) LIKE ? OR l.name LIKE ? OR l.meta LIKE ?) ';
            for ($i=0; $i<5; $i++) $params[] = "%$q%";
        } else {
            $sql .= 'AND (e.code LIKE ? OR e.cve LIKE ? OR CAST(e.edition_no AS CHAR) LIKE ? OR l.name LIKE ? OR (JSON_VALID(l.meta) AND (JSON_UNQUOTE(JSON_EXTRACT(l.meta, "$.razon_social")) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(l.meta, "$.razon_denominacion_social")) LIKE ?))) ';
            for ($i=0; $i<6; $i++) $params[] = "%$q%";
        }
    }

    if ($from !== '') {
        $sql .= 'AND e.date >= ? ';
        $params[] = $from;
    }
    if ($to !== '') {
        $sql .= 'AND e.date < ? ';
        $params[] = EditorialClock::nextDay($to);
    }
    
    $sql .= 'ORDER BY e.published_at DESC, e.id DESC LIMIT 50';
    
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
    $editionIntegrity = new EditionIntegrityService($pdo);
    foreach ($items as &$row) {
      $row['file_is_valid'] = $editionIntegrity->editionFileIsPublishable($row);
      $row['file_url'] = $row['file_is_valid'] ? '/api/e/code/'.urlencode((string)($row['cve'] ?? $row['code'])).'/download' : null;
      $row['company_name'] = implode(' · ', array_keys($companyNames[(int)$row['id']] ?? []));
    }
    $items = array_values(array_filter($items, static fn(array $item): bool => $item['file_is_valid']));
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
    $integrityService = new EditionIntegrityService($pdo);
    if ($edition['status'] === 'Publicada') {
        $edition['file_is_valid'] = $integrityService->publishedFileIsValid($edition);
    } else {
        $edition['file_is_valid'] = $integrityService->editionFileIsPublishable($edition);
    }
    $edition['file_url'] = $edition['file_is_valid'] ? '/api/editions/'.$edition['id'].'/download' : null;
    $ord = $pdo->prepare(
        'SELECT l.id,l.order_no,u.name AS applicant_name,l.name,l.document,l.status,l.date,l.meta,'
        . 'eo.publication_file_id,eo.publication_file_name,eo.publication_checksum,'
        . 'eo.publication_source,eo.publication_prepared_at '
        . 'FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id LEFT JOIN users u ON u.id=l.user_id '
        . 'WHERE eo.edition_id=? ORDER BY l.id'
    );
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
        $order['publication_file_url'] = !empty($order['publication_file_id'])
            ? '/api/editions/' . $id . '/orders/' . $order['id'] . '/pdf'
            : null;
    }
    $edition['readiness'] = (new EditionReadinessService($pdo))->check((int)$id);
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
    $date = trim((string)($input['date'] ?? EditorialClock::today()));
    $orders = $input['orders'] ?? [];
    if (!is_array($orders)) $orders = [];
    $orders = array_values(array_unique(array_filter(array_map('intval', $orders), static fn(int $id): bool => $id > 0)));
    if ($orders === []) {
        Response::json(['error'=>'La edición debe tener al menos una solicitud asociada.'], 422);
    }

    $dateObj = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        Response::json(['error'=>'Fecha de edición inválida. Use YYYY-MM-DD.'], 422);
    }

    $year = (int)$dateObj->format('Y');
    if ($year > (int)substr(EditorialClock::today(),0,4)) return Response::json(['error'=>'El año no puede ser posterior al actual.'],422);
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
            $pdo->beginTransaction();
        }

        $editionNo = (new EditionIdentityService($pdo))->nextNumber($year);
        $code = EditionIdentityService::code($year, $editionNo);
        $cve = EditionIdentityService::cve();

        $stmt = $pdo->prepare(
            'INSERT INTO editions(code,status,date,edition_no,orders_count,created_at,publication_year,cve) '
            . 'VALUES(?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([$code, $status, $date, $editionNo, 0, $now, $year, $cve]);
        $editionId = (int)$pdo->lastInsertId();

        $orderService = new EditionOrderService($pdo);
        $orderService->setOrdersForEdition($editionId, $orders, (int)$u['id']);

        $pdo->prepare(
            'INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)'
        )->execute([$u['id'], 'create_edition', 'edition', $editionId]);

        if ($pdo->inTransaction()) $pdo->commit();
        $responseBody = ['ok'=>true, 'id'=>$editionId, 'code'=>$code, 'edition_no'=>$editionNo, 'cve'=>$cve];
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ((string)$e->getCode() === '23000') {
            $responseCode = 409;
            $databaseMessage = (string)($e->errorInfo[2] ?? $e->getMessage());
            if (str_contains($databaseMessage, 'uq_edition_year_number')) {
                $responseBody = [
                    'error'=>'duplicate_edition_number',
                    'message'=>'El correlativo anual de la edición ya existe. Recargue la lista e intente nuevamente.',
                ];
            } elseif (str_contains($databaseMessage, 'uq_editions_code') || str_contains($databaseMessage, 'editions.code')) {
                $responseBody = [
                    'error'=>'duplicate_edition_code',
                    'message'=>'El CVE de la edición ya existe. Recargue la lista e intente nuevamente.',
                ];
            } elseif (str_contains($databaseMessage, 'uq_edition_orders_request')) {
                $responseBody = [
                    'error'=>'legacy_edition_order_constraint',
                    'message'=>'La base de datos conserva una restricción obsoleta que impide reutilizar una solicitud retirada.',
                ];
            } else {
                error_log('Edition create integrity error: ' . $databaseMessage);
                $responseBody = [
                    'error'=>'edition_integrity_conflict',
                    'message'=>'La edición no pudo crearse por un conflicto de integridad de datos.',
                ];
            }
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

  public function permanentDelete($id){
    $u = $this->requireAdmin();
    if ($u['role'] !== 'superadmin') return Response::json(['error'=>'Solo SuperAdmin puede eliminar definitivamente.'],403);
    try {
      $result = (new PermanentDeletionService(Database::pdo()))
        ->deleteEdition((int)$id, (int)$u['id']);
      Response::json($result);
    } catch (Throwable $e) {
      error_log('[edition.force-delete] ' . get_class($e) . ': ' . $e->getMessage());
      $code = (int)$e->getCode();
      if ($code < 400 || $code > 599) $code = 500;
      Response::json([
        'error'=>'force_delete_failed',
        'message'=>$e->getMessage() ?: 'No se pudo eliminar definitivamente la edición.',
      ], $code);
    }
  }

  public function delete($id){ return $this->retire($id); }

  private function trashAction(callable $action): void {
    try { Response::json($action()); }
    catch (Throwable $e) {
      $code=(int)$e->getCode();
      Response::json(['error'=>$e->getMessage()],$code>=400 && $code<=599 ? $code : 500);
    }
  }

  public function retire($id){
    $u=$this->requireAdmin();
    $this->trashAction(fn() => (new EditorialTrashService(Database::pdo()))->trashEdition((int)$id,(int)$u['id']));
  }

  public function restore($id){
    $u=$this->requireAdmin();
    $this->trashAction(fn() => (new EditorialTrashService(Database::pdo()))->restoreEdition((int)$id,(int)$u['id']));
  }

  public function getTrashed($id){
    $this->requireAdmin();
    $pdo=Database::pdo();
    $stmt=$pdo->prepare('SELECT * FROM editions WHERE id=? AND deleted_at IS NOT NULL');
    $stmt->execute([$id]); $edition=$stmt->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $orders=$pdo->prepare('SELECT l.id,l.name,l.order_no,l.status,l.deleted_at FROM edition_orders eo JOIN legal_requests l ON l.id=eo.legal_request_id WHERE eo.edition_id=? ORDER BY l.id');
    $orders->execute([$id]);
    $candidate=$edition; $candidate['deleted_at']=null;
    $edition['file_url']=(new EditionIntegrityService($pdo))->editionFileIsPublishable($candidate) ? '/api/editions/'.(int)$id.'/trash-pdf' : null;
    Response::json(['edition'=>$edition,'orders'=>$orders->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function downloadTrashed($id){
    $this->requireAdmin();
    $pdo=Database::pdo();
    $stmt=$pdo->prepare('SELECT * FROM editions WHERE id=? AND deleted_at IS NOT NULL');
    $stmt->execute([$id]); $edition=$stmt->fetch(PDO::FETCH_ASSOC);
    if (!$edition) return Response::json(['error'=>'not_found'],404);
    $edition['deleted_at']=null;
    if (!(new EditionIntegrityService($pdo))->editionFileIsPublishable($edition)) return Response::json(['error'=>'PDF no disponible o inválido.'],404);
    $path=$this->locateUploadedFile((int)$edition['file_id']);
    if (!$path) return Response::json(['error'=>'not_found'],404);
    $this->streamPdf($path,'edicion-'.$edition['code'].'.pdf',true);
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
    $fields = ['date'];
    if (isset($in['date'])) {
      $date = DateTimeImmutable::createFromFormat('!Y-m-d',(string)$in['date']);
      $yearStmt=$pdo->prepare('SELECT publication_year FROM editions WHERE id=?'); $yearStmt->execute([$id]);
      if (!$date || $date->format('Y-m-d') !== $in['date'] || (int)$date->format('Y') > (int)substr(EditorialClock::today(),0,4) || (int)$date->format('Y') !== (int)$yearStmt->fetchColumn()) return Response::json(['error'=>'Fecha inválida; conserva el año de la edición.'],422);
    }
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
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn(int $id): bool => $id > 0)));
    if ($ids === []) {
        return Response::json(['error'=>'La edición debe conservar al menos una solicitud asociada.'], 422);
    }
    
    try {
        $orderService = new EditionOrderService($pdo);
        $cnt = $orderService->setOrdersForEdition($id, $ids, (int)$u['id']);
        
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
          $s = $pdo->prepare(
              "SELECT lr.id FROM legal_requests lr WHERE lr.status='En trámite' "
              . 'AND NOT EXISTS ('
              . 'SELECT 1 FROM edition_orders eo JOIN editions e ON e.id=eo.edition_id '
              . 'WHERE eo.legal_request_id=lr.id AND e.deleted_at IS NULL'
              . ') ORDER BY lr.created_at ASC LIMIT ' . max(1, $limit)
          );
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
              $cnt = $orderService->setOrdersForEdition($id, $mergedIds, (int)$u['id']);
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
      
      require_once __DIR__ . '/Services/EditionReadinessService.php';
      $readiness = (new EditionReadinessService($pdo))->check((int)$id);
      if (!$readiness['ready']) {
          return Response::json([
              'error' => 'not_ready',
              'message' => 'La edición no está lista para ser publicada.',
              'blockers' => $readiness['blockers']
          ], 409);
      }

      require_once __DIR__ . '/Services/EditionPublicationService.php';
      $service = new EditionPublicationService($pdo);
      
      try {
          $service->publish((int)$id, (int)$u['id']);
          Response::json(['ok' => true]);
      } catch (RuntimeException $e) {
          $code = $e->getCode() ?: 500;
          Response::json(['error' => $e->getMessage()], $code);
      } catch (Throwable $e) {
          Response::json(['error' => 'Error inesperado durante la publicación.'], 500);
      }
    }

    public function readiness($id) {
        $this->requireAdmin();
        $pdo = Database::pdo();
        require_once __DIR__ . '/Services/EditionReadinessService.php';
        $readiness = (new EditionReadinessService($pdo))->check((int)$id);
        Response::json($readiness);
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
    $ed = $pdo->prepare('SELECT status, code, file_id FROM editions WHERE id=? AND deleted_at IS NULL');
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
    
    $maxMb = min(50, max(1, (int) (getenv('MAX_FILE_MB') ?: 50)));
    if ($size > $maxMb * 1024 * 1024) return Response::json(['error'=>"PDF demasiado grande (max {$maxMb}MB)"],400);

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
    
    // Check page count and parseability
    try {
        require_once __DIR__ . '/Services/PdfInspector.php';
        $pages = (new PdfInspector())->pageCount($tmp);
        if ($pages < 1) {
            return Response::json(['error'=>'El PDF debe tener al menos una página.'], 422);
        }
    } catch (Throwable $e) {
        return Response::json(['error'=>'El PDF final cargado no pudo ser inspeccionado (podría estar dañado o usar un formato no soportado).'], 422);
    }

    $uploadDir = StoragePath::getUploadsDir();
    $relativeDir = 'editions/' . (int) $id . '/consolidated';
    $targetDir = $uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDir);
    if (!is_dir($targetDir) && !mkdir($targetDir, 0750, true) && !is_dir($targetDir)) {
      return Response::json(['error'=>'No se pudo crear el directorio de la edición.'],500);
    }
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
    $path = $relativeDir . '/' . bin2hex(random_bytes(16)) . '_' . $safeName;
    $dest = $uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);

    if (!move_uploaded_file($tmp, $dest)) {
      return Response::json(['error'=>'No se pudo guardar el archivo físico'],500);
    }
    @chmod($dest, 0640);

    $pdo->beginTransaction();
    try {
      $lockedEdition = $pdo->prepare(
        'SELECT status,file_id FROM editions WHERE id=? AND deleted_at IS NULL' . $lockClause
      );
      $lockedEdition->execute([$id]);
      $locked = $lockedEdition->fetch(PDO::FETCH_ASSOC);
      if (!$locked || ($locked['status'] ?? '') !== 'Borrador') {
        throw new RuntimeException('La edición cambió mientras se cargaba el PDF.', 409);
      }

      $checksum = hash_file('sha256', $dest);
      if ($checksum === false) throw new RuntimeException('No se pudo calcular la integridad del PDF.', 500);
      $now = gmdate('Y-m-d H:i:s');
      $stmt = $pdo->prepare('INSERT INTO files(name,path,size,type,checksum,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
      $stmt->execute([$name,$path,$size,'pdf',$checksum,'uploaded',$now,$now]);
      $fileId = (int)$pdo->lastInsertId();
      $pdo->prepare('UPDATE editions SET file_id=?, file_name=? WHERE id=?')->execute([$fileId,$name,$id]);

      $oldFileId = (int) ($locked['file_id'] ?? 0);
      if ($oldFileId > 0 && $oldFileId !== $fileId) {
        $pdo->prepare(
          "UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?"
        )->execute([$now,$now,$oldFileId]);
      }
      
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

  public function prepareOrderPdf($id, $orderId){
    $u = $this->requireAdmin();
    try {
      require_once __DIR__ . '/Services/EditionOrderPdfService.php';
      $result = (new EditionOrderPdfService(Database::pdo()))->prepareFromRequest(
        (int) $id,
        (int) $orderId,
        (int) $u['id']
      );
      Response::json($result);
    } catch (Throwable $e) {
      $code = (int) $e->getCode();
      if ($code < 400 || $code > 599) $code = 500;
      if ($code >= 500) error_log('[edition.order.prepare] ' . $e->getMessage());
      Response::json(['error'=>$e->getMessage() ?: 'No se pudo preparar el PDF individual.'], $code);
    }
  }

  public function uploadOrderPdf($id, $orderId){
    $u = $this->requireAdmin();
    if (!isset($_FILES['file'])) return Response::json(['error'=>'Debe seleccionar un archivo PDF.'], 400);
    try {
      require_once __DIR__ . '/Services/EditionOrderPdfService.php';
      $result = (new EditionOrderPdfService(Database::pdo()))->upload(
        (int) $id,
        (int) $orderId,
        (int) $u['id'],
        $_FILES['file']
      );
      Response::json($result);
    } catch (Throwable $e) {
      $code = (int) $e->getCode();
      if ($code < 400 || $code > 599) $code = 500;
      if ($code >= 500) error_log('[edition.order.upload] ' . $e->getMessage());
      Response::json(['error'=>$e->getMessage() ?: 'No se pudo cargar el PDF individual.'], $code);
    }
  }

  public function downloadOrderPdf($id, $orderId){
    require_once __DIR__.'/AuthController.php';
    $user = AuthController::requireAuth();
    try {
      $pdo = Database::pdo();
      $access = $pdo->prepare(
        'SELECT l.user_id,e.status FROM edition_orders eo '
        . 'JOIN editions e ON e.id=eo.edition_id '
        . 'JOIN legal_requests l ON l.id=eo.legal_request_id '
        . 'WHERE eo.edition_id=? AND eo.legal_request_id=? AND e.deleted_at IS NULL'
      );
      $access->execute([(int) $id, (int) $orderId]);
      $row = $access->fetch(PDO::FETCH_ASSOC);
      if (!$row) throw new RuntimeException('La solicitud no pertenece a esta edición.', 404);
      $role = strtolower((string) ($user['role'] ?? ''));
      $canManage = in_array($role, ['admin','superadmin','manager','staff'], true);
      $isPublishedOwner = ($row['status'] ?? '') === 'Publicada'
        && (int) $row['user_id'] === (int) ($user['id'] ?? 0);
      if (!$canManage && !$isPublishedOwner) {
        throw new RuntimeException('No tiene acceso a este PDF individual.', 403);
      }

      require_once __DIR__ . '/Services/EditionOrderPdfService.php';
      $file = (new EditionOrderPdfService($pdo))->get((int) $id, (int) $orderId);
      $path = StoragePath::getFile((string) $file['path']);
      $name = (string) ($file['publication_file_name'] ?: ('solicitud-' . $orderId . '.pdf'));
      $forceDownload = isset($_GET['download']) && $_GET['download'] === '1';
      $this->streamPdf($path, $name, $forceDownload);
    } catch (Throwable $e) {
      $code = (int) $e->getCode();
      if ($code < 400 || $code > 599) $code = 500;
      Response::json(['error'=>$e->getMessage() ?: 'No se encontró el PDF individual.'], $code);
    }
  }
}
