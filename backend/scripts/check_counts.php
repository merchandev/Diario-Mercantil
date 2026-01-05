<?php
require_once __DIR__.'/../src/Database.php';
$pdo = Database::pdo();
echo "Total legal_requests: ".$pdo->query('SELECT COUNT(*) FROM legal_requests')->fetchColumn()."\n";
echo "Admin (user_id=1): ".$pdo->query('SELECT COUNT(*) FROM legal_requests WHERE user_id=1')->fetchColumn()."\n";
echo "Solicitante (user_id=2): ".$pdo->query('SELECT COUNT(*) FROM legal_requests WHERE user_id=2')->fetchColumn()."\n";
echo "\nStatus distribution for Solicitante:\n";
foreach($pdo->query('SELECT status, COUNT(*) as cnt FROM legal_requests WHERE user_id=2 GROUP BY status') as $r) {
  echo "  {$r['status']}: {$r['cnt']}\n";
}
?>
