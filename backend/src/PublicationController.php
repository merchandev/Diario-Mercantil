<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class PublicationController {
  private function json(){
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }

  private function slugify($text){
    $text = preg_replace('~[\p{Pd}\s_]+~u','-', trim($text));
    $text = strtolower(trim($text,'-'));
    $text = preg_replace('~[^a-z0-9-]~','', $text);
    if ($text === '') $text = 'pub';
    return $text;
  }

  private function uniqueSlug(PDO $pdo, $base){
    $slug = $base;
    $i = 0;
    while (true) {
      $check = $pdo->prepare('SELECT 1 FROM publications WHERE slug=?');
      $check->execute([$slug]);
      if ($check->fetchColumn() === false) return $slug;
      $i++;
      $slug = $base.'-'.substr(bin2hex(random_bytes(2)),0,4);
    }
  }

  public function list(){
    $pdo = Database::pdo();
    $q = $_GET['q'] ?? '';
    if ($q) {
      $stmt = $pdo->prepare("SELECT id,slug,title,status,created_at,updated_at FROM publications WHERE title LIKE ? ORDER BY created_at DESC");
      $stmt->execute(['%'.$q.'%']);
    } else {
      $stmt = $pdo->query("SELECT id,slug,title,status,created_at,updated_at FROM publications ORDER BY created_at DESC");
    }
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    Response::json(['items'=>$items]);
  }

  public function create(){
    $pdo = Database::pdo();
    $in = $this->json();
    $title = trim($in['title'] ?? '');
    $content = (string)($in['content'] ?? '');
    $status = $in['status'] ?? 'published';
    if ($title === '') Response::json(['error'=>'title_required'],400);

    $base = $this->slugify($title);
    $slug = $this->uniqueSlug($pdo, $base);
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO publications(slug,title,content,status,created_at,updated_at) VALUES(?,?,?,?,?,?)');
    $stmt->execute([$slug,$title,$content,$status,$now,$now]);
    $id = (int)$pdo->lastInsertId();
    Response::json(['id'=>$id,'slug'=>$slug]);
  }

  public function get($id){
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT * FROM publications WHERE id=?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) Response::json(['error'=>'not_found'],404);
    Response::json(['publication'=>$row]);
  }

  public function update($id){
    $pdo = Database::pdo();
    $in = $this->json();
    $title = trim($in['title'] ?? '');
    $content = (string)($in['content'] ?? '');
    $status = $in['status'] ?? 'published';
    if ($title === '') Response::json(['error'=>'title_required'],400);
    $now = gmdate('c');
    $stmt = $pdo->prepare('UPDATE publications SET title=?, content=?, status=?, updated_at=? WHERE id=?');
    $stmt->execute([$title,$content,$status,$now,$id]);
    Response::json(['ok'=>true]);
  }

  public function delete($id){
    $pdo = Database::pdo();
    $pdo->prepare('DELETE FROM publications WHERE id=?')->execute([$id]);
    Response::json(['ok'=>true]);
  }

  // Public endpoint by slug (no auth)
  public function publicGet($slug){
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT slug,title,content,status,created_at,updated_at FROM publications WHERE slug=?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['status'] !== 'published') Response::json(['error'=>'not_found'],404);
    Response::json(['publication'=>$row]);
  }
}
