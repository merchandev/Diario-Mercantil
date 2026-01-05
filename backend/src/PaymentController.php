<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class PaymentController {
  public function list(){
    $pdo = Database::pdo();
    $stmt = $pdo->query('SELECT * FROM payment_methods ORDER BY id DESC');
    Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }
  public function create(){
    $u = AuthController::userFromToken(AuthController::bearerToken());
    if (!$u || ($u['role'] ?? '') !== 'admin') {
      return Response::json(['error'=>'forbidden'], 403);
    }
    $pdo = Database::pdo();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $type = $input['type'] ?? 'transfer';
    $bank = $input['bank'] ?? '';
    $account = $input['account'] ?? '';
    $holder = $input['holder'] ?? '';
    $rif = $input['rif'] ?? '';
    $phone = $input['phone'] ?? '';
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO payment_methods(type,bank,account,holder,rif,phone,created_at) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$type,$bank,$account,$holder,$rif,$phone,$now]);
    Response::json(['ok'=>true,'id'=>$pdo->lastInsertId()]);
  }
  public function delete($id){
    $u = AuthController::userFromToken(AuthController::bearerToken());
    if (!$u || ($u['role'] ?? '') !== 'admin') {
      return Response::json(['error'=>'forbidden'], 403);
    }
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM payment_methods WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }
}
