<?php
namespace App\Core;

use Throwable;

final class ErrorMiddleware implements Middleware {
  public function handle(string $method, string $uri, array $vars, callable $next){
    try {
      return $next();
    } catch (Throwable $e) {
      http_response_code(500);
      header('Content-Type: application/json');
      echo json_encode([
        'error' => 'Internal Server Error',
        'message' => getenv('APP_DEBUG') ? $e->getMessage() : 'Unexpected error',
      ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      return null;
    }
  }
}
