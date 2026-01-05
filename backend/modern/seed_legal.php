<?php
declare(strict_types=1);
$path = getenv('DB_PATH') ?: dirname(__DIR__).'/storage/database.sqlite';
$pdo = new PDO('sqlite:'.$path);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
// Ensure admin user exists
$adminId = (int)$pdo->query("SELECT id FROM users WHERE document='admin'")->fetchColumn();
if ($adminId === 0) { echo "Admin missing\n"; exit(1); }
// Insert sample legal request if none
$cnt = (int)$pdo->query('SELECT COUNT(*) FROM legal_requests')->fetchColumn();
if ($cnt === 0) {
  $stmt = $pdo->prepare('INSERT INTO legal_requests (status,name,document,date,folios,user_id,pub_type,meta,created_at) VALUES (?,?,?,?,?,?,?,?,datetime("now"))');
  $meta = json_encode(['pricing'=>['price_per_folio_usd'=>1.5,'folios'=>2,'bcv_rate'=>203.74,'iva_percent'=>16,'unit_bs'=>305.61,'subtotal_bs'=>611.22,'iva_bs'=>97.79,'total_bs'=>709.01]]);
  $stmt->execute(['Por verificar','Documento Inicial','DOC123','2025-11-17',2,$adminId,'Documento',$meta]);
  echo "Seeded legal request id=".$pdo->lastInsertId()."\n";
} else {
  echo "Legal requests already present ($cnt)\n";
}
