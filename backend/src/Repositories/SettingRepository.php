<?php

declare(strict_types=1);

final class SettingRepository
{
    private bool $hasCreatedAt;

    public function __construct(private PDO $pdo)
    {
        $this->hasCreatedAt = $this->detectCreatedAtColumn();
    }

    /** @return array<string, string> */
    public function getMany(array $keys): array
    {
        $keys = array_values(array_unique(array_map('strval', $keys)));
        if ($keys === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->pdo->prepare("SELECT `key`, value FROM settings WHERE `key` IN ({$placeholders})");
        $stmt->execute($keys);

        $settings = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $settings[(string) $row['key']] = (string) $row['value'];
        }
        return $settings;
    }

    public function set(string $key, string $value, ?string $now = null): void
    {
        $now ??= gmdate('Y-m-d H:i:s');
        $driver = (string) $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'sqlite') {
            $sql = $this->hasCreatedAt
                ? 'INSERT INTO settings(`key`,value,created_at,updated_at) VALUES(?,?,?,?) '
                    . 'ON CONFLICT(`key`) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at'
                : 'INSERT INTO settings(`key`,value,updated_at) VALUES(?,?,?) '
                    . 'ON CONFLICT(`key`) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at';
        } else {
            $sql = $this->hasCreatedAt
                ? 'INSERT INTO settings(`key`,value,created_at,updated_at) VALUES(?,?,?,?) '
                    . 'ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=VALUES(updated_at)'
                : 'INSERT INTO settings(`key`,value,updated_at) VALUES(?,?,?) '
                    . 'ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=VALUES(updated_at)';
        }

        $params = $this->hasCreatedAt
            ? [$key, $value, $now, $now]
            : [$key, $value, $now];
        $this->pdo->prepare($sql)->execute($params);
    }

    private function detectCreatedAtColumn(): bool
    {
        $driver = (string) $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $stmt = $this->pdo->query('PRAGMA table_info(settings)');
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $column) {
                if (($column['name'] ?? '') === 'created_at') {
                    return true;
                }
            }
            return false;
        }

        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.columns "
            . "WHERE table_schema=DATABASE() AND table_name='settings' AND column_name='created_at'"
        );
        $stmt->execute();
        return (int) $stmt->fetchColumn() > 0;
    }
}
