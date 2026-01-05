<?php
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Database.php';

class SettingsController {
  public function get(){
    $pdo = Database::pdo();
    // Escape 'key' for MySQL compatibility
    $rows = $pdo->query('SELECT `key`, value FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);
    // Cast numeric values where applicable
    $out = [];
    foreach ($rows as $k=>$v) {
      if (is_numeric($v)) {
        if (str_contains($v,'.')) $out[$k] = (float)$v; else $out[$k] = (int)$v;
      } else {
        $out[$k] = $v;
      }
    }
    Response::json(['settings'=>$out]);
  }

  public function save(){
    $pdo = Database::pdo();
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $now = gmdate('c');
    // Use REPLACE INTO for compatibility (MySQL uses ON DUPLICATE KEY UPDATE, SQLite uses ON CONFLICT)
    // Also escape 'key'
    $stmt = $pdo->prepare('REPLACE INTO settings(`key`,value,updated_at) VALUES(?,?,?)');
    foreach ($in as $k=>$v) {
      $stmt->execute([$k, (string)$v, $now]);
    }
    Response::json(['ok'=>true]);
  }
}
