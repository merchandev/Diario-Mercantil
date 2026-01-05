<?php
// Seed legal_requests with sample data if table is empty (idempotent)
require_once __DIR__.'/../src/Database.php';
require_once __DIR__.'/../src/AuthController.php';

try {
  $pdo = Database::pdo();
  $count = (int)$pdo->query('SELECT COUNT(*) FROM legal_requests')->fetchColumn();
  if ($count > 0) {
    echo "legal_requests already has $count rows, skipping seeding\n";
    exit(0);
  }
  // Get first user as owner (admin or solicitante)
  $userId = (int)$pdo->query('SELECT id FROM users ORDER BY id ASC LIMIT 1')->fetchColumn();
  if (!$userId) {
    echo "No users found, skipping legal_requests seed (run seed_users first)\n";
    exit(0);
  }
  $now = gmdate('c');
  $today = gmdate('Y-m-d');
  $samples = [
    ['Por verificar','Empresa Alfa C.A.','J123456789', $today, null, null, null, null, null, 3, null, $userId, 'Documento', null, $now],
    ['Borrador','Comercial Beta S.R.L.','J987654321', $today, null, null, null, null, null, 2, 'Pendiente de documentos', $userId, 'Documento', null, $now],
    ['En trámite','Servicios Gamma C.A.','J112233445', $today, 'ORD-2025-001', null, null, null, null, 5, null, $userId, 'Documento', null, $now],
    ['Publicada','Inversiones Delta C.A.','J556677889', $today, 'ORD-2025-002', $today, null, null, null, 1, null, $userId, 'Convocatoria', '{"tipo_convocatoria":"Asamblea Extraordinaria"}', $now],
    ['Rechazado','Operadora Epsilon C.A.','J998877665', $today, null, null, null, null, null, 4, 'Falta pago', $userId, 'Documento', null, $now]
  ];
  $stmt = $pdo->prepare('INSERT INTO legal_requests(status,name,document,date,order_no,publish_date,phone,email,address,folios,comment,user_id,pub_type,meta,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  foreach ($samples as $s) { $stmt->execute($s); }
  echo "Seeded ".count($samples)." legal_requests rows (user_id=$userId)\n";
} catch (Throwable $e) {
  fwrite(STDERR, 'Seeding error: '.$e->getMessage()."\n");
  exit(1);
}
?>