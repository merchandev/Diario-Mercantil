<?php
declare(strict_types=1);

class EmailOutbox {
    public static function enqueue(PDO $pdo, string $type, string $email, string $name, array $payload): void {
        $stmt = $pdo->prepare("
            INSERT INTO email_outbox (type, recipient_email, recipient_name, payload_json, next_attempt_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $type,
            $email,
            $name,
            json_encode($payload)
        ]);
    }
}
