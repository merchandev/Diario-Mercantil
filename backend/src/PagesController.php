<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class PagesController {
  private function json(){
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }

  private function slugify($text){
    $text = preg_replace('~[\p{Pd}\s_]+~u','-', trim((string)$text));
    $text = strtolower(trim($text,'-'));
    $text = preg_replace('~[^a-z0-9-]~','', $text);
    if ($text==='') $text = bin2hex(random_bytes(4));
    return $text;
  }

  private function normalizeBlocks($blocks){
    if (!is_array($blocks)) return [];
    $out = [];
    foreach ($blocks as $b) {
      if (!is_array($b)) continue;
      $type = $b['type'] ?? '';
      $props = $b['props'] ?? [];
      if (!in_array($type, ['heading','paragraph','image'], true)) continue;
      // Minimal props validation
      if ($type==='heading') {
        $lvl = (int)($props['level'] ?? 2); if ($lvl<1||$lvl>6) $lvl=2; $props['level'] = $lvl;
        $props['text'] = (string)($props['text'] ?? '');
        $props['align'] = in_array(($props['align'] ?? 'left'), ['left','center','right'], true) ? $props['align'] : 'left';
      } elseif ($type==='paragraph') {
        $props['text'] = (string)($props['text'] ?? '');
        $props['align'] = in_array(($props['align'] ?? 'left'), ['left','center','right'], true) ? $props['align'] : 'left';
      } elseif ($type==='image') {
        $props['url'] = (string)($props['url'] ?? '');
        $props['alt'] = (string)($props['alt'] ?? '');
      }
      $out[] = [
        'id' => (string)($b['id'] ?? bin2hex(random_bytes(6))),
        'type' => $type,
        'props' => $props
      ];
    }
    return $out;
  }

  public function list(){
    $pdo = Database::pdo();
    // Hide reserved pages from admin list
    $stmt = $pdo->query("SELECT id, slug, title, status, created_at, updated_at FROM pages WHERE slug!='contacto' ORDER BY id DESC");
    Response::json(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  public function create(){
    $pdo = Database::pdo();
    $in = $this->json();
    $slug = $this->slugify($in['slug'] ?? $in['title'] ?? '');
    // Reserve special slugs managed outside the CMS
    if ($slug==='contacto') return Response::json(['error'=>'slug_reserved','message'=>'El slug "contacto" está reservado'], 400);
    $title = trim((string)($in['title'] ?? 'Nueva página'));
    $header = (string)($in['header_html'] ?? '');
    $footer = (string)($in['footer_html'] ?? '');
    $blocks = $this->normalizeBlocks($in['body_blocks'] ?? []);
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO pages(slug,title,header_html,body_json,footer_html,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
    $stmt->execute([$slug,$title,$header,json_encode($blocks),$footer,($in['status'] ?? 'published'),$now,$now]);
    $id = (int)$pdo->lastInsertId();
    Response::json(['id'=>$id,'slug'=>$slug]);
  }

  public function get($id){
    $pdo = Database::pdo();
    $s = $pdo->prepare('SELECT * FROM pages WHERE id=?');
    $s->execute([(int)$id]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if (!$row) return Response::json(['error'=>'not_found'],404);
    $row['body_blocks'] = json_decode($row['body_json'] ?? '[]', true) ?: [];
    unset($row['body_json']);
    Response::json($row);
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = $this->json();
    $s = $pdo->prepare('SELECT * FROM pages WHERE id=?');
    $s->execute([(int)$id]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if (!$row) return Response::json(['error'=>'not_found'],404);
    $slug = isset($in['slug']) ? $this->slugify($in['slug']) : $row['slug'];
    if ($slug==='contacto') return Response::json(['error'=>'slug_reserved','message'=>'El slug "contacto" está reservado'], 400);
    $title = isset($in['title']) ? (string)$in['title'] : $row['title'];
    $header = array_key_exists('header_html',$in) ? (string)$in['header_html'] : ($row['header_html'] ?? '');
    $footer = array_key_exists('footer_html',$in) ? (string)$in['footer_html'] : ($row['footer_html'] ?? '');
    $status = isset($in['status']) ? (string)$in['status'] : ($row['status'] ?? 'published');
    $blocks = array_key_exists('body_blocks',$in) ? $this->normalizeBlocks($in['body_blocks']) : json_decode($row['body_json'] ?? '[]', true);
    $now = gmdate('c');
    $u = $pdo->prepare('UPDATE pages SET slug=?, title=?, header_html=?, body_json=?, footer_html=?, status=?, updated_at=? WHERE id=?');
    $u->execute([$slug,$title,$header,json_encode($blocks),$footer,$status,$now,(int)$id]);
    Response::json(['ok'=>true]);
  }

  public function delete($id){
    $pdo = Database::pdo();
    $d = $pdo->prepare('DELETE FROM pages WHERE id=?');
    $d->execute([(int)$id]);
    Response::json(['ok'=>true]);
  }

  // Public endpoint by slug
  public function publicGet($slug){
    $pdo = Database::pdo();
    $s = $pdo->prepare("SELECT slug, title, header_html, body_json, footer_html, status, updated_at FROM pages WHERE slug=?");
    $s->execute([$slug]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if (!$row || ($row['status'] ?? 'published')!=='published') return Response::json(['error'=>'not_found'],404);
    $row['body_blocks'] = json_decode($row['body_json'] ?? '[]', true) ?: [];
    unset($row['body_json']);
    Response::json(['page'=>$row]);
  }

  // Public list endpoint for navigation
  public function publicList(){
    $pdo = Database::pdo();
    $stmt = $pdo->query("SELECT slug, title FROM pages WHERE status='published' AND slug!='contacto' ORDER BY id ASC");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    Response::json(['items'=>$items]);
  }
}
