<?php
declare(strict_types=1);

final class IdempotencyService
{
    public static function check(PDO $pdo, int $userId, string $key, string $route, string $requestHash): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT response_status, response_body 
             FROM idempotency_keys 
             WHERE user_id = ? AND idempotency_key = ? AND route = ? AND expires_at > NOW()'
        );
        $stmt->execute([$userId, $key, $route]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            return [
                'status' => (int)$row['response_status'],
                'body' => json_decode($row['response_body'], true)
            ];
        }
        return null;
    }

    public static function save(PDO $pdo, int $userId, string $key, string $route, string $requestHash, int $status, array $body): void
    {
        $expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hours
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO idempotency_keys (user_id, idempotency_key, route, request_hash, response_status, response_body, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId, 
            $key, 
            $route, 
            $requestHash, 
            $status, 
            json_encode($body), 
            $expiresAt
        ]);
    }
}
