<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';
require_once __DIR__.'/RolePolicy.php';

class PaymentController {
  public function list(){
    $pdo = Database::pdo();
    $stmt = $pdo->query('SELECT * FROM payment_methods ORDER BY id DESC');
    Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
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
    $exists = $pdo->prepare('SELECT id FROM payment_methods WHERE id=?');
    $exists->execute([(int)$id]);
    if (!$exists->fetchColumn()) {
      return Response::json(['error'=>'not_found', 'message'=>'El medio de pago no existe.'], 404);
    }
    $pdo->prepare('DELETE FROM payment_methods WHERE id=?')->execute([(int)$id]);
    $pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
      ->execute([(int)$u['id'], 'delete_payment_method', 'payment_method', (int)$id]);
    Response::json(['ok'=>true]);
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
