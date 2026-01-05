<?php
require_once __DIR__.'/../src/Database.php';
header('Content-Type: application/json');
try {
  $pdo = Database::pdo();
  $rows = $pdo->query('SELECT id, user_id, status, pub_type, name, document, date, publish_date, order_no FROM legal_requests ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['count'=>count($rows),'items'=>$rows], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>$e->getMessage()]);
}
