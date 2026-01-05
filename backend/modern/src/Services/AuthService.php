<?php
namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

final class AuthService {
  private string $secret;
  private int $ttl;
  public function __construct(){
    $this->secret = getenv('JWT_SECRET') ?: 'dev-secret';
    $this->ttl = (int)(getenv('JWT_TTL') ?: 3600);
  }
  public function issueToken(int $userId, string $role): string {
    $now = time();
    $payload = [
      'sub' => $userId,
      'role'=> $role,
      'iat' => $now,
      'exp' => $now + $this->ttl
    ];
    return JWT::encode($payload, $this->secret, 'HS256');
  }
  public function validate(string $token): ?array {
    try {
      $decoded = JWT::decode($token, new Key($this->secret,'HS256'));
      return (array)$decoded;
    } catch (\Throwable $e) { return null; }
  }
}
