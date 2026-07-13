<?php
require_once __DIR__.'/../Database.php';
require_once __DIR__.'/../AuthController.php';

final class LegalRequestStateMachine {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    private function executeTransition(int $id, string $action, callable $logic) {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            // Lock row
            $stmt = $this->pdo->prepare('SELECT status, created_at FROM legal_requests WHERE id=? FOR UPDATE');
            $stmt->execute([$id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new Exception("Solicitud no encontrada.", 404);
            }
            
            // Execute specific logic
            $result = $logic($req);

            // Audit
            $u = AuthController::userFromToken(AuthController::bearerToken());
            $actorId = $u['id'] ?? null;
            $this->pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
                ->execute([$actorId, $action, 'legal_request', $id]);

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
            
            return $result;

        } catch (Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function submit(int $id): string {
        return $this->executeTransition($id, 'submit', function($req) use ($id) {
            if ($req['status'] !== 'Borrador' && $req['status'] !== 'Rechazado') {
                throw new Exception("La solicitud no está en Borrador ni Rechazado.", 409);
            }

            $now = gmdate('Y-m-d H:i:s');
            $year = substr($req['created_at'], 0, 4) ?: gmdate('Y');
            $orderNo = "ORD-{$year}-" . str_pad((string)$id, 6, "0", STR_PAD_LEFT);

            $update = $this->pdo->prepare("UPDATE legal_requests SET status='Por verificar', submitted_at=?, order_no=? WHERE id=?");
            $update->execute([$now, $orderNo, $id]);
            
            try {
                $userStmt = $this->pdo->prepare("SELECT email, name FROM users WHERE id=(SELECT user_id FROM legal_requests WHERE id=?)");
                $userStmt->execute([$id]);
                $owner = $userStmt->fetch(PDO::FETCH_ASSOC);
                if ($owner && $owner['email']) {
                    require_once __DIR__ . '/EmailService.php';
                    EmailService::sendPendingPayment($owner['email'], $owner['name'], $orderNo);
                }
            } catch (Throwable $e) {
                error_log("Failed to send pending payment email: " . $e->getMessage());
            }

            return $orderNo;
        });
    }

    public function verify(int $id): void {
        $this->executeTransition($id, 'verify', function($req) use ($id) {
            if ($req['status'] !== 'Por verificar') {
                throw new Exception("La solicitud no está en estado 'Por verificar'.", 409);
            }

            $now = gmdate('Y-m-d H:i:s');
            $this->pdo->prepare("UPDATE legal_requests SET status='En trámite', verification_date=? WHERE id=?")
                 ->execute([$now, $id]);
            
            try {
                $userStmt = $this->pdo->prepare("SELECT email, name FROM users WHERE id=(SELECT user_id FROM legal_requests WHERE id=?)");
                $userStmt->execute([$id]);
                $owner = $userStmt->fetch(PDO::FETCH_ASSOC);
                if ($owner && $owner['email']) {
                    require_once __DIR__ . '/EmailService.php';
                    EmailService::sendInReview($owner['email'], $owner['name'], $req['order_no'] ?? "ORD-UNKNOWN");
                }
            } catch (Throwable $e) {
                error_log("Failed to send verify email: " . $e->getMessage());
            }

            return true;
        });
    }

    public function reject(int $id, string $reason = ''): void {
        $this->executeTransition($id, 'reject', function($req) use ($id, $reason) {
            if ($req['status'] !== 'Por verificar') {
                throw new Exception("Solo se puede rechazar una solicitud que está 'Por verificar'.", 409);
            }

            $this->pdo->prepare("UPDATE legal_requests SET status='Rechazado', comment=? WHERE id=?")
                 ->execute([$reason, $id]);
            
            try {
                $userStmt = $this->pdo->prepare("SELECT email, name FROM users WHERE id=(SELECT user_id FROM legal_requests WHERE id=?)");
                $userStmt->execute([$id]);
                $owner = $userStmt->fetch(PDO::FETCH_ASSOC);
                if ($owner && $owner['email']) {
                    require_once __DIR__ . '/EmailService.php';
                    EmailService::sendRejected($owner['email'], $owner['name'], $req['order_no'] ?? "ORD-UNKNOWN", $reason);
                }
            } catch (Throwable $e) {
                error_log("Failed to send reject email: " . $e->getMessage());
            }

            return true;
        });
    }

    public function returnToDraft(int $id, string $comment = 'Devuelto a borrador por administrador.'): void {
        $this->executeTransition($id, 'returnToDraft', function($req) use ($id, $comment) {
            if ($req['status'] !== 'Por verificar' && $req['status'] !== 'En trámite') {
                throw new Exception("Solo se puede devolver a borrador si la solicitud está 'Por verificar' o 'En trámite'.", 409);
            }

            $this->pdo->prepare("UPDATE legal_requests SET status='Borrador', submitted_at=NULL, verification_date=NULL, comment=? WHERE id=?")
                 ->execute([$comment, $id]);
            return true;
        });
    }
}
