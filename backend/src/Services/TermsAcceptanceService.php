<?php
declare(strict_types=1);

final class TermsAcceptanceService
{
    public static function current(PDO $pdo): ?array
    {
        $statement = $pdo->prepare("SELECT id,header_html,body_json,footer_html FROM pages WHERE slug='terminos-y-condiciones' AND status='published' LIMIT 1");
        $statement->execute();
        $page = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$page) return null;
        $blocks = json_decode($page['body_json'] ?? '[]', true) ?: [];
        $text = strip_tags(($page['header_html'] ?? '') . ($page['footer_html'] ?? ''));
        foreach ($blocks as $block) $text .= (string)($block['props']['text'] ?? '');
        if (trim($text) === '') return null;
        $snapshot = json_encode([$page['header_html'] ?? '', json_decode($page['body_json'] ?? '[]', true), $page['footer_html'] ?? ''], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return ['id'=>(int)$page['id'], 'version'=>hash('sha256', $snapshot), 'snapshot'=>$snapshot];
    }

    public static function validate(PDO $pdo, array $input): array
    {
        if (($input['terms_accepted'] ?? false) !== true) throw new InvalidArgumentException('Debe aceptar los Términos y condiciones.', 422);
        $terms = self::current($pdo);
        if (!$terms) throw new InvalidArgumentException('Los Términos y condiciones aún no están disponibles.', 422);
        if (!hash_equals($terms['version'], (string)($input['terms_version'] ?? ''))) throw new InvalidArgumentException('Los Términos y condiciones cambiaron. Consúltelos nuevamente antes de crear la cuenta.', 409);
        return $terms;
    }

    public static function record(PDO $pdo, int $userId, array $terms, string $date): void
    {
        $pdo->prepare('INSERT INTO user_legal_acceptances(user_id,terms_page_id,terms_version,terms_snapshot,accepted_at) VALUES(?,?,?,?,?)')
            ->execute([$userId, $terms['id'], $terms['version'], $terms['snapshot'], $date]);
    }
}
