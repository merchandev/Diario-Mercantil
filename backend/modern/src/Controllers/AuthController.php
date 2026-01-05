<?php
namespace App\Controllers;
use App\Core\Response;
use App\Services\AuthService;
use PDO;

final class AuthController {
  private PDO $pdo; private AuthService $auth;
  public function __construct(PDO $pdo, AuthService $auth){ $this->pdo = $pdo; $this->auth = $auth; }
  public function login(): void {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $doc = trim($in['document'] ?? ''); $pass = $in['password'] ?? '';
    if ($doc === '' || $pass === '') { Response::json(['error'=>'Credenciales requeridas'],400); return; }
    $stmt = $this->pdo->prepare('SELECT id, password_hash, role FROM users WHERE document = ? LIMIT 1');
    $stmt->execute([$doc]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !password_verify($pass, $row['password_hash'])) { Response::json(['error'=>'Credenciales inválidas'],401); return; }
    $token = $this->auth->issueToken((int)$row['id'], $row['role'] ?? 'solicitante');
    Response::json(['token'=>$token]);
  }
  public function me(): void {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($authHeader,'Bearer ')) { Response::json(['error'=>'No autorizado'],401); return; }
    $payload = $this->auth->validate(substr($authHeader,7));
    if (!$payload) { Response::json(['error'=>'Token inválido'],401); return; }
    $stmt = $this->pdo->prepare('SELECT id, name, document, role FROM users WHERE id = ?');
    $stmt->execute([(int)$payload['sub']]); $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) { Response::json(['error'=>'Usuario no encontrado'],404); return; }
    Response::json(['user'=>$user]);
  }
}
