<?php
require_once __DIR__.'/../Database.php';

final class LegalRequestStateMachine {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function submit(int $id): string {
        $stmt = $this->pdo->prepare('SELECT status, created_at FROM legal_requests WHERE id=? FOR UPDATE');
        $stmt->execute([$id]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$req) {
            throw new Exception("Solicitud no encontrada.");
        }
        
        if ($req['status'] !== 'Borrador' && $req['status'] !== 'Rechazado') {
            throw new Exception("La solicitud ya fue formalizada anteriormente o está en un estado inválido.");
        }

        $now = gmdate('Y-m-d H:i:s');
        $year = substr($req['created_at'], 0, 4) ?: gmdate('Y');
        $orderNo = "ORD-{$year}-" . str_pad((string)$id, 6, "0", STR_PAD_LEFT);

        $update = $this->pdo->prepare("UPDATE legal_requests SET status='Por verificar', submitted_at=?, order_no=? WHERE id=?");
        $update->execute([$now, $orderNo, $id]);
        
        return $orderNo;
    }

    public function verify(int $id): void {
        $stmt = $this->pdo->prepare('SELECT status FROM legal_requests WHERE id=? FOR UPDATE');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();

        if ($status !== 'Por verificar') {
            throw new Exception("La solicitud no está en estado 'Por verificar'.");
        }

        $now = gmdate('Y-m-d H:i:s');
        $this->pdo->prepare("UPDATE legal_requests SET status='En trámite', verification_date=? WHERE id=?")
             ->execute([$now, $id]);
    }

    public function reject(int $id, string $reason = ''): void {
        $stmt = $this->pdo->prepare('SELECT status FROM legal_requests WHERE id=? FOR UPDATE');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();

        if ($status === 'Publicada') {
            throw new Exception("No se puede rechazar una solicitud que ya está publicada.");
        }

        $this->pdo->prepare("UPDATE legal_requests SET status='Rechazado', comment=? WHERE id=?")
             ->execute([$reason, $id]);
    }

    public function returnToDraft(int $id, string $comment = 'Devuelto a borrador por administrador.'): void {
        $stmt = $this->pdo->prepare('SELECT status FROM legal_requests WHERE id=? FOR UPDATE');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();

        if ($status === 'Publicada') {
            throw new Exception("No se puede devolver a borrador una solicitud que ya está publicada.");
        }

        $this->pdo->prepare("UPDATE legal_requests SET status='Borrador', submitted_at=NULL, verification_date=NULL, comment=? WHERE id=?")
             ->execute([$comment, $id]);
    }
}
