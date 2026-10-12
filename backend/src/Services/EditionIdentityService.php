<?php
declare(strict_types=1);

/** Visible numbers may be reused; the CVE and legacy links always identify one record. */
final class EditionIdentityService
{
    public function __construct(private PDO $pdo) {}

    public static function code(int $year, int $number): string
    {
        $roman = '';
        foreach (['M'=>1000,'CM'=>900,'D'=>500,'CD'=>400,'C'=>100,'XC'=>90,'L'=>50,'XL'=>40,'X'=>10,'IX'=>9,'V'=>5,'IV'=>4,'I'=>1] as $letter=>$value) {
            while ($year >= $value) { $roman .= $letter; $year -= $value; }
        }
        return $roman . '-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT);
    }

    public static function cve(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $value = '';
        for ($i = 0; $i < 8; $i++) $value .= $alphabet[random_int(0, 35)];
        return 'DMV-' . $value;
    }

    /** Retry only a CVE collision, never a number/composition conflict. */
    public static function insertWithCve(PDOStatement $statement, array $params, int $cveIndex): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $params[$cveIndex] = self::cve();
            try {
                $statement->execute($params);
                return $params[$cveIndex];
            } catch (PDOException $error) {
                $message = strtolower((string)($error->errorInfo[2] ?? $error->getMessage()));
                if (!str_contains($message, 'uq_editions_cve') && !str_contains($message, 'editions.cve')) throw $error;
                if ($attempt === 4) throw $error;
            }
        }
        throw new RuntimeException('No se pudo reservar un CVE único.');
    }

    /** Must run inside the yearly reservation transaction. */
    public function nextNumber(int $year): int
    {
        $sqlite = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $this->pdo->prepare($sqlite
            ? 'INSERT OR IGNORE INTO edition_sequences(publication_year,last_number) VALUES(?,0)'
            : 'INSERT IGNORE INTO edition_sequences(publication_year,last_number) VALUES(?,0)')->execute([$year]);
        $s = $this->pdo->prepare('SELECT last_number FROM edition_sequences WHERE publication_year=?' . ($sqlite ? '' : ' FOR UPDATE'));
        $s->execute([$year]); $s->fetchColumn();
        $s = $this->pdo->prepare('SELECT edition_no FROM editions WHERE publication_year=? AND deleted_at IS NULL ORDER BY edition_no');
        $s->execute([$year]);
        $number = 1;
        foreach ($s->fetchAll(PDO::FETCH_COLUMN) as $used) {
            if ((int)$used === $number) $number++;
            elseif ((int)$used > $number) break;
        }
        $this->pdo->prepare('UPDATE edition_sequences SET last_number=? WHERE publication_year=?')->execute([$number,$year]);
        return $number;
    }

    public function resolve(string $identity): ?array
    {
        $s = $this->pdo->prepare('SELECT * FROM editions WHERE cve=? LIMIT 1');
        $s->execute([$identity]);
        if ($row = $s->fetch(PDO::FETCH_ASSOC)) return $row;
        // A removed legacy edition must never silently resolve to its replacement.
        $s = $this->pdo->prepare('SELECT edition_id FROM edition_link_aliases WHERE alias=?');
        $s->execute([$identity]);
        $id = $s->fetchColumn();
        if ($id !== false) {
            $s = $this->pdo->prepare('SELECT * FROM editions WHERE id=?');
            $s->execute([$id]);
        } else {
            $s = $this->pdo->prepare('SELECT * FROM editions WHERE code=? AND deleted_at IS NULL LIMIT 1');
            $s->execute([$identity]);
        }
        return $s->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
