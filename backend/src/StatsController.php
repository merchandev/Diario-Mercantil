<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';

class StatsController {
  public function get(){
    $pdo = Database::pdo();
    $pubs = (int)$pdo->query('SELECT COUNT(*) FROM legal_requests')->fetchColumn();
    $ed = (int)$pdo->query('SELECT COUNT(*) FROM editions')->fetchColumn();
    $usersActive = 0;
    try {
      $usersActive = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE COALESCE(status,'active')='active'")->fetchColumn();
    } catch (Throwable $e) {
      $usersActive = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }
    Response::json(['publications'=>$pubs,'editions'=>$ed,'users_active'=>$usersActive]);
  }
  public function clear(){
    // Only admins can clear
    $user = AuthController::currentUser();
    if (!$user || ($user['role'] ?? '') !== 'admin') return Response::json(['error'=>'forbidden'],403);
    $pdo = Database::pdo();
    $pdo->beginTransaction();
    try {
      $pdo->exec('DELETE FROM edition_orders');
      $pdo->exec('DELETE FROM editions');
      $pdo->exec('DELETE FROM legal_payments');
      $pdo->exec('DELETE FROM legal_requests');
      $pdo->exec('DELETE FROM publications');
      $pdo->commit();
    } catch (Throwable $e) {
      $pdo->rollBack();
      return Response::json(['ok'=>false,'error'=>'clear_failed'],500);
    }
    $this->get();
  }
}
