<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Services/EmailService.php';

$pdo = Database::pdo();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Email worker started...\n";

while (true) {
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            SELECT id, type, recipient_email, recipient_name, payload_json, attempts 
            FROM email_outbox 
            WHERE status IN ('pending', 'failed') AND next_attempt_at <= NOW() AND attempts < 3
            LIMIT 1 FOR UPDATE SKIP LOCKED
        ");
        $stmt->execute();
        $job = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$job) {
            $pdo->commit();
            sleep(5);
            continue;
        }

        $id = $job['id'];
        $pdo->prepare("UPDATE email_outbox SET status='processing' WHERE id=?")->execute([$id]);
        $pdo->commit();

        try {
            $payload = json_decode($job['payload_json'], true);
            switch ($job['type']) {
                case 'pending_payment':
                    EmailService::sendPendingPayment($job['recipient_email'], $job['recipient_name'], $payload['orderNo']);
                    break;
                case 'in_review':
                    EmailService::sendInReview($job['recipient_email'], $job['recipient_name'], $payload['orderNo']);
                    break;
                case 'rejected':
                    EmailService::sendRejected($job['recipient_email'], $job['recipient_name'], $payload['orderNo'], $payload['reason'] ?? '');
                    break;
                default:
                    throw new Exception("Unknown email type: " . $job['type']);
            }
            $pdo->prepare("UPDATE email_outbox SET status='sent', sent_at=NOW() WHERE id=?")->execute([$id]);
            echo "Sent email job #{$id} ({$job['type']})\n";
        } catch (Throwable $e) {
            $attempts = $job['attempts'] + 1;
            $status = $attempts >= 3 ? 'failed' : 'pending';
            $nextAttemptAt = date('Y-m-d H:i:s', time() + ($attempts * 60)); // Backoff: 1 min, 2 min, etc.
            
            $pdo->prepare("
                UPDATE email_outbox 
                SET status=?, attempts=?, next_attempt_at=?, last_error=? 
                WHERE id=?
            ")->execute([$status, $attempts, $nextAttemptAt, $e->getMessage(), $id]);
            error_log("Failed to send email outbox #{$id}: " . $e->getMessage());
        }

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Email worker error: " . $e->getMessage());
        sleep(5);
    }
}
