<?php
namespace App\Core;

use App\Services\AuthService;

final class AuthMiddleware implements Middleware {
  private AuthService $auth;
  public function __construct(AuthService $auth){ $this->auth = $auth; }
  public function handle(string $method, string $uri, array $vars, callable $next){
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($authHeader,'Bearer ')) {
      Response::json(['error'=>'No autorizado'],401); return;
    }
    $payload = $this->auth->validate(substr($authHeader,7));
    if (!$payload) { Response::json(['error'=>'Token inválido'],401); return; }
    // Expose user payload globally (simple approach)
    $GLOBALS['auth_payload'] = $payload;
    return $next();
  }
}
