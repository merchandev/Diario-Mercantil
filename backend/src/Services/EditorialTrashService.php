<?php
declare(strict_types=1);

require_once __DIR__ . '/EditorialClock.php';

/** Reversible editorial deletion. Archived associations never reserve a live request. */
final class EditorialTrashService
{
    public function __construct(private PDO $pdo) {}

    private function lock(): string
    {
        return $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
    }

    private function transaction(callable $action): array
    {
        $this->pdo->beginTransaction();
        try {
            $result = $action();
            $this->pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    private function audit(int $actor, string $action, string $type, int $id): void
    {
        $this->pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
            ->execute([$actor, $action, $type, $id]);
    }

    private function edition(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM editions WHERE id=?' . $this->lock());
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new RuntimeException('Edición no encontrada.', 404);
        return $row;
    }

    private function request(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM legal_requests WHERE id=?' . $this->lock());
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new RuntimeException('Publicación no encontrada.', 404);
        return $row;
    }

    private function orders(int $editionId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM edition_orders WHERE edition_id=? ORDER BY legal_request_id' . $this->lock());
        $stmt->execute([$editionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function archive(array $edition, array $orders, int $actor, string $reason): void
    {
        $snapshot = json_encode(['edition'=>$edition, 'orders'=>$orders], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $this->pdo->prepare('INSERT INTO edition_archives(edition_id,file_id,snapshot_json,actor_user_id,reason,created_at) VALUES(?,?,?,?,?,?)')
            ->execute([(int)$edition['id'], $edition['file_id'] ?: null, $snapshot, $actor, $reason, EditorialClock::now()->format('Y-m-d H:i:s')]);
    }

    private function activeAssociation(int $requestId, ?int $exceptEdition = null): ?array
    {
        $stmt = $this->pdo->prepare('SELECT e.id,e.code,e.status FROM edition_orders eo JOIN editions e ON e.id=eo.edition_id WHERE eo.legal_request_id=? AND e.deleted_at IS NULL AND e.id<>? ORDER BY e.id LIMIT 1');
        $stmt->execute([$requestId, $exceptEdition ?? 0]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function trashEdition(int $id, int $actor): array
    {
        return $this->transaction(function () use ($id, $actor): array {
            $edition = $this->edition($id);
            if ($edition['deleted_at'] !== null) return ['ok'=>true, 'requests_requeued'=>0];
            $orders = $this->orders($id);
            $this->archive($edition, $orders, $actor, 'trash_edition');
            $this->pdo->prepare('UPDATE editions SET deleted_at=? WHERE id=?')
                ->execute([EditorialClock::now()->format('Y-m-d H:i:s'), $id]);
            $count = 0;
            foreach ($orders as $order) {
                $requestId = (int)$order['legal_request_id'];
                $request = $this->request($requestId);
                // A legacy archived association must not alter a different active edition.
                if ($request['deleted_at'] !== null || $this->activeAssociation($requestId, $id)) continue;
                $this->pdo->prepare("UPDATE legal_requests SET status='Por verificar',publish_date=NULL,edition_code=NULL WHERE id=?")
                    ->execute([$requestId]);
                $this->audit($actor, 'edition_trash_requeue_verification', 'legal_request', $requestId);
                $count++;
            }
            $this->audit($actor, 'trash_edition', 'edition', $id);
            return ['ok'=>true, 'requests_requeued'=>$count];
        });
    }

    public function restoreEdition(int $id, int $actor): array
    {
        return $this->transaction(function () use ($id, $actor): array {
            $edition = $this->edition($id);
            if ($edition['deleted_at'] === null) throw new RuntimeException('La edición no está en la papelera.', 409);
            $orders = $this->orders($id);
            foreach ($orders as $order) {
                $requestId = (int)$order['legal_request_id'];
                $request = $this->request($requestId);
                if ($request['deleted_at'] !== null) throw new RuntimeException("Restaura primero la publicación {$requestId} desde la papelera.", 409);
                if ($other = $this->activeAssociation($requestId, $id)) {
                    throw new RuntimeException("La publicación {$requestId} ya pertenece a la edición activa {$other['code']}. Retira esa edición antes de restaurar esta composición.", 409);
                }
                if (!in_array($request['status'], ['Por verificar','En trámite'], true)) {
                    throw new RuntimeException("La publicación {$requestId} debe estar Por verificar o En trámite para restaurar la edición.", 409);
                }
            }
            $this->archive($edition, $orders, $actor, 'restore_edition_to_draft');
            // Keep the previous published snapshot and identity as historical evidence.
            // Editing always requires a newly uploaded final before publishing again.
            $this->pdo->prepare("UPDATE editions SET deleted_at=NULL,status='Borrador',file_id=NULL,file_name=NULL WHERE id=?")->execute([$id]);
            $this->audit($actor, 'restore_edition_to_draft', 'edition', $id);
            return ['ok'=>true, 'status'=>'Borrador', 'requires_final_pdf'=>true];
        });
    }

    public function trashPublication(int $id, int $actor, bool $isAdmin): array
    {
        return $this->transaction(function () use ($id, $actor, $isAdmin): array {
            $stmt = $this->pdo->prepare('SELECT e.id FROM editions e JOIN edition_orders eo ON eo.edition_id=e.id WHERE eo.legal_request_id=? AND e.deleted_at IS NULL ORDER BY e.id');
            $stmt->execute([$id]);
            $editions = [];
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $editionId) {
                $edition = $this->edition((int)$editionId);
                if ($edition['deleted_at'] !== null) continue;
                if ($edition['status'] === 'Publicada') throw new RuntimeException("Retira primero la edición {$edition['code']}; su PDF ya fue publicado.", 409);
                $editions[] = $edition;
            }
            $request = $this->request($id);
            if (!$isAdmin && ($request['status'] !== 'Borrador' || (int)$request['user_id'] !== $actor)) {
                throw new RuntimeException('Solo puedes enviar a la papelera tus solicitudes en Borrador.', 403);
            }
            if ($request['deleted_at'] !== null) return ['ok'=>true];
            foreach ($editions as $edition) {
                $editionId = (int)$edition['id'];
                $this->archive($edition, $this->orders($editionId), $actor, 'trash_publication_changes_composition');
                $this->pdo->prepare('DELETE FROM edition_orders WHERE edition_id=? AND legal_request_id=?')->execute([$editionId, $id]);
                $this->pdo->prepare('UPDATE editions SET file_id=NULL,file_name=NULL,orders_count=(SELECT COUNT(*) FROM edition_orders WHERE edition_id=?) WHERE id=?')->execute([$editionId, $editionId]);
                $this->audit($actor, 'edition_final_invalidated_due_composition', 'edition', $editionId);
            }
            $this->pdo->prepare('UPDATE legal_requests SET deleted_at=? WHERE id=?')->execute([EditorialClock::now()->format('Y-m-d H:i:s'), $id]);
            $this->audit($actor, 'trash_legal_request', 'legal_request', $id);
            return ['ok'=>true];
        });
    }

    public function restorePublication(int $id, int $actor, bool $isAdmin): array
    {
        return $this->transaction(function () use ($id, $actor, $isAdmin): array {
            $request = $this->request($id);
            if ($request['deleted_at'] === null) throw new RuntimeException('La publicación no está en la papelera.', 409);
            if (!$isAdmin && ($request['status'] !== 'Borrador' || (int)$request['user_id'] !== $actor)) {
                throw new RuntimeException('Solo puedes restaurar tus solicitudes en Borrador.', 403);
            }
            if ($other = $this->activeAssociation($id)) throw new RuntimeException("La publicación mantiene una asociación con la edición activa {$other['code']}. Retira esa edición primero.", 409);
            $status = $isAdmin ? 'Por verificar' : 'Borrador';
            $this->pdo->prepare('UPDATE legal_requests SET deleted_at=NULL,status=?,publish_date=NULL,edition_code=NULL WHERE id=?')->execute([$status, $id]);
            $this->audit($actor, 'restore_legal_request', 'legal_request', $id);
            return ['ok'=>true, 'status'=>$status];
        });
    }
}
