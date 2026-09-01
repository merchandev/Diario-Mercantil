<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';
require_once __DIR__.'/RolePolicy.php';
require_once __DIR__.'/Http/StoragePath.php';

class PaymentController {
  public function list(){
    $pdo = Database::pdo();
    $stmt = $pdo->query('SELECT * FROM payment_methods ORDER BY id DESC');
    Response::json(['items'=>$this->withQrUrls($stmt->fetchAll(PDO::FETCH_ASSOC))]);
  }
  public function create(){
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      return Response::json(['error'=>'forbidden'], 403);
    }

    $data = $this->validatedInput();
    if ($data === null) return;

    $pdo = Database::pdo();
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO payment_methods(type,bank,account,holder,rif,phone,created_at) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$data['type'],$data['bank'],$data['account'],$data['holder'],$data['rif'],$data['phone'],$now]);
    $id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
      ->execute([(int)$u['id'], 'create_payment_method', 'payment_method', $id]);
    Response::json(['ok'=>true,'id'=>$id], 201);
  }
  public function update($id){
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      return Response::json(['error'=>'forbidden'], 403);
    }

    $pdo = Database::pdo();
    $exists = $pdo->prepare('SELECT id FROM payment_methods WHERE id=?');
    $exists->execute([(int)$id]);
    if (!$exists->fetchColumn()) {
      return Response::json(['error'=>'not_found', 'message'=>'El medio de pago no existe.'], 404);
    }

    $data = $this->validatedInput();
    if ($data === null) return;
    $stmt = $pdo->prepare('UPDATE payment_methods SET type=?,bank=?,account=?,holder=?,rif=?,phone=? WHERE id=?');
    $stmt->execute([$data['type'],$data['bank'],$data['account'],$data['holder'],$data['rif'],$data['phone'],(int)$id]);
    $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
      ->execute([(int)$u['id'], 'update_payment_method', 'payment_method', (int)$id]);
    Response::json(['ok'=>true]);
  }
  public function delete($id){
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      return Response::json(['error'=>'forbidden'], 403);
    }
    $pdo = Database::pdo();
    $exists = $pdo->prepare('SELECT id,qr_file_id FROM payment_methods WHERE id=?');
    $exists->execute([(int)$id]);
    $payment = $exists->fetch(PDO::FETCH_ASSOC);
    if (!$payment) {
      return Response::json(['error'=>'not_found', 'message'=>'El medio de pago no existe.'], 404);
    }
    $pdo->beginTransaction();
    try {
      if ((int)($payment['qr_file_id'] ?? 0) > 0) {
        $now = gmdate('Y-m-d H:i:s');
        $pdo->prepare("UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?")
          ->execute([$now, $now, (int)$payment['qr_file_id']]);
      }
      $pdo->prepare('DELETE FROM payment_methods WHERE id=?')->execute([(int)$id]);
      $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
        ->execute([(int)$u['id'], 'delete_payment_method', 'payment_method', (int)$id]);
      $pdo->commit();
      Response::json(['ok'=>true]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  public function uploadQr($id): void {
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      Response::json(['error'=>'forbidden'], 403);
      return;
    }
    $upload = $_FILES['qr'] ?? null;
    if (!is_array($upload) || (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      Response::json(['error'=>'invalid_qr_upload', 'message'=>'Seleccione una imagen QR válida.'], 422);
      return;
    }
    $tmp = (string)($upload['tmp_name'] ?? '');
    $size = (int)($upload['size'] ?? 0);
    $originalExtension = strtolower(pathinfo((string)($upload['name'] ?? ''), PATHINFO_EXTENSION));
    if ($tmp === '' || !is_uploaded_file($tmp) || $size < 1 || $size > 3 * 1024 * 1024) {
      Response::json(['error'=>'invalid_qr_size', 'message'=>'El QR debe ser una imagen PNG o JPG de hasta 3 MB.'], 422);
      return;
    }
    $mime = (string)(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    $extensions = ['image/png'=>'png', 'image/jpeg'=>'jpg'];
    $dimensions = @getimagesize($tmp);
    $extensionMatchesMime = $mime === 'image/png'
      ? $originalExtension === 'png'
      : in_array($originalExtension, ['jpg', 'jpeg'], true);
    if (!isset($extensions[$mime]) || !$extensionMatchesMime || $dimensions === false || $dimensions[0] > 4096 || $dimensions[1] > 4096) {
      Response::json(['error'=>'invalid_qr_image', 'message'=>'El QR debe ser una imagen PNG o JPG válida, de máximo 4096 × 4096 píxeles.'], 422);
      return;
    }

    $pdo = Database::pdo();
    $paymentStmt = $pdo->prepare('SELECT id,qr_file_id FROM payment_methods WHERE id=?');
    $paymentStmt->execute([(int)$id]);
    $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
    if (!$payment) {
      Response::json(['error'=>'not_found', 'message'=>'El medio de pago no existe.'], 404);
      return;
    }
    $base = StoragePath::getUploadsDir();
    $datePath = 'payment-qr/' . gmdate('Y/m');
    $targetDir = $base . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $datePath);
    if (!is_dir($targetDir) && !mkdir($targetDir, 0750, true) && !is_dir($targetDir)) {
      Response::json(['error'=>'storage_not_writable', 'message'=>'No se pudo preparar el almacenamiento del QR.'], 500);
      return;
    }
    $extension = $extensions[$mime];
    $storageName = bin2hex(random_bytes(16)) . '.' . $extension;
    $relativePath = $datePath . '/' . $storageName;
    $absolutePath = $targetDir . DIRECTORY_SEPARATOR . $storageName;
    if (!move_uploaded_file($tmp, $absolutePath)) {
      Response::json(['error'=>'qr_upload_failed', 'message'=>'No se pudo guardar la imagen QR.'], 500);
      return;
    }
    @chmod($absolutePath, 0640);

    try {
      $pdo->beginTransaction();
      $now = gmdate('Y-m-d H:i:s');
      $file = $pdo->prepare(
        'INSERT INTO files(name,path,size,type,checksum,version,status,owner,created_at,updated_at) '
        . 'VALUES(?,?,?,?,?,?,?,?,?,?)'
      );
      $file->execute([
        basename((string)($upload['name'] ?? 'qr.' . $extension)),
        $relativePath,
        $size,
        $extension,
        hash_file('sha256', $absolutePath),
        1,
        'processed',
        (string)$u['id'],
        $now,
        $now,
      ]);
      $fileId = (int)$pdo->lastInsertId();
      $pdo->prepare('INSERT INTO file_events(file_id,ts,type,message) VALUES(?,?,?,?)')
        ->execute([$fileId, $now, 'payment_qr_uploaded', 'QR de medio de pago cargado']);
      $pdo->prepare('UPDATE payment_methods SET qr_file_id=?,qr_updated_at=? WHERE id=?')
        ->execute([$fileId, $now, (int)$id]);
      $oldFileId = (int)($payment['qr_file_id'] ?? 0);
      if ($oldFileId > 0 && $oldFileId !== $fileId) {
        $pdo->prepare("UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?")
          ->execute([$now, $now, $oldFileId]);
      }
      $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
        ->execute([(int)$u['id'], $oldFileId > 0 ? 'replace_payment_qr' : 'upload_payment_qr', 'payment_method', (int)$id]);
      $pdo->commit();
      Response::json(['ok'=>true, 'file_id'=>$fileId, 'qr_url'=>$this->qrUrl((int)$id)]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      if (is_file($absolutePath) && !unlink($absolutePath)) {
        error_log('[payment-qr] No se pudo limpiar el archivo tras el rollback: ' . $absolutePath);
      }
      error_log('[payment-qr] ' . $e->getMessage());
      Response::json(['error'=>'qr_upload_failed', 'message'=>'No se pudo registrar la imagen QR.'], 500);
    }
  }

  public function deleteQr($id): void {
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      Response::json(['error'=>'forbidden'], 403);
      return;
    }
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT qr_file_id FROM payment_methods WHERE id=?');
    $stmt->execute([(int)$id]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$payment) {
      Response::json(['error'=>'not_found', 'message'=>'El medio de pago no existe.'], 404);
      return;
    }
    $fileId = (int)($payment['qr_file_id'] ?? 0);
    $pdo->beginTransaction();
    try {
      $now = gmdate('Y-m-d H:i:s');
      $pdo->prepare('UPDATE payment_methods SET qr_file_id=NULL,qr_updated_at=? WHERE id=?')
        ->execute([$now, (int)$id]);
      if ((int)$fileId > 0) {
        $pdo->prepare("UPDATE files SET status='replaced',deleted_at=?,updated_at=? WHERE id=?")
          ->execute([$now, $now, (int)$fileId]);
      }
      $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
        ->execute([(int)$u['id'], 'delete_payment_qr', 'payment_method', (int)$id]);
      $pdo->commit();
      Response::json(['ok'=>true]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  public function serveQr($id): void {
    AuthController::requireAuth();
    $pdo = Database::pdo();
    $stmt = $pdo->prepare(
      'SELECT f.name,f.path,f.type FROM payment_methods pm '
      . 'JOIN files f ON f.id=pm.qr_file_id '
      . 'WHERE pm.id=? AND f.deleted_at IS NULL'
    );
    $stmt->execute([(int)$id]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$file) {
      Response::json(['error'=>'not_found', 'message'=>'Este medio de pago no tiene un QR disponible.'], 404);
      return;
    }
    try {
      $path = StoragePath::getFile((string)$file['path']);
    } catch (RuntimeException) {
      Response::json(['error'=>'qr_missing', 'message'=>'La imagen QR no está disponible.'], 404);
      return;
    }
    $mime = strtolower((string)$file['type']) === 'png' ? 'image/png' : 'image/jpeg';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename*=UTF-8\'\'' . rawurlencode((string)$file['name']));
    header('Cache-Control: private, no-cache, must-revalidate');
    readfile($path);
  }

  private function qrUrl(int $id): string {
    return '/api/payment-methods/' . $id . '/qr';
  }

  private function withQrUrls(array $items): array {
    return array_map(function (array $item): array {
      $item['qr_url'] = (int)($item['qr_file_id'] ?? 0) > 0 ? $this->qrUrl((int)$item['id']) : null;
      return $item;
    }, $items);
  }

  private function validatedInput(): ?array {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $bank = trim((string)($input['bank'] ?? ''));
    $holder = trim((string)($input['holder'] ?? ''));
    $rif = mb_strtoupper(trim((string)($input['rif'] ?? '')), 'UTF-8');
    $phone = preg_replace('/\D+/', '', (string)($input['phone'] ?? ''));

    if ($bank === '' || $holder === '' || $rif === '' || $phone === '') {
      Response::json(['error'=>'missing_fields', 'message'=>'Banco, titular, RIF y teléfono son obligatorios.'], 422);
      return null;
    }
    if (mb_strlen($bank, 'UTF-8') > 100 || mb_strlen($holder, 'UTF-8') > 255 || mb_strlen($rif, 'UTF-8') > 50) {
      Response::json(['error'=>'invalid_fields', 'message'=>'Uno de los datos del medio de pago excede la longitud permitida.'], 422);
      return null;
    }
    if (!preg_match('/^04(12|14|16|22|24|26)\d{7}$/', $phone)) {
      Response::json(['error'=>'invalid_phone', 'message'=>'El teléfono de Pago Móvil debe incluir un código válido y 7 dígitos.'], 422);
      return null;
    }

    return [
      'type' => 'pago_movil',
      'bank' => $bank,
      'account' => '',
      'holder' => $holder,
      'rif' => $rif,
      'phone' => $phone,
    ];
  }
}
