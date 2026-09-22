<?php
declare(strict_types=1);

/** References in snapshots survive removal of live edition_orders rows. */
final class EditorialArchiveService
{
    public function __construct(private PDO $pdo) {}

    public function references(string $type, int $id): bool
    {
        if ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $exists = $this->pdo->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='edition_archives'");
        } else {
            $exists = $this->pdo->query("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='edition_archives'");
        }
        if (!$exists->fetchColumn()) return false;

        if ($type === 'edition') {
            $stmt = $this->pdo->prepare('SELECT 1 FROM edition_archives WHERE edition_id=? LIMIT 1');
            $stmt->execute([$id]);
            return $stmt->fetchColumn() !== false;
        }

        $rows = $this->pdo->query('SELECT file_id,snapshot_json FROM edition_archives');
        while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
            if ($type === 'file' && (int)$row['file_id'] === $id) return true;
            // Fail closed if an archive cannot be read; never erase its evidence.
            $snapshot = json_decode($row['snapshot_json'], true, 512, JSON_THROW_ON_ERROR);
            foreach ($snapshot['orders'] ?? [] as $order) {
                $key = $type === 'request' ? 'legal_request_id' : 'publication_file_id';
                if ((int)($order[$key] ?? 0) === $id) return true;
            }
        }
        return false;
    }
}
