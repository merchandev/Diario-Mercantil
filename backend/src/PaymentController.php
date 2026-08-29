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

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $type = 'pago_movil';
    $bank = trim((string)($input['bank'] ?? ''));
    $holder = trim((string)($input['holder'] ?? ''));
    $rif = mb_strtoupper(trim((string)($input['rif'] ?? '')), 'UTF-8');
    $phone = preg_replace('/\D+/', '', (string)($input['phone'] ?? ''));

    if ($bank === '' || $holder === '' || $rif === '' || $phone === '') {
      return Response::json(['error'=>'missing_fields', 'message'=>'Banco, titular, RIF y teléfono son obligatorios.'], 422);
    }
    if (mb_strlen($bank, 'UTF-8') > 100 || mb_strlen($holder, 'UTF-8') > 255 || mb_strlen($rif, 'UTF-8') > 50) {
      return Response::json(['error'=>'invalid_fields', 'message'=>'Uno de los datos del medio de pago excede la longitud permitida.'], 422);
    }
    if (!preg_match('/^04(12|14|16|22|24|26)\d{7}$/', $phone)) {
      return Response::json(['error'=>'invalid_phone', 'message'=>'El teléfono de Pago Móvil debe incluir un código válido y 7 dígitos.'], 422);
    }

    $pdo = Database::pdo();
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO payment_methods(type,bank,account,holder,rif,phone,created_at) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$type,$bank,'',$holder,$rif,$phone,$now]);
    Response::json(['ok'=>true,'id'=>(int)$pdo->lastInsertId()], 201);
  }
  public function delete($id){
    $u = AuthController::requireAuth();
    if (!$u || !RolePolicy::canManageSettings($u)) {
      return Response::json(['error'=>'forbidden'], 403);
    }
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM payment_methods WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }
}
