<?php
namespace App\Repositories;

use PDO;

final class LegalRepository {
  public function __construct(private PDO $pdo){}

  public function list(array $filters, bool $isStaff, int $userId): array {
    $sql = 'SELECT * FROM legal_requests WHERE 1=1';
    $params = [];
    if (!$isStaff) { $sql .= ' AND user_id = ?'; $params[] = $userId; }
    if (($filters['status'] ?? '') !== '' && ($filters['status'] ?? '') !== 'Todos') {
      $sql .= ' AND status = ?'; $params[] = $filters['status'];
    }
    if (($filters['q'] ?? '') !== '') {
      $sql .= ' AND (name LIKE ? OR document LIKE ?)';
      $params[] = '%'.$filters['q'].'%';
      $params[] = '%'.$filters['q'].'%';
    }
    $sql .= ' ORDER BY id DESC';
    $stmt = $this->pdo->prepare($sql); $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function find(int $id): ?array {
    $stmt = $this->pdo->prepare('SELECT * FROM legal_requests WHERE id = ?');
    $stmt->execute([$id]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  }

  public function insert(array $data): int {
    $stmt = $this->pdo->prepare('INSERT INTO legal_requests (user_id,status,name,document,pub_type,meta,date,folios,created_at) VALUES (?,?,?,?,?,?,?,?,datetime("now"))');
    $stmt->execute([
      $data['user_id'], $data['status'], $data['name'], $data['document'], $data['pub_type'], $data['meta'] ?? '{}', $data['date'], (int)($data['folios'] ?? 1)
    ]);
    return (int)$this->pdo->lastInsertId();
  }

  public function updateStatus(int $id, string $status): void {
    $stmt = $this->pdo->prepare('UPDATE legal_requests SET status = ?, updated_at = datetime("now") WHERE id = ?');
    $stmt->execute([$status,$id]);
  }

  public function addPayment(int $legalId, array $p): int {
    $stmt = $this->pdo->prepare('INSERT INTO legal_payments (legal_request_id,type,bank,ref,date,amount_bs,created_at) VALUES (?,?,?,?,?,?,datetime("now"))');
    $stmt->execute([$legalId,$p['type'],$p['bank'],$p['ref'],$p['date'],$p['amount_bs']]);
    return (int)$this->pdo->lastInsertId();
  }

  public function deletePayment(int $legalId, int $paymentId): void {
    $stmt = $this->pdo->prepare('DELETE FROM legal_payments WHERE id = ? AND legal_request_id = ?');
    $stmt->execute([$paymentId,$legalId]);
  }

  public function listPayments(int $legalId): array {
    $stmt = $this->pdo->prepare('SELECT * FROM legal_payments WHERE legal_request_id = ? ORDER BY id DESC');
    $stmt->execute([$legalId]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}
